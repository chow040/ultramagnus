import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

type CompanyFacts = {
  cik?: string;
  facts?: Record<string, Record<string, any>>;
};

type FrameSummary = {
  frame: string;
  tagCount: number;
  factCount: number;
  start?: string;
  end?: string;
};

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'PLTR', 'HROW', 'FARM'];
const OUT_DIR = path.resolve(__dirname, '../logs/edgar-inventory');
const MAX_FRAMES = Number(process.env.EDGAR_INVENTORY_MAX_FRAMES || '24');
const DEFAULT_FY_END = '0930';

const makeUserAgent = () => {
  const base = process.env.EDGAR_USER_AGENT || 'ultramagnus-edgar-inventory/0.1';
  const contact = process.env.EDGAR_CONTACT;
  return contact ? `${base} (${contact})` : base;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      'User-Agent': makeUserAgent(),
      'Accept': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status} ${res.statusText} for ${url} :: ${text?.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
};

const padCik = (cik: number | string) => String(cik).padStart(10, '0');

const loadTickerMap = async () => {
  const url = 'https://www.sec.gov/files/company_tickers.json';
  const data = await fetchJson<Record<string, { cik_str: number; ticker: string; title: string }>>(url);
  const map = new Map<string, string>();
  Object.values(data || {}).forEach(entry => {
    if (entry?.ticker) {
      map.set(entry.ticker.toUpperCase(), padCik(entry.cik_str));
    }
  });
  return map;
};

const fetchFiscalYearEnd = async (cik: string) => {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  try {
    const data = await fetchJson<any>(url);
    return data?.fiscalYearEnd || DEFAULT_FY_END;
  } catch (_err) {
    return DEFAULT_FY_END;
  }
};

const fetchCompanyFacts = async (cik: string) => {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  return fetchJson<CompanyFacts>(url);
};

const summarizeFacts = (facts: CompanyFacts) => {
  const namespaces = facts.facts || {};
  const namespaceSummary: Record<string, { tags: number; usdTags: number; totalFacts: number; usdFacts: number }> = {};
  const frames = new Map<string, { tags: Set<string>; factCount: number; start?: string; end?: string }>();

  Object.entries(namespaces).forEach(([ns, tags]) => {
    const tagEntries = Object.entries(tags || {});
    let usdTags = 0;
    let usdFacts = 0;
    let totalFacts = 0;

    tagEntries.forEach(([tag, detail]: [string, any]) => {
      const units = detail?.units || {};
      const usdUnit = units['USD'];
      const usdUnitArr = Array.isArray(usdUnit) ? usdUnit : [];
      if (usdUnitArr.length) usdTags += 1;

      Object.entries(units).forEach(([unitKey, arr]) => {
        const factsArr = Array.isArray(arr) ? arr : [];
        totalFacts += factsArr.length;
        const isUsdNumeric = unitKey === 'USD' || unitKey.toLowerCase() === 'usd/shares';
        if (!isUsdNumeric) return;
        usdFacts += factsArr.length;
        factsArr.forEach((item: any) => {
          const frame = item?.frame || (item?.start && item?.end ? `${item.start}_${item.end}` : null);
          if (!frame) return;
          const existing = frames.get(frame) || { tags: new Set<string>(), factCount: 0, start: item?.start, end: item?.end };
          existing.factCount += 1;
          existing.tags.add(tag);
          existing.start = existing.start || item?.start;
          existing.end = existing.end || item?.end;
          frames.set(frame, existing);
        });
      });
    });

    namespaceSummary[ns] = {
      tags: tagEntries.length,
      usdTags,
      totalFacts,
      usdFacts
    };
  });

  const frameSummaries: FrameSummary[] = Array.from(frames.entries()).map(([frame, data]) => ({
    frame,
    tagCount: data.tags.size,
    factCount: data.factCount,
    start: data.start,
    end: data.end
  }));

  frameSummaries.sort((a, b) => (b.end || '').localeCompare(a.end || ''));

  return {
    namespaceSummary,
    frameSummaries: frameSummaries.slice(0, MAX_FRAMES),
    frameCount: frameSummaries.length
  };
};

const buildFactsIndex = (facts: CompanyFacts) => {
  const namespaces = facts.facts || {};
  const frameIndex = new Map<string, { tags: Record<string, number>; start?: string; end?: string }>();

  Object.values(namespaces).forEach(tags => {
    Object.entries(tags || {}).forEach(([tag, detail]: [string, any]) => {
      const usdFacts = detail?.units?.USD;
      const epsFacts = detail?.units?.['USD/shares'] || detail?.units?.['usd/shares'];
      const candidates = [usdFacts, epsFacts].filter(Array.isArray);
      if (!candidates.length) return;
      candidates.forEach(arr => {
        arr!.forEach((item: any) => {
          const frame = item?.frame || (item?.start && item?.end ? `${item.start}_${item.end}` : null);
          if (!frame || typeof item?.val !== 'number') return;
          const rec = frameIndex.get(frame) || { tags: {}, start: item?.start, end: item?.end };
          rec.tags[tag] = item.val;
          rec.start = rec.start || item?.start;
          rec.end = rec.end || item?.end;
          frameIndex.set(frame, rec);
        });
      });
    });
  });

  const entries = Array.from(frameIndex.entries()).map(([frame, data]) => ({
    frame,
    start: data.start,
    end: data.end,
    tags: data.tags
  }));

  entries.sort((a, b) => (b.end || '').localeCompare(a.end || ''));
  return entries.slice(0, MAX_FRAMES);
};

const ensureOutDir = () => {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
};

const run = async () => {
  try {
    const argsTickers = process.argv.slice(2).filter(Boolean);
    const tickers = (argsTickers.length ? argsTickers : DEFAULT_TICKERS).map(t => t.toUpperCase());

    console.log(`Loading ticker map for ${tickers.join(', ')}...`);
    const tickerMap = await loadTickerMap();

    ensureOutDir();

    for (const ticker of tickers) {
      const cik = tickerMap.get(ticker);
      if (!cik) {
        console.warn(`No CIK found for ${ticker}, skipping`);
        continue;
      }

      console.log(`Fetching companyfacts for ${ticker} (CIK ${cik})...`);
      const fiscalYearEnd = await fetchFiscalYearEnd(cik);
      const facts = await fetchCompanyFacts(cik);
      const summary = summarizeFacts(facts);
      const factsIndex = buildFactsIndex(facts);

      const out = {
        ticker,
        cik,
        fiscalYearEnd,
        frameCount: summary.frameCount,
        namespaceSummary: summary.namespaceSummary,
        frames: summary.frameSummaries,
        factsIndex
      };

      const outPath = path.join(OUT_DIR, `${ticker}-inventory.json`);
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
      console.log(`Saved ${outPath}`);
    }

    console.log('Done. Check logs/edgar-inventory for outputs.');
  } catch (err) {
    console.error('Inventory script failed:', err);
    process.exit(1);
  }
};

run();
