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

    const metric = (data?.metric as Record<string, unknown>) || {};
    const get = (key: string) => (metric[key] as number | undefined) ?? null;

    // Try to capture representative period labels for context
    const pickPeriod = (obj: Record<string, unknown>) => {
      const first = Object.values(obj)[0];
      if (first && typeof first === 'object' && 'period' in (first as Record<string, unknown>)) {
        return (first as { period?: string }).period ?? null;
      }
      return null;
    };

    const sliceSeries = (series: unknown) => {
      const src = series as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      if (!src) return out;
      Object.entries(src).forEach(([key, arr]) => {
        if (Array.isArray(arr)) {
          out[key] = arr.slice(0, 4);
        }
      });
      return out;
    };

    const quarterlySeries = sliceSeries(data?.series?.quarterly);
    const getSeriesArr = (key: string) => {
      const arr = quarterlySeries[key];
      return Array.isArray(arr) ? arr : null;
    };
    const getSeriesVal = (key: string, idx: number) => {
      const arr = getSeriesArr(key);
      if (!arr || !arr[idx]) return null;
      const item = arr[idx] as { v?: number; period?: string };
      return typeof item?.v === 'number' ? item.v : null;
    };
    const getSeriesPeriod = (idx: number) => {
      // use assetTurnoverTTM as base, else first available series
      const base = getSeriesArr('assetTurnoverTTM') || Object.values(quarterlySeries)[0];
      const item = base && (base as any[])[idx];
      return item?.period ?? null;
    };

    const coreSignalsQuarterly = Array.from({ length: 4 }).map((_, idx) => ({
      period: getSeriesPeriod(idx),
      businessQuality: {
        grossMarginTTM: getSeriesVal('grossMargin', idx),
        operatingMarginTTM: getSeriesVal('operatingMargin', idx),
        netMarginTTM: getSeriesVal('netMargin', idx),
        pretaxMarginTTM: getSeriesVal('pretaxMargin', idx),
        sgaToSale: getSeriesVal('sgaToSale', idx),
        assetTurnoverTTM: getSeriesVal('assetTurnoverTTM', idx),
        inventoryTurnoverTTM: getSeriesVal('inventoryTurnoverTTM', idx),
        receivablesTurnoverTTM: getSeriesVal('receivablesTurnoverTTM', idx),
        totalRatio: getSeriesVal('totalRatio', idx)
      },
      returns: {
        roaTTM: getSeriesVal('roaTTM', idx),
        roeTTM: getSeriesVal('roeTTM', idx),
        roicTTM: getSeriesVal('roicTTM', idx),
        rotcTTM: getSeriesVal('rotcTTM', idx)
      },
      growth: {
        revenueGrowthQuarterlyYoy: getSeriesVal('revenueGrowthQuarterlyYoy', idx),
        revenueGrowthTTMYoy: getSeriesVal('revenueGrowthTTMYoy', idx),
        epsGrowthQuarterlyYoy: getSeriesVal('epsGrowthQuarterlyYoy', idx),
        epsGrowthTTMYoy: getSeriesVal('epsGrowthTTMYoy', idx),
        revenueGrowth3Y: getSeriesVal('revenueGrowth3Y', idx),
        revenueGrowth5Y: getSeriesVal('revenueGrowth5Y', idx),
        epsGrowth3Y: getSeriesVal('epsGrowth3Y', idx),
        epsGrowth5Y: getSeriesVal('epsGrowth5Y', idx)
      },
      financialHealth: {
        cashRatio: getSeriesVal('cashRatio', idx),
        currentRatio: getSeriesVal('currentRatio', idx),
        quickRatio: getSeriesVal('quickRatio', idx),
        netDebtToEquity: getSeriesVal('netDebtToTotalEquity', idx),
        netDebtToCapital: getSeriesVal('netDebtToTotalCapital', idx),
        longTermDebtToAsset: getSeriesVal('longtermDebtTotalAsset', idx),
        longTermDebtToCapital: getSeriesVal('longtermDebtTotalCapital', idx),
        longTermDebtToEquity: getSeriesVal('longtermDebtTotalEquity', idx),
        totalDebtToEquity: getSeriesVal('totalDebtToEquity', idx),
        totalDebtToAsset: getSeriesVal('totalDebtToTotalAsset', idx),
        totalDebtToCapital: getSeriesVal('totalDebtToTotalCapital', idx),
        fcfMargin: getSeriesVal('fcfMargin', idx),
        dividendPayoutRatio: getSeriesVal('payoutRatioTTM', idx)
      },
      valuation: {
        peTTM: getSeriesVal('peTTM', idx),
        forwardPE: getSeriesVal('forwardPE', idx),
        evEbitdaTTM: getSeriesVal('evEbitdaTTM', idx),
        pfcfTTM: getSeriesVal('pfcfTTM', idx),
        pegTTM: getSeriesVal('pegTTM', idx),
        psTTM: getSeriesVal('psTTM', idx),
        pb: getSeriesVal('pb', idx),
        evTTM: getSeriesVal('ev', idx),
        evRevenueTTM: getSeriesVal('evRevenueTTM', idx),
        evEbitda: getSeriesVal('evEbitda', idx),
        evRevenue: getSeriesVal('evRevenue', idx)
      },
      perShare: {
        eps: getSeriesVal('eps', idx),
        epsTTM: getSeriesVal('epsTTM', idx),
        ebitPerShare: getSeriesVal('ebitPerShare', idx),
        salesPerShare: getSeriesVal('salesPerShare', idx),
        tangibleBookValue: getSeriesVal('tangibleBookValue', idx),
        ptbv: getSeriesVal('ptbv', idx)
      }
    })).filter((row) => row.period);

    const coreSignals = {
      businessQuality: {
        grossMarginTTM: get('grossMarginTTM'),
        operatingMarginTTM: get('operatingMarginTTM'),
        netMarginTTM: get('netProfitMarginTTM'),
        pretaxMarginTTM: get('pretaxMarginTTM') ?? get('pretaxMargin'),
        sgaToSale: get('sgaToSale'),
        assetTurnoverTTM: get('assetTurnoverTTM'),
        inventoryTurnoverTTM: get('inventoryTurnoverTTM'),
        receivablesTurnoverTTM: get('receivablesTurnoverTTM'),
        totalRatio: get('totalRatio')
      },
      returns: {
        roaTTM: get('roaTTM') ?? get('roa'),
        roeTTM: get('roeTTM') ?? get('roe'),
        roicTTM: get('roicTTM') ?? get('roic'),
        rotcTTM: get('rotcTTM') ?? get('rotc')
      },
      growth: {
        revenueGrowthQuarterlyYoy: get('revenueGrowthQuarterlyYoy'),
        revenueGrowthTTMYoy: get('revenueGrowthTTMYoy'),
        epsGrowthQuarterlyYoy: get('epsGrowthQuarterlyYoy'),
        epsGrowthTTMYoy: get('epsGrowthTTMYoy'),
        revenueGrowth3Y: get('revenueGrowth3Y'),
        revenueGrowth5Y: get('revenueGrowth5Y'),
        epsGrowth3Y: get('epsGrowth3Y'),
        epsGrowth5Y: get('epsGrowth5Y')
      },
      financialHealth: {
        cashRatio: get('cashRatio'),
        currentRatio: get('currentRatioQuarterly') ?? get('currentRatioAnnual'),
        quickRatio: get('quickRatio'),
        netDebtToEquity: get('netDebtToTotalEquity'),
        netDebtToCapital: get('netDebtToTotalCapital'),
        longTermDebtToAsset: get('longTermDebt/totalAssetAnnual') ?? get('longTermDebtTotalAsset'),
        longTermDebtToCapital: get('longTermDebt/totalCapitalAnnual') ?? get('longTermDebtTotalCapital'),
        longTermDebtToEquity: get('longTermDebt/totalEquityAnnual') ?? get('longTermDebtTotalEquity'),
        totalDebtToEquity: get('totalDebt/totalEquityAnnual') ?? get('totalDebtToEquity'),
        totalDebtToAsset: get('totalDebt/totalAssetAnnual') ?? get('totalDebtToTotalAsset'),
        totalDebtToCapital: get('totalDebt/totalCapitalAnnual') ?? get('totalDebtToTotalCapital'),
        fcfMargin: get('fcfMargin'),
        dividendPayoutRatio: get('payoutRatioTTM') ?? get('payoutRatioAnnual')
      },
      valuation: {
        peTTM: get('peTTM'),
        forwardPE: get('forwardPE'),
        evEbitdaTTM: get('evEbitdaTTM'),
        pfcfTTM: get('pfcfTTM') ?? get('pfcfShareTTM') ?? get('pfcfShareAnnual'),
        pegTTM: get('pegTTM'),
        psTTM: get('psTTM'),
        pb: get('pb'),
        evTTM: get('enterpriseValue') ?? get('ev'),
        evRevenueTTM: get('evRevenueTTM'),
        evEbitda: get('evEbitda'),
        evRevenue: get('evRevenue')
      },
      perShare: {
        eps: get('eps'),
        epsTTM: get('epsTTM'),
        ebitPerShare: get('ebitPerShare'),
        salesPerShare: get('salesPerShare'),
        tangibleBookValue: get('tangibleBookValue'),
        ptbv: get('ptbv')
      }
    };

    const output = {
      symbol: data?.symbol,
      asOf: {
        annual: pickPeriod(latestAnnual),
        quarterly: pickPeriod(latestQuarterly)
      },
      coreSignals,
      coreSignalsQuarterly,
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error('Error fetching basic financials:', err);
    process.exit(1);
  }
};

run();
