import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { logAIFailure } from '../utils/aiLogger.js';
import { describeGenAiError } from './aiShared.js';
import { runGeminiAnalysis } from '../services/aiAnalysisService.js';

export const aiAnalysisRouter = Router();

aiAnalysisRouter.post('/ai/stream-report', async (req, res) => {
  const { ticker } = req.body || {};
  const log = req.log || logger;
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    const startedAt = Date.now();
    const report = await runGeminiAnalysis(ticker);
    const durationMs = Date.now() - startedAt;
    log.info({ message: 'ai.report.completed', ticker, durationMs });
    return res.json({ report, ticker });
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
