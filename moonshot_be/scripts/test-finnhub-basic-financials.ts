import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBasicFinancials } from '../dist/clients/finnhub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
  try {
    const symbol = 'AAPL';
    const data = await getBasicFinancials(symbol);

    const latestAnnual: Record<string, unknown> = {};
    const latestQuarterly: Record<string, unknown> = {};

    if (data?.series?.annual) {
      Object.entries(data.series.annual).forEach(([key, arr]) => {
        if (Array.isArray(arr) && arr.length) {
          latestAnnual[key] = arr[0];
        }
      });
    }

    if (data?.series?.quarterly) {
      Object.entries(data.series.quarterly).forEach(([key, arr]) => {
        if (Array.isArray(arr) && arr.length) {
          latestQuarterly[key] = arr[0];
        }
      });
    }

    const output = {
      symbol: data?.symbol,
      metric: data?.metric,
      latestAnnual,
      latestQuarterly
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error('Error fetching basic financials:', err);
    process.exit(1);
  }
};

run();
