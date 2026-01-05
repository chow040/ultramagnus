import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { logAIFailure } from '../utils/aiLogger.js';
import { describeGenAiError } from './aiShared.js';
import { runGeminiAnalysis } from '../services/aiAnalysisService.js';
import { createReport } from '../services/reportService.js';
import { requireAuth } from '../middleware/auth.js';

export const aiAnalysisRouter = Router();

// Require auth so we have a userId to persist reports
aiAnalysisRouter.post('/ai/stream-report', requireAuth, async (req, res) => {
  const { ticker } = req.body || {};
  const log = req.log || logger;
  const ownerId = typeof (req as any).userId === 'string' ? (req as any).userId : undefined;
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    const startedAt = Date.now();
    const report = await runGeminiAnalysis(ticker);
    const durationMs = Date.now() - startedAt;
    log.info({ message: 'ai.report.completed', ticker, durationMs });

    let reportId: string | null = null;
    if (ownerId) {
      try {
        reportId = await createReport(ownerId, {
          title: report?.companyName || ticker,
          ticker,
          status: 'complete',
          type: 'equity',
          payload: report
        });
      } catch (err: any) {
        log.warn({
          message: 'ai.report.save_failed',
          ticker,
          ownerId,
          err: err?.message
        });
      }
    }

    return res.json({ report, ticker, reportId });
  } catch (err: any) {
    const providerDetails = describeGenAiError(err);
    log.error({ message: 'ai.report.failed', err: providerDetails, ticker });
    logAIFailure({
      operation: 'ai.report',
      model: 'gemini',
      ticker,
      error: err,
      providerStatus: providerDetails.providerStatus,
      providerCode: providerDetails.providerCode,
      providerMessage: providerDetails.providerMessage,
      providerBody: providerDetails.providerBody,
      correlationId: (req as any).correlationId
    });
    return res.status(502).json({ error: 'Failed to generate report', providerDetails });
  }
});
