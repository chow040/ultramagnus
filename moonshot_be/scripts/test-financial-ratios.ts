import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBasicFinancials } from '../dist/clients/finnhub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

type NullableNumber = number | null;

const extractMetric = (metric: Record<string, unknown>, key: string): NullableNumber => {
  const val = metric[key];
  return typeof val === 'number' ? val : null;
};

const pickPeriod = (series: Record<string, any> | undefined): string | null => {
  if (!series) return null;
  const firstArr = Object.values(series)[0];
  if (Array.isArray(firstArr) && firstArr.length && typeof firstArr[0] === 'object') {
    return (firstArr[0] as { period?: string }).period ?? null;
  }
  return null;
};

const sliceSeries = (series: Record<string, any> | undefined) => {
  const out: Record<string, any> = {};
  if (!series) return out;
  Object.entries(series).forEach(([key, arr]) => {
    if (Array.isArray(arr)) {
      out[key] = arr.slice(0, 4);
    }
  });
  return out;
};

const buildCoreSignals = (metric: Record<string, unknown>) => {
  const get = (key: string) => extractMetric(metric, key);
  return {
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
};

const buildCoreSignalsQuarterly = (seriesQuarterly: Record<string, any>) => {
  const getArr = (key: string) => {
    const arr = seriesQuarterly[key];
    return Array.isArray(arr) ? arr : null;
  };
  const getVal = (key: string, idx: number) => {
    const arr = getArr(key);
    if (!arr || !arr[idx]) return null;
    const item = arr[idx] as { v?: number };
    return typeof item?.v === 'number' ? item.v : null;
  };
  const getPeriod = (idx: number) => {
    const base = getArr('assetTurnoverTTM') || Object.values(seriesQuarterly)[0];
    const item = base && (base as any[])[idx];
    return item?.period ?? null;
  };

  return Array.from({ length: 4 })
    .map((_, idx) => {
      const period = getPeriod(idx);
      if (!period) return null;
      return {
        period,
        businessQuality: {
          grossMarginTTM: getVal('grossMargin', idx),
          operatingMarginTTM: getVal('operatingMargin', idx),
          netMarginTTM: getVal('netMargin', idx),
          pretaxMarginTTM: getVal('pretaxMargin', idx),
          sgaToSale: getVal('sgaToSale', idx),
          assetTurnoverTTM: getVal('assetTurnoverTTM', idx),
          inventoryTurnoverTTM: getVal('inventoryTurnoverTTM', idx),
          receivablesTurnoverTTM: getVal('receivablesTurnoverTTM', idx),
          totalRatio: getVal('totalRatio', idx)
        },
        returns: {
          roaTTM: getVal('roaTTM', idx),
          roeTTM: getVal('roeTTM', idx),
          roicTTM: getVal('roicTTM', idx),
          rotcTTM: getVal('rotcTTM', idx)
        },
        growth: {
          revenueGrowthQuarterlyYoy: getVal('revenueGrowthQuarterlyYoy', idx),
          revenueGrowthTTMYoy: getVal('revenueGrowthTTMYoy', idx),
          epsGrowthQuarterlyYoy: getVal('epsGrowthQuarterlyYoy', idx),
          epsGrowthTTMYoy: getVal('epsGrowthTTMYoy', idx),
          revenueGrowth3Y: getVal('revenueGrowth3Y', idx),
          revenueGrowth5Y: getVal('revenueGrowth5Y', idx),
          epsGrowth3Y: getVal('epsGrowth3Y', idx),
          epsGrowth5Y: getVal('epsGrowth5Y', idx)
        },
        financialHealth: {
          cashRatio: getVal('cashRatio', idx),
          currentRatio: getVal('currentRatio', idx),
          quickRatio: getVal('quickRatio', idx),
          netDebtToEquity: getVal('netDebtToTotalEquity', idx),
          netDebtToCapital: getVal('netDebtToTotalCapital', idx),
          longTermDebtToAsset: getVal('longtermDebtTotalAsset', idx),
          longTermDebtToCapital: getVal('longtermDebtTotalCapital', idx),
          longTermDebtToEquity: getVal('longtermDebtTotalEquity', idx),
          totalDebtToEquity: getVal('totalDebtToEquity', idx),
          totalDebtToAsset: getVal('totalDebtToTotalAsset', idx),
          totalDebtToCapital: getVal('totalDebtToTotalCapital', idx),
          fcfMargin: getVal('fcfMargin', idx),
          dividendPayoutRatio: getVal('payoutRatioTTM', idx)
        },
        valuation: {
          peTTM: getVal('peTTM', idx),
          forwardPE: getVal('forwardPE', idx),
          evEbitdaTTM: getVal('evEbitdaTTM', idx),
          pfcfTTM: getVal('pfcfTTM', idx),
          pegTTM: getVal('pegTTM', idx),
          psTTM: getVal('psTTM', idx),
          pb: getVal('pb', idx),
          evTTM: getVal('ev', idx),
          evRevenueTTM: getVal('evRevenueTTM', idx),
          evEbitda: getVal('evEbitda', idx),
          evRevenue: getVal('evRevenue', idx)
        },
        perShare: {
          eps: getVal('eps', idx),
          epsTTM: getVal('epsTTM', idx),
          ebitPerShare: getVal('ebitPerShare', idx),
          salesPerShare: getVal('salesPerShare', idx),
          tangibleBookValue: getVal('tangibleBookValue', idx),
          ptbv: getVal('ptbv', idx)
        }
      };
    })
    .filter(Boolean);
};

const run = async () => {
  try {
    const symbol = process.argv[2] || 'AAPL';
    const data = await getBasicFinancials(symbol);
    const metric = (data?.metric as Record<string, unknown>) || {};
    const annualSeries = data?.series?.annual as Record<string, any> | undefined;
    const quarterlySeriesRaw = data?.series?.quarterly as Record<string, any> | undefined;

    const coreSignals = buildCoreSignals(metric);
    const coreSignalsQuarterly = buildCoreSignalsQuarterly(sliceSeries(quarterlySeriesRaw));

    const output = {
      symbol: data?.symbol ?? symbol,
      asOf: {
        annual: pickPeriod(annualSeries),
        quarterly: pickPeriod(quarterlySeriesRaw)
      },
      coreSignals,
      coreSignalsQuarterly
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error('Error fetching financial ratios:', err);
    process.exit(1);
  }
};

run();
