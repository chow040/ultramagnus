import { BaseMessage } from '@langchain/core/messages';
import { getAnalystLLM } from '../client.js';
import { AgentState, Report } from '../../types.js';
import { QuarterFinancial } from '../../../langchain/tools/financialDataTool.js';
import { logger } from '../../../utils/logger.js';
import { jsonrepair } from 'jsonrepair';
import fs from 'fs';
import path from 'path';

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

const buildEquityReviewPrompt = (
  ticker: string,
  draftReport?: Partial<Report>,
  financialData?: QuarterFinancial[]
) => `
You are senior equity analyst specializing in fundamental stock evaluation, reviewing a draft equity report for ${ticker}.
You must reconcile the draft with hard financial data (from recent fiancial statements) and fix any inaccuracies, and use the appropriate financial model to derive key valuation metrics and price targets.
Use the following context to update and finalize the equity report.
- Draft report (may be incomplete or have inaccuracies)
- Recent financial statements (JSON array of quarterly financial data
1. Use exactly one valuation method. Set method to any clear identifier (e.g., pe_multiple, ev_ebitda, ev_sales, dividend_discount, dcf, residual_income, etc.).
2. List assumptions in inputs as an array of { name, value, unit, note }. Unknown values -> null.
3. Keep keys as defined; if a field is unknown, set null.
4. Build a financial model based on the provided financials and report data with additional information in the report to support your valuation. Mandate that all valuation inputs come from the provided financialData/current price.
5. Do not use analyst price targets directly from the report; only use them to cross-check your own work. If they differ significantly, explain why in valuation.notes.
6. The returned JSON MUST include the 'fundamentalAnalysis' object per the schema below. If any field is unknown, set it to null or [].
7. Return ONLY one JSON object. No markdown, no prose.

Draft report (JSON):
${JSON.stringify(draftReport || {}, null, 2)}

Recent financial statements (JSON):
${JSON.stringify(financialData || [], null, 2)}

Return a single JSON object that matches this full report schema (including fundamentalAnalysis). If any value is unknown, set it to null or [].
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
  "financials": [
     { "year": "String", "revenue": Number, "grossProfit": Number, "operatingIncome": Number, "netIncome": Number, "eps": Number, "cashAndEquivalents": Number, "totalDebt": Number, "shareholderEquity": Number, "operatingCashFlow": Number, "capitalExpenditure": Number, "freeCashFlow": Number }
  ],
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
  "sources": [ { "title": "String", "uri": "String" } ],
  "fundamentalAnalysis": {
    "schemaVersion": "1.0",
    "method": "pe_multiple",
    "thesis": { "bullets": ["...", "...", "..."] },
    "valuation": {
      "currency": "USD",
      "currentPrice": 275.37,
      "intrinsicValue": 396.94,
      "upsidePct": 44.2,
      "inputs": [
        { "name": "forward_pe", "value": 30, "unit": "x", "note": "peer median" },
        { "name": "next_year_eps", "value": 8.58, "unit": "USD", "note": "" }
      ],
      "notes": "Optional short rationale for the chosen method"
    },
    "recommendation": { "rating": "BUY", "rationale": "One sentence" },
    "risks": ["risk1", "risk2"]
  }
}
`;

export async function equityAnalystNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAnalystLLM();
  const prompt = buildEquityReviewPrompt(state.ticker, state.report, state.financialData);
  logger.info({ message: 'langgraph.equityAnalyst.start', ticker: state.ticker });
  const response = await llm.invoke(prompt, {
    tools: [{ googleSearch: {} }]
  } as any);
  const text = toText(response);
  writeRaw(state.ticker, 'equityAnalyst', text);
  const report = parseReport(text);

  if (!report) {
    logger.warn({ message: 'langgraph.equityAnalyst.parse_failed', ticker: state.ticker, sample: text?.slice(0, 2000) });
  } else {
    logger.info({ message: 'langgraph.equityAnalyst.parsed', ticker: state.ticker });
  }

  const nextReport: any = {
    ...(state.report || {}),
    ...(report || {})
  };

  if (!nextReport.ticker) {
    nextReport.ticker = state.ticker;
  }

  if (!nextReport.fundamentalAnalysis) {
    nextReport.fundamentalAnalysis = {
      schemaVersion: '1.0',
      method: null,
      thesis: { bullets: [] },
      valuation: {
        currency: 'USD',
        currentPrice: null,
        intrinsicValue: null,
        upsidePct: null,
        inputs: [],
        notes: ''
      },
      recommendation: { rating: null, rationale: '' },
      risks: []
    };
  }

  return {
    report: nextReport,
    messages: [...state.messages, response]
  };
}
