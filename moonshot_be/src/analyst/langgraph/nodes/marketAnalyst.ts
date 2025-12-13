import { BaseMessage } from '@langchain/core/messages';
import { getAnalystLLM } from '../client.js';
import { AgentState, Report } from '../../types.js';
import { logger } from '../../../utils/logger.js';
import { jsonrepair } from 'jsonrepair';
import fs from 'fs';
import path from 'path';

const buildMarketReportPrompt = (ticker: string) => `
You are a senior equity analyst on a buy side firm.
Generate a comprehensive equity research report for ${ticker}.

You MUST search for the latest real-time data including:
1. Current Price, Day's Range, 52-Week Range, Market Cap, PE Ratio.
2. Recent News (last 30 days) and Upcoming Events (Catalysts).
3. Financial Statements (last 4 years if possible).
4. Insider Activity and Institutional Sentiment.
5. Analyst ratings and price targets (current and historical trend).
6. Price History (Monthly closes for last 12 months).

Return ONLY valid JSON following this exact schema (no markdown, no prose):
{
  "companyName": "String",
  "ticker": "String",
  "reportDate": "String (Today's date)",
  "currentPrice": "String (e.g. $150.20)",
  "priceChange": "String (e.g. +2.5%)",
  "marketCap": "String",
  "peRatio": "String",
  "dayHigh": "String",
  "dayLow": "String",
  "week52High": "String",
  "week52Low": "String",
  "priceTarget": "String",
  "priceTargetRange": "String",
  "priceTargetModel": { "estimatedEPS": "String", "targetPE": "String", "growthRate": "String", "logic": "String" },
  "scenarioAnalysis": {
    "bear": { "label": "Bear", "price": "String", "logic": "String", "probability": "String" },
    "base": { "label": "Base", "price": "String", "logic": "String", "probability": "String" },
    "bull": { "label": "Bull", "price": "String", "logic": "String", "probability": "String" }
  },
  "summary": "String (Executive summary)",
  "rocketScore": Number (0-100),
  "rocketReason": "String",
  "financialHealthScore": Number (0-100),
  "financialHealthReason": "String",
  "momentumScore": Number (0-100, based on technical trend, volume, RSI),
  "momentumReason": "String",
  "moatAnalysis": { "moatRating": "Wide/Narrow/None", "moatSource": "String", "rationale": "String" },
  "managementQuality": { "executiveTenure": "String", "insiderOwnership": "String", "trackRecord": "String", "governanceRedFlags": "String", "verdict": "String" },
  "history": { "previousDate": "String", "previousVerdict": "BUY/HOLD/SELL", "changeRationale": ["String"] },
  "shortTermFactors": { "positive": [{"title": "String", "detail": "String"}], "negative": [{"title": "String", "detail": "String"}] },
  "longTermFactors": { "positive": [{"title": "String", "detail": "String"}], "negative": [{"title": "String", "detail": "String"}] },
  "priceHistory": [ { "month": "String", "price": Number } ],
  "analystPriceTargets": [ { "month": "String", "averageTarget": Number } ],
  "peers": [ { "ticker": "String", "name": "String", "marketCap": "String", "peRatio": "String", "revenueGrowth": "String", "netMargin": "String" } ],
  "upcomingEvents": [ { "date": "String", "event": "String", "impact": "High/Medium/Low" } ],
  "recentNews": [ { "headline": "String", "date": "String" } ],
  "earningsCallAnalysis": { "sentiment": "Bullish/Neutral/Bearish", "summary": "String", "keyTakeaways": ["String"] },
  "overallSentiment": { "score": Number, "label": "String", "summary": "String" },
  "insiderActivity": [ { "insiderName": "String", "role": "String", "transactionDate": "String", "transactionType": "Buy/Sell", "shares": "String", "value": "String" } ],
  "riskMetrics": { "beta": "String", "shortInterestPercentage": "String", "shortInterestRatio": "String", "volatility": "High/Medium/Low" },
  "institutionalSentiment": "String",
  "tags": ["String"],
  "valuation": "String",
  "verdict": "BUY/HOLD/SELL",
  "verdictReason": "String",
  "sources": [ { "title": "String", "uri": "String" } ]
}
`;
const toText = (message: BaseMessage) => {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (part?.text) return part.text;
        return '';
      })
      .join('');
  }
  return '';
};

const ensureDebugDir = () => {
  const dir = path.resolve('logs', 'langgraph');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const writeRaw = (ticker: string, node: string, content: string) => {
  const dir = ensureDebugDir();
  const filePath = path.join(dir, `${ticker}-${node}-${Date.now()}.txt`);
  fs.writeFileSync(filePath, content ?? '', 'utf8');
  logger.info({ message: 'langgraph.node.raw_saved', ticker, node, filePath });
};

const stripFences = (raw: string) => raw.replace(/```(?:json)?/gi, '').trim();

const parseReport = (text: string): Partial<Report> | undefined => {
  if (!text) return undefined;
  const cleaned = stripFences(text);
  const candidates = [cleaned];

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    candidates.push(cleaned.slice(start, end + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (_err) {
      try {
        return JSON.parse(jsonrepair(candidate));
      } catch (_err2) {
        continue;
      }
    }
  }
  return undefined;
};

export async function marketAnalystNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAnalystLLM();
  const prompt = buildMarketReportPrompt(state.ticker);
  logger.info({ message: 'langgraph.marketAnalyst.start', ticker: state.ticker });
  const response = await llm.invoke(prompt, {
    tools: [{ googleSearch: {} }]
  } as any);
  const text = toText(response);
  writeRaw(state.ticker, 'marketAnalyst', text);
  const report = parseReport(text);

  if (!report) {
    logger.warn({
      message: 'langgraph.marketAnalyst.parse_failed',
      ticker: state.ticker,
      sample: text?.slice(0, 2000)
    });
  } else {
    logger.info({ message: 'langgraph.marketAnalyst.parsed', ticker: state.ticker });
  }

  return {
    report: report || state.report,
    messages: [...state.messages, response]
  };
}
