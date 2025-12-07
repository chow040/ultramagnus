import {
  getBasicFinancials,
  getFinancialsReported,
  getPeers,
  getProfile,
  getQuote
} from '../clients/finnhub.js';
import { logger } from '../utils/logger.js';

export interface EquitySnapshot {
  quote: Awaited<ReturnType<typeof getQuote>>;
  profile: Awaited<ReturnType<typeof getProfile>>;
  metrics: Awaited<ReturnType<typeof getBasicFinancials>>;
  peers: Awaited<ReturnType<typeof getPeers>>;
  financials: Awaited<ReturnType<typeof getFinancialsReported>>;
}

export const fetchEquitySnapshot = async (symbol: string, freq: 'annual' | 'quarterly' = 'annual'): Promise<EquitySnapshot> => {
  try {
    const [quote, profile, metrics, peers, financials] = await Promise.all([
      getQuote(symbol),
      getProfile(symbol),
      getBasicFinancials(symbol),
      getPeers(symbol),
      getFinancialsReported(symbol, freq)
    ]);

    return { quote, profile, metrics, peers, financials };
  } catch (err: any) {
    logger.error({ message: 'finnhub.snapshot.failed', symbol, err });
    throw err;
  }
};
