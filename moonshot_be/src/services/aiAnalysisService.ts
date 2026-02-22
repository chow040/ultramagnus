import { ensureClient, MODEL_NAME } from '../routes/aiShared.js';

export const REPORT_PROMPT = (ticker: string) => `
  You are a senior hedge fund analyst. Generate a comprehensive professional equity research report for ${ticker}.
  
  You MUST search for the latest real-time data including:
  1. Current Price, Day's Range, 52-Week Range, Market Cap, PE Ratio.
  2. Recent News (last 30 days) and Upcoming Events (Catalysts).
  3. Financial Statements (last 4 years if possible).
  4. Insider Activity and Institutional Sentiment.
  5. Analyst ratings and price targets (current and historical trend).
  6. Price History (Monthly closes for last 12 months).

  You MUST perform an in-depth analysis of the stock covering its fundamentals, competitive positioning, long term growth prospects, leadership quality, financial ratios. 

  Then synthesize this into a JSON object.
  Return ONLY valid JSON, no markdown, no prose. Use this exact shape:
  {
    "companyName": "String",
    "ticker": "String",
    "reportDate": "String",
    "currentPrice": "String",
    "priceChange": "String",
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
    "summary": "String",
    "rocketScore": Number,
    "rocketReason": "String",
    "financialHealthScore": Number,
    "financialHealthReason": "String",
    "momentumScore": Number,
    "momentumReason": "String",
    "moatAnalysis": { "moatRating": "Wide/Narrow/None", "moatSource": "String", "rationale": "String" },
    "managementQuality": { "executiveTenure": "String", "insiderOwnership": "String", "trackRecord": "String", "governanceRedFlags": "String", "verdict": "String" },
    "history": { "previousDate": "String", "previousVerdict": "BUY/HOLD/SELL", "changeRationale": ["String"] },
    "shortTermFactors": { "positive": [{"title": "String", "detail": "String"}], "negative": [{"title": "String", "detail": "String"}] },
    "longTermFactors": { "positive": [{"title": "String", "detail": "String"}], "negative": [{"title": "String", "detail": "String"}] },
    "competitivePositioning": {
      "marketShareTrend": "String",
      "relativeAdvantages": ["String"],
      "keyThreats": ["String"],
      "peerComparisonSummary": "String"
    },
    "growthOutlook": {
      "drivers": ["String"],
      "constraints": ["String"],
      "baseCase3y": "String",
      "bullCase3y": "String",
      "bearCase3y": "String"
    },
    "leadershipAssessment": {
      "capitalAllocation": "String",
      "executionTrackRecord": "String",
      "alignment": "String",
      "overall": "String"
    },
    "financialRatiosAnalysis": {
      "profitability": { "grossMargin": "String", "operatingMargin": "String", "netMargin": "String", "roe": "String", "roic": "String" },
      "liquidity": { "currentRatio": "String", "quickRatio": "String" },
      "leverage": { "debtToEquity": "String", "interestCoverage": "String" },
      "cashFlow": { "fcfMargin": "String", "fcfConversion": "String" },
      "valuation": { "pe": "String", "evEbitda": "String", "ps": "String" },
      "takeaway": "String"
    },
    "financials": [ { "year": "String", "revenue": Number, "grossProfit": Number, "operatingIncome": Number, "netIncome": Number, "eps": Number, "cashAndEquivalents": Number, "totalDebt": Number, "shareholderEquity": Number, "operatingCashFlow": Number, "capitalExpenditure": Number, "freeCashFlow": Number } ],
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

export const sanitizeJsonText = (text: string) => {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Empty AI response');

  const withoutFences = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  // Strip control characters that break JSON parsing (common from streamed models)
  const cleaned = withoutFences.replace(/[\u0000-\u0019]+/g, ' ');

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const candidate = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
  return candidate;
};

const normalizeScore = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseFloat(value.replace(/[^\d.-]/g, ''))
      : Number.NaN;

  if (!Number.isFinite(parsed)) return fallback;

  // Some model outputs use a 1-10 scale despite prompt instructions; normalize to 0-100.
  const scaled = parsed >= 0 && parsed <= 10 ? parsed * 10 : parsed;
  return Math.max(0, Math.min(100, Math.round(scaled)));
};

const normalizeSentimentLabel = (label: unknown, score: number): 'Bullish' | 'Neutral' | 'Bearish' => {
  if (score >= 60) return 'Bullish';
  if (score <= 40) return 'Bearish';

  if (typeof label === 'string') {
    const normalized = label.trim().toLowerCase();
    if (normalized === 'bullish') return 'Bullish';
    if (normalized === 'bearish') return 'Bearish';
  }
  return 'Neutral';
};

const normalizeOverallSentiment = (value: any) => {
  const score = normalizeScore(value?.score, 50);
  return {
    score,
    label: normalizeSentimentLabel(value?.label, score),
    summary: typeof value?.summary === 'string' ? value.summary : ''
  };
};

const parseReportJson = (text: string) => {
  const candidate = sanitizeJsonText(text);
  try {
    return JSON.parse(candidate);
  } catch (err: any) {
    throw new Error(`Failed to parse AI JSON: ${err.message || err.toString()}`);
  }
};

const extractText = (result: any) => {
  const candidateText = Array.isArray(result?.response?.candidates)
    ? result.response.candidates
      .map((c: any) => c?.content?.parts?.map((p: any) => p?.text || '').join('') || '')
      .join('')
    : '';

  return result?.response?.text?.()
    ?? result?.text
    ?? candidateText
    ?? '';
};

export const runGeminiAnalysis = async (ticker: string) => {
  const client = ensureClient();
  const result = await client.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: REPORT_PROMPT(ticker) }] }],
    config: { tools: [{ googleSearch: {} }], temperature: 0 }
  });

  const text = extractText(result);
  const raw = parseReportJson(text);
  const generatedAt = new Date().toISOString();

  // Normalize to expected shape with safe defaults to avoid downstream crashes
  const safe = (value: any, fallback: any) => value === undefined || value === null ? fallback : value;
  const baseArray = (arr: any, fallback: any[] = []) => Array.isArray(arr) ? arr : fallback;

  const report = {
    companyName: safe(raw.companyName, ticker),
    ticker: safe(raw.ticker, ticker),
    // Always stamp with generation time to avoid stale dates coming back from the model
    reportDate: generatedAt,
    currentPrice: safe(raw.currentPrice, 'N/A'),
    priceChange: safe(raw.priceChange, 'N/A'),
    marketCap: safe(raw.marketCap, 'N/A'),
    peRatio: safe(raw.peRatio, 'N/A'),
    dayHigh: safe(raw.dayHigh, 'N/A'),
    dayLow: safe(raw.dayLow, 'N/A'),
    week52High: safe(raw.week52High, 'N/A'),
    week52Low: safe(raw.week52Low, 'N/A'),
    priceTarget: safe(raw.priceTarget, 'N/A'),
    priceTargetRange: safe(raw.priceTargetRange, 'N/A'),
    priceTargetModel: safe(raw.priceTargetModel, { estimatedEPS: '', targetPE: '', growthRate: '', logic: '' }),
    scenarioAnalysis: safe(raw.scenarioAnalysis, {
      bear: { label: 'Bear', price: 'N/A', logic: '', probability: '' },
      base: { label: 'Base', price: 'N/A', logic: '', probability: '' },
      bull: { label: 'Bull', price: 'N/A', logic: '', probability: '' }
    }),
    summary: safe(raw.summary, ''),
    rocketScore: normalizeScore(raw.rocketScore, 0),
    rocketReason: safe(raw.rocketReason, ''),
    financialHealthScore: normalizeScore(raw.financialHealthScore, 0),
    financialHealthReason: safe(raw.financialHealthReason, ''),
    momentumScore: normalizeScore(raw.momentumScore, 0),
    momentumReason: safe(raw.momentumReason, ''),
    moatAnalysis: safe(raw.moatAnalysis, { moatRating: 'None', moatSource: '', rationale: '' }),
    managementQuality: safe(raw.managementQuality, { executiveTenure: '', insiderOwnership: '', trackRecord: '', governanceRedFlags: '', verdict: '' }),
    history: safe(raw.history, { previousDate: '', previousVerdict: 'HOLD', changeRationale: [] }),
    shortTermFactors: safe(raw.shortTermFactors, { positive: [], negative: [] }),
    longTermFactors: safe(raw.longTermFactors, { positive: [], negative: [] }),
    competitivePositioning: safe(raw.competitivePositioning, {
      marketShareTrend: '',
      relativeAdvantages: [],
      keyThreats: [],
      peerComparisonSummary: ''
    }),
    growthOutlook: safe(raw.growthOutlook, {
      drivers: [],
      constraints: [],
      baseCase3y: '',
      bullCase3y: '',
      bearCase3y: ''
    }),
    leadershipAssessment: safe(raw.leadershipAssessment, {
      capitalAllocation: '',
      executionTrackRecord: '',
      alignment: '',
      overall: ''
    }),
    financialRatiosAnalysis: safe(raw.financialRatiosAnalysis, {
      profitability: { grossMargin: '', operatingMargin: '', netMargin: '', roe: '', roic: '' },
      liquidity: { currentRatio: '', quickRatio: '' },
      leverage: { debtToEquity: '', interestCoverage: '' },
      cashFlow: { fcfMargin: '', fcfConversion: '' },
      valuation: { pe: '', evEbitda: '', ps: '' },
      takeaway: ''
    }),
    financials: baseArray(raw.financials),
    priceHistory: baseArray(raw.priceHistory),
    analystPriceTargets: baseArray(raw.analystPriceTargets),
    peers: baseArray(raw.peers),
    upcomingEvents: baseArray(raw.upcomingEvents),
    recentNews: baseArray(raw.recentNews),
    earningsCallAnalysis: safe(raw.earningsCallAnalysis, { sentiment: 'Neutral', summary: '', keyTakeaways: [] }),
    overallSentiment: normalizeOverallSentiment(raw.overallSentiment),
    insiderActivity: baseArray(raw.insiderActivity),
    riskMetrics: safe(raw.riskMetrics, { beta: '', shortInterestPercentage: '', shortInterestRatio: '', volatility: '' }),
    institutionalSentiment: safe(raw.institutionalSentiment, ''),
    tags: baseArray(raw.tags),
    valuation: safe(raw.valuation, ''),
    verdict: safe(raw.verdict, 'HOLD'),
    verdictReason: safe(raw.verdictReason, ''),
    sources: baseArray(raw.sources)
  };

  return report;
};
