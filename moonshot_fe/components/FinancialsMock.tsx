import React, { useEffect, useMemo, useState } from 'react';
import { fetchMarketData } from '../services/marketDataClient';

type StatementItem = { label: string; value: string };

type PeriodBlock = {
  period: string;
  date?: string;
  currency: string;
  ic: StatementItem[];
  bs: StatementItem[];
  cf: StatementItem[];
  ratios: StatementItem[];
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatPercent = (value?: number) => {
  if (value === undefined || value === null || isNaN(value)) return '—';
  return `${value >= 0 ? '' : '-'}${Math.abs(value).toFixed(1)}%`;
};

const findValue = (arr: any[] | undefined, concepts: string[], labels: string[]): number | undefined => {
  if (!Array.isArray(arr)) return undefined;
  for (const entry of arr) {
    if (concepts.includes(entry.concept)) return Number(entry.value);
    if (entry.label && labels.some((l) => entry.label.toLowerCase().includes(l.toLowerCase()))) {
      return Number(entry.value);
    }
  }
  return undefined;
};

const buildPeriodBlock = (report: any): PeriodBlock => {
  const bs = report?.report?.bs || [];
  const ic = report?.report?.ic || [];
  const cf = report?.report?.cf || [];
  const periodLabel = report?.year
    ? `${report.year}${report.quarter ? ` Q${report.quarter}` : ''}`
    : 'Latest';

  // Income Statement
  const revenue = findValue(ic, ['us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax'], ['Net sales', 'Revenue']);
  const cogs = findValue(ic, ['us-gaap_CostOfGoodsAndServicesSold'], ['Cost of sales']);
  const gross = findValue(ic, ['us-gaap_GrossProfit'], ['Gross margin']);
  const rnd = findValue(ic, ['us-gaap_ResearchAndDevelopmentExpense'], ['Research and development']);
  const sga = findValue(ic, ['us-gaap_SellingGeneralAndAdministrativeExpense'], ['Selling, general and administrative']);
  const opInc = findValue(ic, ['us-gaap_OperatingIncomeLoss'], ['Operating income']);
  const otherInc = findValue(ic, ['us-gaap_NonoperatingIncomeExpense'], ['Other income']);
  const pretax = findValue(ic, ['us-gaap_IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest'], ['Income before provision for income taxes']);
  const tax = findValue(ic, ['us-gaap_IncomeTaxExpenseBenefit'], ['Provision for income taxes']);
  const net = findValue(ic, ['us-gaap_NetIncomeLoss'], ['Net income']);
  const epsDil = findValue(ic, ['us-gaap_EarningsPerShareDiluted'], ['Diluted']);
  const sharesDil = findValue(ic, ['us-gaap_WeightedAverageNumberOfDilutedSharesOutstanding'], ['Diluted (in shares)']);

  // Balance Sheet
  const cash = findValue(bs, ['us-gaap_CashAndCashEquivalentsAtCarryingValue'], ['Cash and cash equivalents']);
  const msCurrent = findValue(bs, ['us-gaap_MarketableSecuritiesCurrent'], ['Marketable securities']);
  const msNoncurrent = findValue(bs, ['us-gaap_MarketableSecuritiesNoncurrent'], ['Marketable securities']);
  const ar = findValue(bs, ['us-gaap_AccountsReceivableNetCurrent'], ['Accounts receivable']);
  const arNontrade = findValue(bs, ['us-gaap_NontradeReceivablesCurrent'], ['Vendor non-trade receivables']);
  const inventory = findValue(bs, ['us-gaap_InventoryNet'], ['Inventories']);
  const otherCurrentAssets = findValue(bs, ['us-gaap_OtherAssetsCurrent'], ['Other current assets']);
  const totalCurrentAssets = findValue(bs, ['us-gaap_AssetsCurrent'], ['Total current assets']);
  const ppe = findValue(bs, ['us-gaap_PropertyPlantAndEquipmentNet'], ['Property, plant and equipment']);
  const otherNonCurrentAssets = findValue(bs, ['us-gaap_OtherAssetsNoncurrent'], ['Other non-current assets']);
  const totalNonCurrentAssets = findValue(bs, ['us-gaap_AssetsNoncurrent'], ['Total non-current assets']);
  const totalAssets = findValue(bs, ['us-gaap_Assets'], ['Total assets']);
  const ap = findValue(bs, ['us-gaap_AccountsPayableCurrent'], ['Accounts payable']);
  const otherCurrentLiab = findValue(bs, ['us-gaap_OtherLiabilitiesCurrent'], ['Other current liabilities']);
  const deferredRev = findValue(bs, ['us-gaap_ContractWithCustomerLiabilityCurrent'], ['Deferred revenue']);
  const shortDebt = findValue(bs, ['us-gaap_CommercialPaper', 'us-gaap_LongTermDebtCurrent'], ['Commercial paper', 'Term debt']);
  const totalCurrentLiab = findValue(bs, ['us-gaap_LiabilitiesCurrent'], ['Total current liabilities']);
  const longDebt = findValue(bs, ['us-gaap_LongTermDebtNoncurrent'], ['Term debt']);
  const otherNonCurrentLiab = findValue(bs, ['us-gaap_OtherLiabilitiesNoncurrent'], ['Other non-current liabilities']);
  const totalNonCurrentLiab = findValue(bs, ['us-gaap_LiabilitiesNoncurrent'], ['Total non-current liabilities']);
  const totalLiab = findValue(bs, ['us-gaap_Liabilities'], ['Total liabilities']);
  const equity = findValue(bs, ['us-gaap_StockholdersEquity'], ['Total shareholders’ equity']);

  // Cash Flow
  const cfNetIncome = net;
  const dAndA = findValue(cf, ['us-gaap_DepreciationDepletionAndAmortization'], ['Depreciation and amortization']);
  const sbc = findValue(cf, ['us-gaap_ShareBasedCompensation'], ['Share-based compensation']);
  const cfo = findValue(cf, ['us-gaap_NetCashProvidedByUsedInOperatingActivities'], ['Cash generated by operating activities', 'Cash provided by operating activities']);
  const capex = findValue(cf, ['us-gaap_PaymentsToAcquirePropertyPlantAndEquipment'], ['Payments for acquisition of property, plant and equipment']);
  const cfi = findValue(cf, ['us-gaap_NetCashProvidedByUsedInInvestingActivities'], ['Cash generated by investing activities']);
  const dividends = findValue(cf, ['us-gaap_PaymentsOfDividends'], ['Payments for dividends']);
  const buybacks = findValue(cf, ['us-gaap_PaymentsForRepurchaseOfCommonStock'], ['Repurchases of common stock']);
  const debtIssued = findValue(cf, ['us-gaap_ProceedsFromIssuanceOfLongTermDebt'], ['Proceeds from issuance of term debt']);
  const debtRepaid = findValue(cf, ['us-gaap_RepaymentsOfLongTermDebt'], ['Repayments of term debt']);
  const cff = findValue(cf, ['us-gaap_NetCashProvidedByUsedInFinancingActivities'], ['Cash used in financing activities']);
  const netChangeCash = findValue(cf, ['us-gaap_CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect'], ['Increase/(Decrease) in cash']);

  // Derived
  const grossMarginPct = revenue && gross ? (gross / revenue) * 100 : undefined;
  const opMarginPct = revenue && opInc ? (opInc / revenue) * 100 : undefined;
  const netMarginPct = revenue && net ? (net / revenue) * 100 : undefined;
  const currentRatio = totalCurrentAssets && totalCurrentLiab ? totalCurrentAssets / totalCurrentLiab : undefined;
  const netDebt = (longDebt || 0) + (shortDebt || 0) - (cash || 0);

  const incomeItems: StatementItem[] = [
    { label: 'Net Sales', value: formatCurrency(revenue) },
    { label: 'Cost of Sales', value: formatCurrency(cogs) },
    { label: 'Gross Margin', value: `${formatCurrency(gross)} (${formatPercent(grossMarginPct)})` },
    { label: 'R&D', value: formatCurrency(rnd) },
    { label: 'SG&A', value: formatCurrency(sga) },
    { label: 'Operating Income', value: formatCurrency(opInc) },
    { label: 'Other Income/(Expense)', value: formatCurrency(otherInc) },
    { label: 'Pretax Income', value: formatCurrency(pretax) },
    { label: 'Income Tax', value: formatCurrency(tax) },
    { label: 'Net Income', value: formatCurrency(net) },
    { label: 'EPS (Diluted)', value: epsDil !== undefined ? `$${epsDil.toFixed(2)}` : '—' },
    { label: 'Shares (Diluted)', value: sharesDil ? `${(sharesDil / 1e9).toFixed(2)}B` : '—' }
  ];

  const balanceItems: StatementItem[] = [
    { label: 'Cash & Equivalents', value: formatCurrency(cash) },
    { label: 'Marketable Securities', value: formatCurrency((msCurrent || 0) + (msNoncurrent || 0)) },
    { label: 'Accounts Receivable', value: formatCurrency((ar || 0) + (arNontrade || 0)) },
    { label: 'Inventory', value: formatCurrency(inventory) },
    { label: 'Other Current Assets', value: formatCurrency(otherCurrentAssets) },
    { label: 'Total Current Assets', value: formatCurrency(totalCurrentAssets) },
    { label: 'PP&E (Net)', value: formatCurrency(ppe) },
    { label: 'Other Non-Current Assets', value: formatCurrency(otherNonCurrentAssets) },
    { label: 'Total Non-Current Assets', value: formatCurrency(totalNonCurrentAssets) },
    { label: 'Total Assets', value: formatCurrency(totalAssets) },
    { label: 'Accounts Payable', value: formatCurrency(ap) },
    { label: 'Other Current Liabilities', value: formatCurrency(otherCurrentLiab) },
    { label: 'Deferred Revenue', value: formatCurrency(deferredRev) },
    { label: 'Short-Term Debt', value: formatCurrency(shortDebt) },
    { label: 'Total Current Liabilities', value: formatCurrency(totalCurrentLiab) },
    { label: 'Long-Term Debt', value: formatCurrency(longDebt) },
    { label: 'Other Non-Current Liabilities', value: formatCurrency(otherNonCurrentLiab) },
    { label: 'Total Non-Current Liabilities', value: formatCurrency(totalNonCurrentLiab) },
    { label: 'Total Liabilities', value: formatCurrency(totalLiab) },
    { label: 'Total Equity', value: formatCurrency(equity) },
    { label: 'Liabilities + Equity', value: formatCurrency(totalLiab && equity ? totalLiab + equity : totalAssets) }
  ];

  const cashflowItems: StatementItem[] = [
    { label: 'Net Income', value: formatCurrency(cfNetIncome) },
    { label: 'Depreciation & Amortization', value: formatCurrency(dAndA) },
    { label: 'Share-Based Comp', value: formatCurrency(sbc) },
    { label: 'Cash from Operations', value: formatCurrency(cfo) },
    { label: 'Capex', value: formatCurrency(capex ? -Math.abs(capex) : capex) },
    { label: 'Cash from Investing', value: formatCurrency(cfi) },
    { label: 'Dividends', value: formatCurrency(dividends ? -Math.abs(dividends) : dividends) },
    { label: 'Buybacks', value: formatCurrency(buybacks ? -Math.abs(buybacks) : buybacks) },
    { label: 'Debt Issuance', value: formatCurrency(debtIssued) },
    { label: 'Debt Repayment', value: formatCurrency(debtRepaid ? -Math.abs(debtRepaid) : debtRepaid) },
    { label: 'Cash from Financing', value: formatCurrency(cff) },
    { label: 'Net Change in Cash', value: formatCurrency(netChangeCash) }
  ];

  const ratios: StatementItem[] = [
    { label: 'Gross Margin', value: formatPercent(grossMarginPct) },
    { label: 'Operating Margin', value: formatPercent(opMarginPct) },
    { label: 'Net Margin', value: formatPercent(netMarginPct) },
    { label: 'Current Ratio', value: currentRatio ? `${currentRatio.toFixed(2)}x` : '—' },
    { label: 'Net Debt', value: formatCurrency(netDebt) },
    { label: 'FCF / Share', value: '—' },
    { label: 'ROE', value: '—' },
    { label: 'ROIC', value: '—' }
  ];

  return {
    period: periodLabel,
    date: report?.filedDate ? `Filed: ${new Date(report.filedDate).toLocaleDateString()}` : undefined,
    currency: report?.report?.currency || 'USD',
    ic: incomeItems,
    bs: balanceItems,
    cf: cashflowItems,
    ratios
  };
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string; note?: string }> = ({ title, children, className = '', note }) => (
  <div className={`bg-[#f8f8f8] border border-[#e4e4e4] rounded-md p-6 flex flex-col gap-4 ${className}`}>
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-semibold tracking-wide text-[#222] uppercase">{title}</h3>
      {note && <span className="text-[11px] text-[#666]">{note}</span>}
    </div>
    {children}
  </div>
);

const StatementTable: React.FC<{ items: StatementItem[] }> = ({ items }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
    {items.map((item) => (
      <div key={item.label} className="flex justify-between items-start gap-2 border-b border-[#ededed] pb-2">
        <div className="text-sm text-[#333]">{item.label}</div>
        <div className="text-sm font-mono text-right text-[#111]">{item.value}</div>
      </div>
    ))}
  </div>
);

const Pill: React.FC<{ active?: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-sm rounded-full border transition-colors ${active ? 'border-[#1f7a5c] text-[#1f7a5c] bg-[#e7f4ef]' : 'border-[#e4e4e4] text-[#555] hover:border-[#bbb]'}`}
  >
    {label}
  </button>
);

const FinancialsMock: React.FC = () => {
  const [periods, setPeriods] = useState<PeriodBlock[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basicMetrics, setBasicMetrics] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchMarketData('AAPL', 'quarterly');
        const reports = res?.financials?.data || [];
        const blocks = reports.slice(0, 4).map(buildPeriodBlock);
        setPeriods(blocks);
        setActiveIdx(0);
        setBasicMetrics(res?.metrics?.metric || {});
      } catch (err: any) {
        setError(err?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const periodChips = useMemo(
    () => periods.map((p, idx) => ({ label: p.period, idx })),
    [periods]
  );

  const period = periods[activeIdx];

  const metricEntries = useMemo(() => {
    return Object.entries(basicMetrics || {}).sort(([a], [b]) => a.localeCompare(b));
  }, [basicMetrics]);

  return (
    <div className="min-h-screen bg-[#f3f3f3] text-[#111]">
      <header className="border-b border-[#e4e4e4] bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold tracking-wide text-[#333] uppercase">Ultramagnus</div>
          <div className="text-lg font-semibold text-[#111]">Financials</div>
          <div className="text-xs text-[#666]">Live: Finnhub (AAPL)</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading && <div className="text-sm text-[#555]">Loading financials...</div>}
        {error && <div className="text-sm text-red-600">Error: {error}</div>}
        {!loading && !error && period && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {periodChips.map((chip) => (
                <Pill key={chip.label} label={chip.label} active={chip.idx === activeIdx} onClick={() => setActiveIdx(chip.idx)} />
              ))}
            </div>

            <Card title={`Snapshot — ${period.period}`} note={period.date}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {period.ratios.slice(0, 4).map((r) => (
                  <div key={r.label} className="bg-white border border-[#e4e4e4] rounded-sm px-3 py-3 flex flex-col gap-1">
                    <div className="text-[11px] text-[#666] uppercase tracking-wide">{r.label}</div>
                    <div className="text-base font-mono text-[#111]">{r.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Income Statement" note={period.currency}>
                <StatementTable items={period.ic} />
              </Card>
              <Card title="Balance Sheet" note={period.currency}>
                <StatementTable items={period.bs} />
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Cash Flow" note={period.currency}>
                <StatementTable items={period.cf} />
              </Card>
          <Card title="Key Ratios" note="Latest period">
            <StatementTable items={period.ratios} />
          </Card>
        </div>

        {metricEntries.length > 0 && (
          <Card title="Basic Financials (snapshot)" note="Finnhub metric block">
            <div className="max-h-[320px] overflow-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                {metricEntries.map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start gap-2 border-b border-[#ededed] pb-1">
                    <div className="text-[11px] text-[#444] break-all">{key}</div>
                    <div className="text-[11px] font-mono text-right text-[#111]">{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <div className="text-xs text-[#777]">Source: Financials As Reported (Finnhub). Layout inspired by Rams principles: minimal, clear, functional.</div>
      </>
    )}
  </main>
</div>
  );
};

export default FinancialsMock;
