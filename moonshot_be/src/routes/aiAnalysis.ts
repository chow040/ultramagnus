import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { logAIFailure } from '../utils/aiLogger.js';
import { MODEL_NAME, ensureClient, describeGenAiError, flushStreamingHeaders, streamText } from './aiShared.js';

const REPORT_PROMPT = (ticker: string) => `
  Generate a comprehensive professional equity research report for ${ticker}.
  
  You MUST search for the latest real-time data including:
  1. Current Price, Day's Range, 52-Week Range, Market Cap, PE Ratio.
  2. Recent News (last 30 days) and Upcoming Events (Catalysts).
  3. Financial Statements (last 4 years if possible).
  4. Insider Activity and Institutional Sentiment.
  5. Analyst ratings and price targets (current and historical trend).
  6. Price History (Monthly closes for last 12 months).

  Then, act as a senior hedge fund analyst ("Ultramagnus") and synthesize this into a JSON object.
  
  CRITICAL: Return ONLY valid JSON. No introductory text. No Markdown formatting.
  
  JSON Structure to match:
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
    "priceHistory": [ { "month": "String", "price": Number } ] (Last 12 months roughly),
    "analystPriceTargets": [ { "month": "String", "averageTarget": Number } ] (Last 12 months average analyst target matching priceHistory months),
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

export const aiAnalysisRouter = Router();

aiAnalysisRouter.post('/ai/stream-report', async (req, res) => {
  const { ticker } = req.body || {};
  const log = req.log || logger;
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  let client;
  try {
    client = ensureClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message || 'AI client unavailable' });
  }

  try {
    const startedAt = Date.now();
    const stream = await client.models.generateContentStream({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: REPORT_PROMPT(ticker) }] }],
      config: { tools: [{ googleSearch: {} }] }
    });

    if (!stream) {
      throw new Error('Stream initialization failed');
    }

    flushStreamingHeaders(res);

    let wrote = false;
    const iterable = {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          const c = chunk as any;
          const textPart = typeof c.text === 'function' ? c.text() : c.text;
          if (textPart) {
            wrote = true;
            yield textPart;
          }
        }
      }
    };

    const streamed = await streamText(res, iterable as AsyncIterable<string>);
    if (!wrote && !streamed) {
      if (!res.headersSent) {
        return res.status(502).end('Stream produced no content');
      }
    }
    res.end();

    const durationMs = Date.now() - startedAt;
    log.info({ message: 'ai.stream.report.completed', ticker, durationMs });
  } catch (err: any) {
    const providerDetails = describeGenAiError(err);
    log.error({ message: 'ai.stream.report.failed', err: providerDetails, ticker });
    logAIFailure({
      operation: 'ai.stream.report',
      model: MODEL_NAME,
      ticker,
      error: err,
      providerStatus: providerDetails.providerStatus,
      providerCode: providerDetails.providerCode,
      providerMessage: providerDetails.providerMessage,
      providerBody: providerDetails.providerBody,
      correlationId: (req as any).correlationId
    });
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to stream report', providerDetails });
    } else {
      res.end();
    }
  }
});
