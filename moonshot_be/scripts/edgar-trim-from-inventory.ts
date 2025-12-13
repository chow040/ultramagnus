import fs from 'fs';
import path from 'path';

type FrameEntry = {
  frame: string;
  start?: string;
  end?: string;
  tags: Record<string, number>;
};

type InventoryFile = {
  ticker: string;
  fiscalYearEnd?: string;
  factsIndex: FrameEntry[];
};

const OUTPUT_SUFFIX = '-trimmed.json';
const DEFAULT_FY_END = process.env.FISCAL_YEAR_END || '0930'; // MMDD, default Sep 30

const plTags = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
  cogs: ['CostOfGoodsAndServicesSold', 'CostOfRevenue'],
  grossProfit: ['GrossProfit', 'GrossProfitLoss'],
  rnd: ['ResearchAndDevelopmentExpense'],
  sga: ['SellingGeneralAndAdministrativeExpense', 'GeneralAndAdministrativeExpense', 'SellingAndMarketingExpense'],
  operatingIncome: ['OperatingIncomeLoss'],
  nonOperating: ['NonoperatingIncomeExpense'],
  depreciationAmortization: ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'Depreciation', 'AmortizationOfIntangibleAssets'],
  incomeTax: ['IncomeTaxExpenseBenefit'],
  netIncome: ['NetIncomeLoss'],
  epsDiluted: ['EarningsPerShareDiluted', 'EarningsPerShareBasicAndDiluted'],
  epsBasic: ['EarningsPerShareBasic']
};

const cfTags = {
  cfo: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'],
  cfi: ['NetCashProvidedByUsedInInvestingActivities'],
  cff: ['NetCashProvidedByUsedInFinancingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PurchaseOfPropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'],
  dividends: ['PaymentsOfDividends'],
  buybacks: ['PaymentsForRepurchaseOfCommonStock', 'StockRepurchasedAndRetiredDuringPeriodValue'],
  debtIssued: ['ProceedsFromIssuanceOfLongTermDebt'],
  debtRepaid: ['RepaymentsOfLongTermDebt']
};

const bsTags = {
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
  securitiesCurrent: ['MarketableSecuritiesCurrent'],
  securitiesNonCurrent: ['MarketableSecuritiesNoncurrent'],
  receivables: ['AccountsReceivableNetCurrent'],
  inventory: ['InventoryNet'],
  otherCurrentAssets: ['OtherAssetsCurrent'],
  totalCurrentAssets: ['AssetsCurrent'],
  totalAssets: ['Assets'],
  payables: ['AccountsPayableCurrent'],
  currentDebt: ['DebtCurrent', 'LongTermDebtCurrent'],
  otherCurrentLiabilities: ['OtherLiabilitiesCurrent'],
  totalCurrentLiabilities: ['LiabilitiesCurrent'],
  longTermDebt: ['LongTermDebtNoncurrent', 'LongTermDebt'],
  totalLiabilities: ['Liabilities'],
  equity: ['StockholdersEquity'],
  aoci: ['AccumulatedOtherComprehensiveIncomeLossNetOfTax'],
  shares: ['EntityCommonStockSharesOutstanding']
};

const pickFirst = (tags: Record<string, number>, keys: string[]) => {
  for (const k of keys) {
    if (k in tags) return tags[k];
  }
  return null;
};

const isInstantFrame = (frame: string) => frame.endsWith('I');

const trimFrame = (frame: FrameEntry & { fiscalYearEnd?: string }) => {
  const { frame: name, start, end, tags, fiscalYearEnd } = frame;

  const pl = !isInstantFrame(name)
    ? {
        revenue: pickFirst(tags, plTags.revenue),
        cogs: pickFirst(tags, plTags.cogs),
        grossProfit: pickFirst(tags, plTags.grossProfit),
        rnd: pickFirst(tags, plTags.rnd),
        sga: pickFirst(tags, plTags.sga),
        operatingIncome: pickFirst(tags, plTags.operatingIncome),
        nonOperating: pickFirst(tags, plTags.nonOperating),
        depreciationAmortization: pickFirst(tags, plTags.depreciationAmortization),
        incomeTax: pickFirst(tags, plTags.incomeTax),
        netIncome: pickFirst(tags, plTags.netIncome),
        epsDiluted: pickFirst(tags, plTags.epsDiluted) ?? pickFirst(tags, plTags.epsBasic),
        epsBasic: pickFirst(tags, plTags.epsBasic)
      }
    : null;

  const cf = !isInstantFrame(name)
    ? (() => {
        const cfo = pickFirst(tags, cfTags.cfo);
        const capex = pickFirst(tags, cfTags.capex);
        const fcf = cfo !== null && capex !== null ? cfo - capex : null;
        return {
          cfo,
          cfi: pickFirst(tags, cfTags.cfi),
          cff: pickFirst(tags, cfTags.cff),
          capex,
          fcf,
          dividends: pickFirst(tags, cfTags.dividends),
          buybacks: pickFirst(tags, cfTags.buybacks),
          debtIssued: pickFirst(tags, cfTags.debtIssued),
          debtRepaid: pickFirst(tags, cfTags.debtRepaid)
        };
      })()
    : null;

  const bs = isInstantFrame(name)
    ? {
        cash: pickFirst(tags, bsTags.cash),
        securitiesCurrent: pickFirst(tags, bsTags.securitiesCurrent),
        securitiesNonCurrent: pickFirst(tags, bsTags.securitiesNonCurrent),
        receivables: pickFirst(tags, bsTags.receivables),
        inventory: pickFirst(tags, bsTags.inventory),
        otherCurrentAssets: pickFirst(tags, bsTags.otherCurrentAssets),
        totalCurrentAssets: pickFirst(tags, bsTags.totalCurrentAssets),
        totalAssets: pickFirst(tags, bsTags.totalAssets),
        payables: pickFirst(tags, bsTags.payables),
        currentDebt: pickFirst(tags, bsTags.currentDebt),
        otherCurrentLiabilities: pickFirst(tags, bsTags.otherCurrentLiabilities),
        totalCurrentLiabilities: pickFirst(tags, bsTags.totalCurrentLiabilities),
        longTermDebt: pickFirst(tags, bsTags.longTermDebt),
        totalLiabilities: pickFirst(tags, bsTags.totalLiabilities),
        equity: pickFirst(tags, bsTags.equity),
        aoci: pickFirst(tags, bsTags.aoci),
        shares: pickFirst(tags, bsTags.shares)
      }
    : null;

  return {
    frame: name,
    start,
    end,
    pl,
    bs,
    cf,
    fiscalYearEnd
  };
};

const fiscalInfo = (start?: string, end?: string, fyEndStr: string = DEFAULT_FY_END) => {
  if (!end) return { fiscalFrame: null, fiscalYear: null, fiscalQuarter: null, isAnnual: false };
  const fyEndMonth = Number(fyEndStr.slice(0, 2));
  const endDate = new Date(end);
  const startDate = start ? new Date(start) : null;
  const endMonth = endDate.getUTCMonth() + 1;
  const fyStartMonth = ((fyEndMonth % 12) + 1);
  const monthsFromStart = (endMonth - fyStartMonth + 12) % 12;
  const fiscalQuarter = Math.floor(monthsFromStart / 3) + 1;
  const fiscalYear = endDate.getUTCFullYear();

  const isAnnual = (() => {
    if (!startDate) return false;
    const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return days > 300;
  })();

  const fiscalFrame = isAnnual ? `FY${fiscalYear}` : fiscalQuarter ? `FY${fiscalYear}Q${fiscalQuarter}` : null;
  if (isAnnual) {
    return { fiscalFrame, fiscalYear, fiscalQuarter: null, isAnnual };
  }
  return { fiscalFrame, fiscalYear, fiscalQuarter, isAnnual };
};

const mergeByBaseFrame = (frames: ReturnType<typeof trimFrame>[]) => {
  const byBase = new Map<
    string,
    { frame: string; start?: string; end?: string; pl: any; bs: any; cf: any; fiscalYearEnd?: string }
  >();

  frames.forEach(f => {
    const base = f.frame.replace(/I$/, '');
    const existing = byBase.get(base) || { frame: base, start: f.start, end: f.end, pl: null, bs: null, cf: null, fiscalYearEnd: f.fiscalYearEnd };
    existing.start = existing.start || f.start;
    existing.end = existing.end || f.end;
    if (f.pl) existing.pl = f.pl;
    if (f.cf) existing.cf = f.cf;
    if (f.bs) existing.bs = f.bs;
    existing.fiscalYearEnd = existing.fiscalYearEnd || f.fiscalYearEnd;
    byBase.set(base, existing);
  });

  return Array.from(byBase.values());
};

const deriveQuarterIfMissing = (frames: ReturnType<typeof mergeByBaseFrame>) => {
  const durations = frames.filter(f => f.pl || f.cf).map(f => ({
    ...f,
    ...fiscalInfo(f.start, f.end, f.fiscalYearEnd)
  }));
  const instants = frames.filter(f => f.bs && !f.pl && !f.cf).map(f => ({
    ...f,
    ...fiscalInfo(f.start, f.end, f.fiscalYearEnd)
  }));

  const byFyQuarter = new Map<string, any>();
  durations.forEach(f => {
    if (!f.fiscalFrame) return;
    if (!f.isAnnual) byFyQuarter.set(f.fiscalFrame, f);
  });

  const byFiscalYear = new Map<number, { annual?: any; ytd?: any }>();
  durations.forEach(f => {
    if (!f.fiscalYear) return;
    const bucket = byFiscalYear.get(f.fiscalYear) || {};
    if (f.isAnnual) bucket.annual = f;
    if (!f.isAnnual) {
      const curSpan = (() => {
        if (!bucket.ytd?.start || !bucket.ytd?.end) return -1;
        return (new Date(bucket.ytd.end).getTime() - new Date(bucket.ytd.start).getTime());
      })();
      const newSpan = (() => {
        if (!f.start || !f.end) return -1;
        return (new Date(f.end).getTime() - new Date(f.start).getTime());
      })();
      if (!bucket.ytd || newSpan > curSpan || (newSpan === curSpan && (bucket.ytd.end || '') < (f.end || ''))) {
        bucket.ytd = f;
      }
    }
    byFiscalYear.set(f.fiscalYear, bucket);
  });

  const result: any[] = [...frames];

  const deriveDelta = (a: number | null, b: number | null) => {
    if (a === null || b === null) return null;
    return a - b;
  };

  byFiscalYear.forEach((bucket, fy) => {
    const annual = bucket.annual;
    if (!annual) return;
    const ytd = bucket.ytd;
    const q4Key = `FY${fy}Q4`;
    const hasQ4 = byFyQuarter.has(q4Key);
    if (hasQ4 || !ytd) return;

    const pl = annual.pl
      ? {
          revenue: deriveDelta(annual.pl.revenue, ytd.pl?.revenue ?? null),
          cogs: deriveDelta(annual.pl.cogs, ytd.pl?.cogs ?? null),
          grossProfit: deriveDelta(annual.pl.grossProfit, ytd.pl?.grossProfit ?? null),
          rnd: deriveDelta(annual.pl.rnd, ytd.pl?.rnd ?? null),
          sga: deriveDelta(annual.pl.sga, ytd.pl?.sga ?? null),
          operatingIncome: deriveDelta(annual.pl.operatingIncome, ytd.pl?.operatingIncome ?? null),
          nonOperating: deriveDelta(annual.pl.nonOperating, ytd.pl?.nonOperating ?? null),
          incomeTax: deriveDelta(annual.pl.incomeTax, ytd.pl?.incomeTax ?? null),
          netIncome: deriveDelta(annual.pl.netIncome, ytd.pl?.netIncome ?? null),
          epsDiluted: deriveDelta(annual.pl.epsDiluted, ytd.pl?.epsDiluted ?? null),
          epsBasic: deriveDelta(annual.pl.epsBasic, ytd.pl?.epsBasic ?? null)
        }
      : null;

    const cf = annual.cf
      ? (() => {
          const cfo = deriveDelta(annual.cf.cfo, ytd.cf?.cfo ?? null);
          const capex = deriveDelta(annual.cf.capex, ytd.cf?.capex ?? null);
          const fcf = cfo !== null && capex !== null ? cfo - capex : null;
          return {
            cfo,
            cfi: deriveDelta(annual.cf.cfi, ytd.cf?.cfi ?? null),
            cff: deriveDelta(annual.cf.cff, ytd.cf?.cff ?? null),
            capex,
            fcf,
            dividends: deriveDelta(annual.cf.dividends, ytd.cf?.dividends ?? null),
            buybacks: deriveDelta(annual.cf.buybacks, ytd.cf?.buybacks ?? null),
            debtIssued: deriveDelta(annual.cf.debtIssued, ytd.cf?.debtIssued ?? null),
            debtRepaid: deriveDelta(annual.cf.debtRepaid, ytd.cf?.debtRepaid ?? null)
          };
        })()
      : null;

    const bsInstant = instants.find(i => i.fiscalYear === fy && i.fiscalQuarter === 4);

    const startQ4 = ytd.end || annual.start;

    const derived = {
      frame: q4Key,
      start: startQ4,
      end: annual.end,
      pl,
      cf,
      bs: bsInstant?.bs || null,
      fiscalFrame: q4Key,
      fiscalYear: fy,
      fiscalQuarter: 4,
      source: 'derived_delta'
    };

    result.push(derived);
  });

  return result.map(f => {
    const info = fiscalInfo(f.start, f.end);
    return { ...f, ...info, fiscalYearEnd: f.fiscalYearEnd };
  });
};

const mergeByFiscalFrame = (frames: Array<any>) => {
  const byFiscal = new Map<
    string,
    { frame: string; fiscalFrame?: string | null; start?: string; end?: string; pl: any; bs: any; cf: any; source?: string; isAnnual?: boolean }
  >();

  frames.forEach(f => {
    if (!f.fiscalFrame) return;
    const key = f.fiscalFrame;
    const existing = byFiscal.get(key) || {
      frame: f.fiscalFrame,
      fiscalFrame: f.fiscalFrame,
      start: f.start,
      end: f.end,
      pl: null,
      bs: null,
      cf: null,
      source: f.source,
      isAnnual: f.isAnnual
    };
    // prefer later end date
    if (!existing.end || (f.end && f.end > existing.end)) existing.end = f.end;
    if (!existing.start) existing.start = f.start;
    if (f.pl) existing.pl = f.pl;
    if (f.bs) existing.bs = f.bs;
    if (f.cf) existing.cf = f.cf;
    if (f.source && !existing.source) existing.source = f.source;
    if (f.isAnnual !== undefined) existing.isAnnual = f.isAnnual;
    byFiscal.set(key, existing);
  });

  // attach BS from instants if missing
  const instants = frames.filter(f => f.bs && !f.pl && !f.cf && f.fiscalFrame);
  byFiscal.forEach((entry, key) => {
    if (entry.bs) return;
    const matches = instants.filter(i => i.fiscalFrame === key);
    let pick = null;
    if (matches.length) {
      pick = matches.sort((a, b) => (b.end || '').localeCompare(a.end || ''))[0];
    } else if (instants.length) {
      pick = instants.sort((a, b) => (b.end || '').localeCompare(a.end || ''))[0];
    }
    if (pick) entry.bs = pick.bs;
  });

  return Array.from(byFiscal.values());
};

const durationDays = (start?: string, end?: string) => {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.abs(e - s) / (1000 * 60 * 60 * 24);
};

const allNull = (obj: any) => {
  if (!obj) return true;
  return Object.values(obj).every(v => v === null || v === undefined);
};

const deltaSection = (a: any, b: any) => {
  if (!a) return null;
  const out: any = {};
  Object.keys(a).forEach(k => {
    const va = a[k];
    const vb = b ? b[k] : null;
    if (typeof va === 'number' && typeof vb === 'number') {
      out[k] = va - vb;
    } else {
      out[k] = null;
    }
  });
  return out;
};

const fiscalYearStartForEnd = (end?: string, fyEndStr: string = DEFAULT_FY_END) => {
  if (!end) return null;
  const endDate = new Date(end);
  if (isNaN(endDate.getTime())) return null;
  const fyEndMonth = Number(fyEndStr.slice(0, 2));
  const fyEndDay = Number(fyEndStr.slice(2, 4));
  // fiscal year end in year of endDate if endDate month/day >= fy end, else previous year
  let fyEndYear = endDate.getUTCFullYear();
  if (endDate.getUTCMonth() + 1 < fyEndMonth || ((endDate.getUTCMonth() + 1 === fyEndMonth) && endDate.getUTCDate() < fyEndDay)) {
    fyEndYear -= 1;
  }
  const fyEndDate = new Date(Date.UTC(fyEndYear, fyEndMonth - 1, fyEndDay));
  const fyStart = new Date(fyEndDate.getTime() + 24 * 60 * 60 * 1000);
  const yyyy = fyStart.getUTCFullYear();
  const mm = String(fyStart.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(fyStart.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const fillFromYtd = (frames: any[]) => {
  const result = frames.map(f => ({ ...f }));
  const ytds = result.filter(f => {
    if (!f.start || !f.end || f.isAnnual) return false;
    const fyStart = fiscalYearStartForEnd(f.end, f.fiscalYearEnd);
    return fyStart !== null && f.start === fyStart;
  });

  const ytdByEnd = new Map<string, any>();
  ytds.forEach(f => {
    if (f.end) ytdByEnd.set(f.end, f);
  });

  result.forEach(f => {
    if (f.isAnnual) return;
    if (!f.end) return;
    const needsPl = !f.pl || allNull(f.pl);
    const needsCf = !f.cf || allNull(f.cf);
    if (!needsPl && !needsCf) return;

    const ytd = ytdByEnd.get(f.end);
    if (!ytd) return;
    // find previous YTD (latest end before this end)
    const prevYtd = Array.from(ytdByEnd.entries())
      .filter(([end]) => end < f.end!)
      .sort((a, b) => b[0].localeCompare(a[0]))[0]?.[1];

    if (needsPl && ytd.pl) {
      f.pl = deltaSection(ytd.pl, prevYtd?.pl);
      f.source = 'derived_delta';
    }
    if (needsCf && ytd.cf) {
      f.cf = deltaSection(ytd.cf, prevYtd?.cf);
      // recompute fcf if possible
      if (f.cf && typeof f.cf.cfo === 'number' && typeof f.cf.capex === 'number') {
        f.cf.fcf = f.cf.cfo - f.cf.capex;
      }
      f.source = 'derived_delta';
    }
  });

  return result;
};

const run = () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: ts-node --esm scripts/edgar-trim-from-inventory.ts <inventory.json>');
    process.exit(1);
  }

  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, 'utf8');
  const data = JSON.parse(raw) as InventoryFile;

  const fyEnd = data.fiscalYearEnd || DEFAULT_FY_END;
  const merged = mergeByBaseFrame((data.factsIndex || []).map(f => ({ ...f, fiscalYearEnd: fyEnd })).map(trimFrame));
  const withDerived = deriveQuarterIfMissing(merged);
  const withYtdFill = fillFromYtd(withDerived);
  const working = withYtdFill;

  // attach annual BS from latest instant in same fiscal year (fallback: latest instant overall)
  const instants = working.filter(f => f.bs && !f.pl && !f.cf);
  const annuals = working.filter(f => f.isAnnual);
  annuals.forEach(a => {
    if (a.bs) return;
    const fy = a.fiscalYear ?? (a.end ? new Date(a.end).getUTCFullYear() : null);
    let candidates = instants;
    if (fy) {
      candidates = instants.filter(i => (i.fiscalYear ?? (i.end ? new Date(i.end).getUTCFullYear() : null)) === fy);
    }
    if (!candidates.length) candidates = instants;
    if (candidates.length) {
      const pick = candidates.sort((x, y) => (y.end || '').localeCompare(x.end || ''))[0];
      a.bs = pick.bs;
    }
  });

  const trimmedFrames = mergeByFiscalFrame(working);

  const out = {
    ticker: data.ticker,
    frames: trimmedFrames
  };

  const outPath = abs.replace(/\.json$/, OUTPUT_SUFFIX);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Trimmed output written to ${outPath}`);
};

run();
