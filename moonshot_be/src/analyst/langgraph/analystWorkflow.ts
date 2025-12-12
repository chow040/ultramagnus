import { equityAnalystNode } from './nodes/equityAnalyst.js';
import { fetchFinancialsNode } from './nodes/fetchFinancials.js';
import { marketAnalystNode } from './nodes/marketAnalyst.js';
import { AgentState } from '../types.js';
import { logger } from '../../utils/logger.js';

const initialState = (ticker: string): AgentState => ({
  ticker,
  report: undefined,
  financialData: undefined,
  messages: []
});

export const runAnalystGraph = async (ticker: string) => {
  let state: AgentState = initialState(ticker);
  state = { ...state, ...(await marketAnalystNode(state)) };
  state = { ...state, ...(await fetchFinancialsNode(state)) };
  state = { ...state, ...(await equityAnalystNode(state)) };
  return { ...state, messages: [] };
};

export async function* streamAnalystGraph(ticker: string) {
  let state: AgentState = initialState(ticker);
  logger.info({ message: 'langgraph.stream.start', ticker });
  state = { ...state, ...(await safeStep('market_analyst', ticker, () => marketAnalystNode(state))) };
  logger.info({ message: 'langgraph.stream.after_market', ticker });
  yield { ...state, messages: [] };

  state = { ...state, ...(await safeStep('fetch_financials', ticker, () => fetchFinancialsNode(state))) };
  logger.info({ message: 'langgraph.stream.after_financials', ticker });
  yield { ...state, messages: [] };

  state = { ...state, ...(await safeStep('equity_analyst', ticker, () => equityAnalystNode(state))) };
  logger.info({ message: 'langgraph.stream.after_equity', ticker });
  yield { ...state, messages: [] };
}

async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  ticker: string,
  ms = 300000
): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`langgraph node timeout: ${label}`));
      }, ms);
    })
  ]).finally(() => clearTimeout(timer));
}

async function safeStep(
  label: string,
  ticker: string,
  fn: () => Promise<Partial<AgentState>>
): Promise<Partial<AgentState>> {
  try {
    return await withTimeout(fn(), label, ticker);
  } catch (err: any) {
    logger.error({ message: 'langgraph.node.failed', ticker, label, err });
    return {};
  }
}
