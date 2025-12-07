import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { fetchEquitySnapshot } from '../services/finnhubService.js';

export const marketDataRouter = Router();

marketDataRouter.get('/marketdata/:symbol', requireAuth, async (req, res) => {
  const { symbol } = req.params;
  const freq = req.query.freq === 'quarterly' ? 'quarterly' : 'annual';

  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  try {
    const snapshot = await fetchEquitySnapshot(symbol.toUpperCase(), freq);
    return res.json(snapshot);
  } catch (err: any) {
    const status = err?.message?.includes('FINNHUB_API_KEY') ? 503 : 502;
    return res.status(status).json({ error: err?.message || 'Failed to fetch market data' });
  }
});
