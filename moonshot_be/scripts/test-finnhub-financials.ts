import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Use built output to avoid TS transpile for this smoke test
import { getFinancialsReported } from '../dist/clients/finnhub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
  try {
    const symbol = 'AAPL';
    const data = await getFinancialsReported(symbol, 'quarterly');

    // Show only the most recent quarter and annotate period types
    const recent = (data?.data || []).slice(0, 1).map((entry) => ({
      ...entry,
      periodTypeIncome: entry.form === '10-K' ? 'ANNUAL' : 'YTD',
      periodTypeCashFlow: entry.form === '10-K' ? 'ANNUAL' : 'YTD',
      periodTypeBalanceSheet: 'POINT_IN_TIME'
    }));

    console.log(JSON.stringify(recent, null, 2));
  } catch (err) {
    console.error('Error fetching financials:', err);
    process.exit(1);
  }
};

run();
