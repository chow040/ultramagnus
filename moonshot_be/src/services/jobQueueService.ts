import { PgBoss } from 'pg-boss';
import { and, count, desc, eq, gt, inArray } from 'drizzle-orm';
import { config } from '../config/env.js';
import { db } from '../db/client.js';
import { analysisJobs } from '../db/schema.js';
import { logger } from '../utils/logger.js';

export type AnalysisType = 'gemini' | 'langgraph';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'canceled' | 'retrying';

const ACTIVE_STATUSES: JobStatus[] = ['pending', 'processing', 'retrying'];
const MAX_PENDING_JOBS = 5;
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
export const JOB_QUEUE_NAME = 'analysis-jobs';

class JobQueueError extends Error {
  status = 500;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface JobFilters {
  status?: JobStatus;
  limit?: number;
}

export interface JobSummary {
  id: string;
  userId: string;
  ticker: string;
  analysisType: AnalysisType;
  status: JobStatus;
  priority: number;
  reportId?: string | null;
  error?: string | null;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

type AnalysisJobRow = typeof analysisJobs.$inferSelect;

const mapRowToJob = (row: AnalysisJobRow): JobSummary => ({
  id: row.id,
  userId: row.userId,
  ticker: row.ticker,
  analysisType: row.analysisType as AnalysisType,
  status: row.status as JobStatus,
  priority: row.priority,
  reportId: row.reportId,
  error: row.error,
  createdAt: row.createdAt?.toISOString(),
  startedAt: row.startedAt?.toISOString() ?? null,
  completedAt: row.completedAt?.toISOString() ?? null,
  metadata: row.metadata as Record<string, unknown> | null
});

export class JobQueueService {
  private boss?: PgBoss;
  private started = false;

  async start() {
    if (this.started) return;
    const boss = new PgBoss({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false },
      schema: 'pgboss'
    });

    boss.on('error', (err: unknown) => {
      logger.error({ message: 'jobqueue.boss.error', err });
    });

    await boss.start();
    try {
      await boss.createQueue(JOB_QUEUE_NAME);
    } catch (err) {
      logger.warn({ message: 'jobqueue.create_queue_failed', err });
    }
    this.boss = boss;
    this.started = true;
    logger.info({ message: 'jobqueue.boss.started' });
  }

  async stop() {
    if (!this.started || !this.boss) return;
    await this.boss.stop({ graceful: true });
    this.started = false;
    logger.info({ message: 'jobqueue.boss.stopped' });
  }

  private ensureBoss(): PgBoss {
    if (!this.boss) {
      throw new JobQueueError('Job queue not initialized', 503, 'queue_not_initialized');
    }
    return this.boss;
  }

  async createJob(userId: string, ticker: string, analysisType: AnalysisType) {
    const boss = this.ensureBoss();
    const now = Date.now();
    const fiveMinutesAgo = new Date(now - DEDUPE_WINDOW_MS);

    const [existing] = await db.select()
      .from(analysisJobs)
      .where(and(
        eq(analysisJobs.userId, userId),
        eq(analysisJobs.ticker, ticker),
        eq(analysisJobs.analysisType, analysisType),
        inArray(analysisJobs.status, ACTIVE_STATUSES),
        gt(analysisJobs.createdAt, fiveMinutesAgo)
      ))
      .orderBy(desc(analysisJobs.createdAt))
      .limit(1);

    if (existing) {
      return { job: mapRowToJob(existing), deduped: true };
    }

    const [pendingCountRow] = await db.select({ value: count() })
      .from(analysisJobs)
      .where(and(
        eq(analysisJobs.userId, userId),
        inArray(analysisJobs.status, ['pending', 'processing'])
      ));

    const pendingCount = Number(pendingCountRow?.value || 0);
    if (pendingCount >= MAX_PENDING_JOBS) {
      throw new JobQueueError('Too many pending jobs', 429, 'rate_limit');
    }

    const [jobRow] = await db.insert(analysisJobs).values({
      userId,
      ticker,
      analysisType,
      status: 'pending',
      priority: 0,
      metadata: { analysisType }
    }).returning();

    let bossJobId: string | null = null;
    try {
      bossJobId = await boss.send(JOB_QUEUE_NAME, { jobId: jobRow.id, userId, ticker, analysisType });
    } catch (err) {
      logger.error({ message: 'jobqueue.enqueue_failed', err, jobId: jobRow.id, userId, ticker });
    }

    if (bossJobId) {
      const [updated] = await db.update(analysisJobs)
        .set({ metadata: { ...(jobRow.metadata as Record<string, unknown>), bossJobId } })
        .where(eq(analysisJobs.id, jobRow.id))
        .returning();
      return { job: mapRowToJob(updated || jobRow), deduped: false };
    }

    return { job: mapRowToJob(jobRow), deduped: false };
  }

  async getJob(userId: string, jobId: string) {
    const [row] = await db.select()
      .from(analysisJobs)
      .where(and(eq(analysisJobs.id, jobId), eq(analysisJobs.userId, userId)))
      .limit(1);

    if (!row) return null;
    return mapRowToJob(row);
  }

  async listJobs(userId: string, filters: JobFilters = {}) {
    const limit = Math.max(1, Math.min(filters.limit || 20, 100));
    const conditions = [eq(analysisJobs.userId, userId)];
    if (filters.status) {
      conditions.push(eq(analysisJobs.status, filters.status));
    }

    const rows = await db.select()
      .from(analysisJobs)
      .where(and(...conditions))
      .orderBy(desc(analysisJobs.createdAt))
      .limit(limit);

    return rows.map(mapRowToJob);
  }

  async cancelJob(userId: string, jobId: string) {
    const boss = this.ensureBoss();
    const [row] = await db.select()
      .from(analysisJobs)
      .where(and(eq(analysisJobs.id, jobId), eq(analysisJobs.userId, userId)))
      .limit(1);

    if (!row) {
      throw new JobQueueError('Job not found', 404, 'not_found');
    }

    if (['completed', 'failed', 'canceled'].includes(row.status)) {
      throw new JobQueueError('Job can no longer be canceled', 409, 'not_cancelable');
    }

    const bossJobId = (row.metadata as Record<string, unknown> | null)?.bossJobId;
    if (typeof bossJobId === 'string') {
      try {
        await boss.cancel(JOB_QUEUE_NAME, bossJobId);
      } catch (err) {
        logger.warn({ message: 'jobqueue.cancel_failed', err, jobId, bossJobId });
      }
    }

    const [updated] = await db.update(analysisJobs)
      .set({ status: 'canceled', completedAt: new Date() })
      .where(eq(analysisJobs.id, jobId))
      .returning();

    return mapRowToJob(updated || row);
  }
}

export const jobQueueService = new JobQueueService();
export { JobQueueError };
