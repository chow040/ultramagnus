import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const UA = process.env.EDGAR_USER_AGENT || 'ultramagnus-edgar/0.1';
const CONTACT = process.env.EDGAR_CONTACT;
const USER_AGENT = CONTACT ? `${UA} (${CONTACT})` : UA;

type RecentFilings = {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  form: string[];
};

const padCik = (cik: string | number) => String(cik).padStart(10, '0');
const cikNumber = (cik: string | number) => String(cik).replace(/^0+/, '');

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status} ${res.statusText} for ${url} :: ${text?.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
};

const loadTickerMap = async () => {
  const url = 'https://www.sec.gov/files/company_tickers.json';
  const data = await fetchJson<Record<string, { cik_str: number; ticker: string }>>(url);
  const map = new Map<string, string>();
  Object.values(data || {}).forEach(entry => {
    if (entry?.ticker) {
      map.set(entry.ticker.toUpperCase(), padCik(entry.cik_str));
    }
  });
  return map;
};

const findLatest = (recent: RecentFilings, targetForms: string[]) => {
  for (let i = 0; i < recent.form.length; i++) {
    if (targetForms.includes(recent.form[i])) {
      return {
        form: recent.form[i],
        accession: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i]
      };
    }
  }
  return null;
};

const run = async () => {
  const ticker = (process.argv[2] || 'AAPL').toUpperCase();
  try {
    console.log(`Resolving CIK for ${ticker}...`);
    const map = await loadTickerMap();
    const cik = map.get(ticker);
    if (!cik) throw new Error(`CIK not found for ${ticker}`);

    const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const subs = await fetchJson<any>(submissionsUrl);
    const recent = subs?.filings?.recent as RecentFilings;
    if (!recent) throw new Error('No recent filings found');

    const latest10Q = findLatest(recent, ['10-Q']);
    const latest10K = findLatest(recent, ['10-K']);
    const pick = latest10Q || latest10K;
    if (!pick) throw new Error('No 10-Q or 10-K found in recent filings');

    console.log(`Latest target filing: ${pick.form} ${pick.accession} (filed ${pick.filingDate}, period ${pick.reportDate})`);

    const accNoNoDashes = pick.accession.replace(/-/g, '');
    const cikNoPad = cikNumber(cik);
    const base = `https://www.sec.gov/Archives/edgar/data/${cikNoPad}/${accNoNoDashes}`;
    const indexUrl = `${base}/index.json`;
    console.log(`Fetching index: ${indexUrl}`);
    const index = await fetchJson<any>(indexUrl);
    const files = index?.directory?.item || [];

    const summary = files.map((f: any) => f.name);
    console.log(`Files (${summary.length}):`);
    summary.forEach((name: string) => console.log(` - ${name}`));

    const xbrlZip = files.find((f: any) => typeof f.name === 'string' && f.name.toLowerCase().endsWith('xbrl.zip'));
    const ixbrl = files.find((f: any) => typeof f.name === 'string' && f.name.toLowerCase().endsWith('.htm'));

    console.log(`Likely XBRL zip: ${xbrlZip?.name || 'not found'}`);
    console.log(`Likely iXBRL HTML: ${ixbrl?.name || 'not found'}`);

    // Optionally download XBRL zip to logs for inspection
    if (xbrlZip?.name) {
      const outDir = path.resolve(__dirname, '../logs/edgar-xbrl');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${ticker}-${pick.accession.replace(/-/g, '')}-xbrl.zip`);
      const zipUrl = `${base}/${xbrlZip.name}`;
      console.log(`Downloading ${zipUrl} -> ${outPath}`);
      const res = await fetch(zipUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`Download failed ${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outPath, buf);
      console.log(`Saved ${buf.length} bytes to ${outPath}`);
    }
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
};

run();
