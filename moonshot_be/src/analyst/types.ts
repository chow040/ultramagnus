import { BaseMessage } from '@langchain/core/messages';
import { QuarterFinancial } from '../langchain/tools/financialDataTool.js';

export interface ScenarioEstimate {
  label: string;
  price: string;
  logic: string;
  probability: string;
}

export interface ScenarioAnalysis {
  bear: ScenarioEstimate;
  base: ScenarioEstimate;
  bull: ScenarioEstimate;
}

export interface PriceTargetModel {
  estimatedEPS: string;
  targetPE: string;
  growthRate: string;
  logic: string;
}

export interface MoatAnalysis {
  moatRating: 'Wide' | 'Narrow' | 'None' | string;
  moatSource: string;
  rationale: string;
}

export interface ManagementQuality {
  executiveTenure: string;
  insiderOwnership: string;
  trackRecord: string;
  governanceRedFlags: string;
  verdict: string;
}

export interface FactorEntry {
  title: string;
  detail: string;
}

export interface FinancialsRow {
  year: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  cashAndEquivalents: number;
  totalDebt: number;
  shareholderEquity: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
}

export interface PriceHistoryEntry {
  month: string;
  price: number;
}

export interface AnalystPriceTarget {
  month: string;
  averageTarget: number;
}

export interface PeerCompany {
  ticker: string;
  name: string;
  marketCap: string;
  peRatio: string;
  revenueGrowth: string;
  netMargin: string;
}

export interface UpcomingEvent {
  date: string;
  event: string;
  impact: 'High' | 'Medium' | 'Low' | string;
}

export interface NewsItem {
  headline: string;
  date: string;
}

export interface EarningsCallAnalysis {
  sentiment: 'Bullish' | 'Neutral' | 'Bearish' | string;
  summary: string;
  keyTakeaways: string[];
}

export interface OverallSentiment {
  score: number;
  label: string;
  summary: string;
}

export interface InsiderActivity {
  insiderName: string;
  role: string;
  transactionDate: string;
  transactionType: 'Buy' | 'Sell' | string;
  shares: string;
  value: string;
}

export interface RiskMetrics {
  beta: string;
  shortInterestPercentage: string;
  shortInterestRatio: string;
  volatility: 'High' | 'Medium' | 'Low' | string;
}

export interface SourceLink {
  title: string;
  uri: string;
}

export interface Report {
  companyName: string;
  ticker: string;
  reportDate: string;
  currentPrice: string;
  priceChange: string;
  marketCap: string;
  peRatio: string;
  dayHigh: string;
  dayLow: string;
  week52High: string;
  week52Low: string;
  priceTarget: string;
  priceTargetRange: string;
  priceTargetModel: PriceTargetModel;
  scenarioAnalysis: ScenarioAnalysis;
  summary: string;
  rocketScore: number;
  rocketReason: string;
  financialHealthScore: number;
  financialHealthReason: string;
  momentumScore: number;
  momentumReason: string;
  moatAnalysis: MoatAnalysis;
  managementQuality: ManagementQuality;
  history: {
    previousDate: string;
    previousVerdict: 'BUY' | 'HOLD' | 'SELL' | string;
    changeRationale: string[];
  };
  shortTermFactors: { positive: FactorEntry[]; negative: FactorEntry[] };
  longTermFactors: { positive: FactorEntry[]; negative: FactorEntry[] };
  financials: FinancialsRow[];
  priceHistory: PriceHistoryEntry[];
  analystPriceTargets: AnalystPriceTarget[];
  peers: PeerCompany[];
  upcomingEvents: UpcomingEvent[];
  recentNews: NewsItem[];
  earningsCallAnalysis: EarningsCallAnalysis;
  overallSentiment: OverallSentiment;
  insiderActivity: InsiderActivity[];
  riskMetrics: RiskMetrics;
  institutionalSentiment: string;
  tags: string[];
  valuation: string;
  verdict: 'BUY' | 'HOLD' | 'SELL' | string;
  verdictReason: string;
  sources: SourceLink[];
}

export interface AgentState {
  ticker: string;
  report?: Partial<Report>;
  financialData?: QuarterFinancial[];
  messages: BaseMessage[];
}
