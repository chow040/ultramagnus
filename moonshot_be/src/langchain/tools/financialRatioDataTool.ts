import { getBasicFinancials } from '../../clients/finnhub.js';
import { logger } from '../../utils/logger.js';

type NullableNumber = number | null;

export interface CoreSignals {
  businessQuality: {
    grossMarginTTM: NullableNumber;
    operatingMarginTTM: NullableNumber;
    netMarginTTM: NullableNumber;
    pretaxMarginTTM: NullableNumber;
    sgaToSale: NullableNumber;
    assetTurnoverTTM: NullableNumber;
    inventoryTurnoverTTM: NullableNumber;
    receivablesTurnoverTTM: NullableNumber;
    totalRatio: NullableNumber;
  };
  returns: {
    roaTTM: NullableNumber;
    roeTTM: NullableNumber;
    roicTTM: NullableNumber;
    rotcTTM: NullableNumber;
  };
  growth: {
    revenueGrowthQuarterlyYoy: NullableNumber;
    revenueGrowthTTMYoy: NullableNumber;
    epsGrowthQuarterlyYoy: NullableNumber;
    epsGrowthTTMYoy: NullableNumber;
    revenueGrowth3Y: NullableNumber;
    revenueGrowth5Y: NullableNumber;
    epsGrowth3Y: NullableNumber;
    epsGrowth5Y: NullableNumber;
  };
  financialHealth: {
    cashRatio: NullableNumber;
    currentRatio: NullableNumber;
    quickRatio: NullableNumber;
    netDebtToEquity: NullableNumber;
    netDebtToCapital: NullableNumber;
    longTermDebtToAsset: NullableNumber;
    longTermDebtToCapital: NullableNumber;
    longTermDebtToEquity: NullableNumber;
    totalDebtToEquity: NullableNumber;
    totalDebtToAsset: NullableNumber;
    totalDebtToCapital: NullableNumber;
    fcfMargin: NullableNumber;
    dividendPayoutRatio: NullableNumber;
  };
  valuation: {
    peTTM: NullableNumber;
    forwardPE: NullableNumber;
    evEbitdaTTM: NullableNumber;
    pfcfTTM: NullableNumber;
    pegTTM: NullableNumber;
    psTTM: NullableNumber;
    pb: NullableNumber;
    evTTM: NullableNumber;
    evRevenueTTM: NullableNumber;
    evEbitda: NullableNumber;
    evRevenue: NullableNumber;
  };
  perShare: {
    eps: NullableNumber;
    epsTTM: NullableNumber;
    ebitPerShare: NullableNumber;
    salesPerShare: NullableNumber;
    tangibleBookValue: NullableNumber;
    ptbv: NullableNumber;
  };
}

export interface CoreSignalsQuarterly extends CoreSignals {
  period: string | null;
}

export interface FinancialRatioResult {
  symbol: string;
  asOf: {
    annual: string | null;
    quarterly: string | null;
  };
  coreSignals: CoreSignals;
  coreSignalsQuarterly: CoreSignalsQuarterly[];
}

const extractMetric = (metric: Record<string, unknown>, key: string): NullableNumber => {
  const val = metric[key];
  if (typeof val === 'number') return val;
  return null;
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

const buildCoreSignals = (metric: Record<string, unknown>): CoreSignals => {
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

const buildCoreSignalsQuarterly = (seriesQuarterly: Record<string, any>): CoreSignalsQuarterly[] => {
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
    .filter(Boolean) as CoreSignalsQuarterly[];
};

/**
 * Fetches core financial ratios/metrics and a four-quarter slice for LLM consumption.
 */
export async function fetchFinancialRatios(ticker: string): Promise<FinancialRatioResult> {
  if (!ticker || typeof ticker !== 'string') {
    throw new Error('Ticker symbol is required');
  }

  try {
    const data = await getBasicFinancials(ticker);
    const metric = (data?.metric as Record<string, unknown>) || {};
    const series = (data?.series as { annual?: Record<string, any>; quarterly?: Record<string, any> }) || {};
    const annualSeries = series.annual;
    const quarterlySeriesRaw = series.quarterly;

    const coreSignals = buildCoreSignals(metric);
    const coreSignalsQuarterly = buildCoreSignalsQuarterly(sliceSeries(quarterlySeriesRaw));

    return {
      symbol: (data as any)?.symbol ?? ticker,
      asOf: {
        annual: pickPeriod(annualSeries),
        quarterly: pickPeriod(quarterlySeriesRaw)
      },
      coreSignals,
      coreSignalsQuarterly
    };
  } catch (err) {
    logger.error({ message: 'finnhub.financial_ratios.fetch_failed', ticker, err });
    throw err;
  }
}
