import { fetchFinancialRatios } from '../../../langchain/tools/financialRatioDataTool.js';
import { AgentState } from '../../types.js';
import { logger } from '../../../utils/logger.js';

export async function fetchFinancialRatiosNode(state: AgentState): Promise<Partial<AgentState>> {
  if (state.financialRatios) {
    return {};
  }

  const ratios = await fetchFinancialRatios(state.ticker);
  if (!ratios) {
    logger.warn({ message: 'langgraph.fetchFinancialRatios.empty', ticker: state.ticker });
  } else {
    logger.info({
      message: 'langgraph.fetchFinancialRatios.ok',
      ticker: state.ticker
    });
  }

  return { financialRatios: ratios };
}
