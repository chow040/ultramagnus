import { Router } from 'express';
import { lookupSymbol } from '../clients/finnhub.js';
import { requireAuth } from '../middleware/auth.js';

export const symbolsRouter = Router();

// Predictive search for tickers using Finnhub symbol lookup
symbolsRouter.get('/symbols/search', requireAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  try {
    const data = await lookupSymbol(q);
    const suggestions = (data.result || [])
      .filter((r) => r?.symbol)
      .slice(0, 10)
      .map((r) => ({
        symbol: r.symbol || r.displaySymbol || '',
        name: r.description || '',
        type: r.type || ''
      }));

    return res.json({ suggestions });
  } catch (err: any) {
    req.log?.warn({ message: 'symbols.search.failed', err, q });
    const status = err?.message?.includes('FINNHUB_API_KEY') ? 400 : 502;
    return res.status(status).json({ error: err?.message || 'Failed to search symbols' });
  }
});
