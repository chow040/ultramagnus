import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { runAnalystGraph } from '../analyst/langgraph/analystWorkflow.js';

export const aiAnalysisLanggraphRouter = Router();

aiAnalysisLanggraphRouter.post('/ai/stream-report/langgraph', async (req, res) => {
  const { ticker } = req.body || {};
  const log = req.log || logger;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    log.info({ message: 'ai.report.langgraph.start', ticker });
    const result = await runAnalystGraph(ticker);
    const { messages, ...rest } = result as any;
    res.json({ report: rest.report ?? rest, ticker });
    log.info({ message: 'ai.report.langgraph.complete', ticker });
  } catch (err: any) {
    log.error({ message: 'ai.report.langgraph_failed', err, ticker });
    return res.status(502).json({ error: 'Failed to generate LangGraph analyst report' });
  }
});
