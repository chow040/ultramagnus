import { Router } from 'express';
import { runAssessmentChain } from '../langchain/aiAssessment.js';
import { logger } from '../utils/logger.js';
import { describeGenAiError } from './aiShared.js';
import { createReport } from '../services/reportService.js';
import { requireAuth } from '../middleware/auth.js';

export const aiAssessmentRouter = Router();

// Auth required so we can fetch prior snapshots and persist new ones per user
aiAssessmentRouter.post('/ai/assessment-v2', requireAuth, async (req, res) => {
  const { ticker } = req.body || {};
  const log = req.log || logger;
  const ownerId = typeof req.userId === 'string' ? req.userId : undefined;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    const startedAt = Date.now();
    const result = await runAssessmentChain({ ownerId, ticker });
    const durationMs = Date.now() - startedAt;
    const title = typeof result.report?.companyName === 'string' && result.report.companyName
      ? result.report.companyName
      : ticker;

    let reportId: string | null = null;
    if (ownerId) {
      try {
        reportId = await createReport(ownerId, {
          title,
          ticker,
          status: 'complete',
          type: 'equity',
          payload: result.report
        });
      } catch (err: any) {
        log.warn({
          message: 'ai.assessment_v2.save_failed',
          ticker,
          ownerId,
          err: err?.message
        });
      }
    }

    log.info({
      message: 'ai.assessment_v2.completed',
      ticker,
      ownerId,
      durationMs,
      material: result.materiality?.isMaterial
    });

    return res.json({
      ticker,
      ownerId,
      reportId,
      report: result.report,
      previous: result.previous
        ? {
            reportId: result.previous.reportId,
            ticker: result.previous.ticker,
            createdAt: result.previous.createdAt
          }
        : null,
      materiality: result.materiality
    });
  } catch (err: any) {
    const providerDetails = describeGenAiError(err);
    log.error({
      message: 'ai.assessment_v2.failed',
      ticker,
      ownerId,
      err: providerDetails
    });
    return res.status(502).json({ error: 'Failed to generate assessment', providerDetails });
  }
});
