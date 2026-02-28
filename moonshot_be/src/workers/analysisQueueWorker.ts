import { PgBoss } from 'pg-boss';
import { and, eq, lt } from 'drizzle-orm';
import { config } from '../config/env.js';
import { runAnalystGraph } from '../analyst/langgraph/analystWorkflow.js';
import { db } from '../db/client.js';
import { analysisJobs } from '../db/schema.js';
import { createReport } from '../services/reportService.js';
import { AnalysisType, JOB_QUEUE_NAME, JobStatus } from '../services/jobQueueService.js';
import { runGeminiAnalysis } from '../services/aiAnalysisService.js';
import { describeGenAiError } from '../routes/aiShared.js';
import { logger } from '../utils/logger.js';

interface QueuePayload {
  jobId: string;
  userId: string;
  ticker: string;
  analysisType?: AnalysisType;
}

const JOB_TIMEOUT_MS = Number(process.env.ANALYSIS_JOB_TIMEOUT_MS || 8 * 60 * 1000);

const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`analysis timeout after ${ms}ms: ${label}`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const runLanggraphAnalysis = async (ticker: string) => {
  const state = await runAnalystGraph(ticker);
  if (!state?.report) {
    throw new Error('LangGraph returned no report');
  }
  return state.report;
};

const markJobStatus = async (jobId: string, status: JobStatus, updates: Partial<typeof analysisJobs.$inferInsert> = {}) => {
  const [row] = await db.update(analysisJobs)
    .set({ status, ...updates })
    .where(eq(analysisJobs.id, jobId))
    .returning();
  return row;
};

const processJob = async (payload: QueuePayload) => {
  const { jobId, userId, ticker } = payload;
  const analysisType: AnalysisType = (payload.analysisType as AnalysisType) || 'gemini';

  const started = await markJobStatus(jobId, 'processing', { startedAt: new Date() });
  if (!started) {
    throw new Error(`Job not found: ${jobId}`);
  }
  logger.info({ message: 'analysis_worker.job.started', jobId, ticker, analysisType });

  try {
    const reportPayload = analysisType === 'langgraph'
      ? await withTimeout(runLanggraphAnalysis(ticker), JOB_TIMEOUT_MS, `langgraph:${ticker}`)
      : await withTimeout(runGeminiAnalysis(ticker), JOB_TIMEOUT_MS, `gemini:${ticker}`);

    const title = (reportPayload as any)?.companyName
      ? `${(reportPayload as any).companyName} (${ticker}) Analysis`
      : `Analysis for ${ticker}`;

    const reportId = await createReport(userId, {
      title,
      ticker,
      status: 'complete',
      type: analysisType === 'langgraph' ? 'analysis-langgraph' : 'analysis',
      payload: reportPayload
    });

    await markJobStatus(jobId, 'completed', { reportId, completedAt: new Date(), error: null });
    logger.info({ message: 'analysis_worker.job.completed', jobId, reportId, ticker, analysisType });
    return { reportId };
  } catch (err: any) {
    const providerDetails = describeGenAiError(err);
    const message = providerDetails?.providerMessage || err?.message || 'Unknown error';
    await markJobStatus(jobId, 'failed', { error: message, completedAt: new Date() });
    logger.error({ message: 'analysis_worker.job.failed', jobId, ticker, analysisType, err: providerDetails || err });
    throw err;
  }
};

const recoverStaleJobs = async () => {
  const staleBefore = new Date(Date.now() - JOB_TIMEOUT_MS);
  const recovered = await db.update(analysisJobs)
    .set({
      status: 'failed',
      error: `Recovered stale processing job after ${JOB_TIMEOUT_MS}ms timeout window`,
      completedAt: new Date()
    })
    .where(and(
      eq(analysisJobs.status, 'processing'),
      lt(analysisJobs.startedAt, staleBefore)
    ))
    .returning({ id: analysisJobs.id, ticker: analysisJobs.ticker });

  if (recovered.length) {
    logger.warn({
      message: 'analysis_worker.recovered_stale_jobs',
      count: recovered.length,
      jobIds: recovered.map((r) => r.id),
      tickers: recovered.map((r) => r.ticker)
    });
  }
};

export const startAnalysisWorker = async () => {
  const boss = new PgBoss({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false },
    schema: 'pgboss'
  });

  boss.on('error', (err) => {
    logger.error({ message: 'analysis_worker.boss.error', err });
  });

  await boss.start();
  await recoverStaleJobs();
  try {
    await boss.createQueue(JOB_QUEUE_NAME);
  } catch (err) {
    logger.warn({ message: 'analysis_worker.create_queue_failed', queue: JOB_QUEUE_NAME, err });
  }

  await boss.work<QueuePayload>(JOB_QUEUE_NAME, { batchSize: 1, pollingIntervalSeconds: 5 }, async (job) => {
    const payload = Array.isArray(job)
      ? (job[0] as any)?.data ?? (job as any)?.data
      : (job as any)?.data ?? (job as any);

    if (!payload?.jobId) {
      logger.error({
        message: 'analysis_worker.job.missing_payload',
        jobId: (job as any)?.id,
        hasData: !!(job as any)?.data
      });
      throw new Error('Missing job payload');
    }

    await processJob(payload as QueuePayload);
  });

  logger.info({ message: 'analysis_worker.started', queue: JOB_QUEUE_NAME });
  return boss;
};
