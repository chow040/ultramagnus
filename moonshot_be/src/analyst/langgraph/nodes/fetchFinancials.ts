import { fetchRecentQuarterFinancials } from '../../../langchain/tools/financialDataTool.js';
import { AgentState } from '../../types.js';
import { logger } from '../../../utils/logger.js';
import { getEarningsSurprises } from '../../../clients/finnhub.js';

export async function fetchFinancialsNode(state: AgentState): Promise<Partial<AgentState>> {
  if (state.financialData?.length) {
    return {};
  }

  const [financialData, earningsSurprises] = await Promise.all([
    fetchRecentQuarterFinancials(state.ticker, 4),
    getEarningsSurprises(state.ticker).catch((err) => {
      logger.warn({ message: 'langgraph.fetchFinancials.earnings_surprise_failed', ticker: state.ticker, err });
      return [];
    })
  ]);

  if (!financialData?.length) {
    logger.warn({ message: 'langgraph.fetchFinancials.empty', ticker: state.ticker });
  } else {
    logger.info({ message: 'langgraph.fetchFinancials.ok', ticker: state.ticker, count: financialData.length });
  }

  const recentSurprises = Array.isArray(earningsSurprises)
    ? earningsSurprises.slice(0, 4)
    : [];
  if (!recentSurprises.length) {
    logger.warn({ message: 'langgraph.fetchFinancials.earnings_surprise_empty', ticker: state.ticker });
  }

  return { financialData, earningsSurprises: recentSurprises };
}
