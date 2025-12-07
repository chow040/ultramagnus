import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Use built output modules to avoid TS transpile step when running the script
import { getFinancialsReported } from '../dist/clients/finnhub.js';
import { db } from '../dist/db/client.js';
import { reports } from '../dist/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { getGenAiClient } from '../dist/clients/genai.js';
import { config } from '../dist/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TARGET_TICKER = 'NBIS';
const PERIODS = 4;

const fetchFinancials = async () => {
  const res = await getFinancialsReported(TARGET_TICKER, 'quarterly');
  return (res?.data || []).slice(0, PERIODS);
};

const fetchLatestReportPayload = async () => {
  const rows = await db.select({
    payload: reports.payload,
    id: reports.id,
    updatedAt: reports.updatedAt
  }).from(reports)
    .where(eq(reports.ticker, TARGET_TICKER))
    .orderBy(desc(reports.updatedAt))
    .limit(1);
  return rows?.[0] || null;
};

const buildPrompt = (financials: any[], report: any) => {
  const financialsText = JSON.stringify(financials, null, 2);
  const reportText = report ? JSON.stringify(report.payload || {}, null, 2) : 'N/A';

  return `
You are an equity analyst. Company: ${TARGET_TICKER}.

Use the data below to produce ONE valuation with a model-agnostic JSON envelope.


1. Return ONLY valid JSON. No markdown, no prose.
2. Use exactly one valuation method. Set method to any clear identifier (e.g., pe_multiple, ev_ebitda, ev_sales, dividend_discount, dcf, residual_income, etc.).
3. List assumptions in inputs as an array of { name, value, unit, note }. Unknown values -> null.
4. Keep keys as defined; if a field is unknown, set null.
5. Build a financial model based on the provided financials and report data with additional information in the report to support your valuation.
6. Do not use analyst price targets directly from the report; only use them to cross-check your own work.

Schema:
{
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

Data to use
Financials (last ${PERIODS} quarters, as reported):
${financialsText}

Latest stored report payload (from DB):
${reportText}
`;
};

const run = async () => {
  try {
    console.log('Fetching financials and report...');
    const [financials, report] = await Promise.all([
      fetchFinancials(),
      fetchLatestReportPayload()
    ]);

    const prompt = buildPrompt(financials, report);

    const ai = getGenAiClient();
    const response = await ai.models.generateContent({
      model: config.geminiAnalyzeModel,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = response.text || 'No response';
    console.log('\n=== AI Assessment (POC) ===\n');
    console.log(text);
  } catch (err) {
    console.error('POC failed:', err);
    process.exit(1);
  } finally {
    // Allow graceful exit when db pools are in use
    setTimeout(() => process.exit(0), 200);
  }
};

run();
