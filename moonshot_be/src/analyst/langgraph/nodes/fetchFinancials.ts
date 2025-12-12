import { fetchRecentQuarterFinancials } from '../../../langchain/tools/financialDataTool.js';
import { AgentState } from '../../types.js';
import { logger } from '../../../utils/logger.js';

export async function fetchFinancialsNode(state: AgentState): Promise<Partial<AgentState>> {
  if (state.financialData?.length) {
    return {};
  }

  const financialData = await fetchRecentQuarterFinancials(state.ticker, 4);
  if (!financialData?.length) {
    logger.warn({
      message: 'langgraph.fetchFinancials.empty',
      ticker: state.ticker
    });
  } else {
    logger.info({
      message: 'langgraph.fetchFinancials.ok',
      ticker: state.ticker,
      count: financialData.length
    });
  }
  return { financialData };
}
