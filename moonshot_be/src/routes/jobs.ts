import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { JobQueueError, jobQueueService } from '../services/jobQueueService.js';
import { clampJobListLimit, validateTicker, validateAnalysisType } from '../utils/validation.js';
import type { JobStatus } from '../services/jobQueueService.js';

export const jobsRouter = Router();

const parseStatus = (status?: unknown): JobStatus | undefined => {
  if (typeof status !== 'string') return undefined;
  const normalized = status.trim().toLowerCase();
  if (['pending', 'processing', 'completed', 'failed', 'canceled', 'retrying'].includes(normalized)) {
    return normalized as JobStatus;
  }
  return undefined;
};

const handleError = (err: unknown, res: any, log: any) => {
  if (err instanceof JobQueueError) {
    log?.warn({ message: 'jobs.queue_error', code: err.code, err: err.message });
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  log?.error({ message: 'jobs.unexpected_error', err });
  return res.status(500).json({ error: 'Unexpected error creating job' });
};

jobsRouter.post('/jobs/analyze', requireAuth, async (req, res) => {
  const { ticker, analysisType: rawAnalysisType } = req.body || {};
  const validation = validateTicker(ticker);
  if (!validation.ok) {
    return res.status(validation.status || 400).json({ error: validation.message });
  }
  const analysisTypeResult = validateAnalysisType(rawAnalysisType);
  if (!analysisTypeResult.ok) {
    return res.status(analysisTypeResult.status || 400).json({ error: analysisTypeResult.message });
  }

  const userId = (req as any).userId as string;
  const log = req.log;

  try {
    const result = await jobQueueService.createJob(
      userId,
      validation.data!.ticker,
      analysisTypeResult.data!.analysisType
    );
    const statusCode = result.deduped ? 200 : 201;
    return res.status(statusCode).json({
      jobId: result.job.id,
      status: result.job.status,
      ticker: result.job.ticker,
      analysisType: result.job.analysisType,
      estimatedDuration: '30-60 seconds',
      createdAt: result.job.createdAt,
      deduped: result.deduped
    });
  } catch (err) {
    return handleError(err, res, log);
  }
});

jobsRouter.get('/jobs/:jobId', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { jobId } = req.params;
  const log = req.log;

  try {
    const job = await jobQueueService.getJob(userId, jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(job);
  } catch (err) {
    return handleError(err, res, log);
  }
});

jobsRouter.get('/jobs', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const status = parseStatus(req.query.status);
  const limit = clampJobListLimit(Number(req.query.limit));
  const log = req.log;

  try {
    const jobs = await jobQueueService.listJobs(userId, { status, limit });
    return res.json({ jobs, hasMore: jobs.length === limit });
  } catch (err) {
    return handleError(err, res, log);
  }
});

jobsRouter.delete('/jobs/:jobId', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { jobId } = req.params;
  const log = req.log;

  try {
    const job = await jobQueueService.cancelJob(userId, jobId);
    return res.json({ jobId: job.id, status: job.status });
  } catch (err) {
    if (err instanceof JobQueueError && err.code === 'not_cancelable') {
      return res.status(err.status).json({ error: err.message, status: err.code });
    }
    return handleError(err, res, log);
  }
});
