import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { flushStreamingHeaders } from './aiShared.js';
import { streamAnalystGraph } from '../analyst/langgraph/analystWorkflow.js';

export const aiAnalysisLanggraphRouter = Router();

aiAnalysisLanggraphRouter.post('/ai/stream-report/langgraph', async (req, res) => {
  const { ticker } = req.body || {};
  const log = req.log || logger;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  flushStreamingHeaders(res);

  try {
    log.info({ message: 'ai.stream.report.langgraph.start', ticker });
    for await (const event of streamAnalystGraph(ticker)) {
      const { messages, ...rest } = event as any;
      const payload = rest.report ? rest.report : rest;
      const chunk = JSON.stringify(payload);
      res.write(`${chunk}\n`);
    }
    res.end();
    log.info({ message: 'ai.stream.report.langgraph.complete', ticker });
  } catch (err: any) {
    log.error({ message: 'ai.stream.report.langgraph_failed', err, ticker });
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to stream LangGraph analyst report' });
    } else {
      res.end();
    }
  }
});
