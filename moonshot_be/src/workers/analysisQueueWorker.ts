import { PgBoss } from 'pg-boss';
import { eq } from 'drizzle-orm';
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

  try {
    const reportPayload = analysisType === 'langgraph'
      ? await runLanggraphAnalysis(ticker)
      : await runGeminiAnalysis(ticker);

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
  await boss.createQueue(JOB_QUEUE_NAME);

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
