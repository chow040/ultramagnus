import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  Info,
  Calculator,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import { EquityReport } from '../types';

interface FundamentalAssessmentProps {
  report?: EquityReport;
  sourceLabel?: string;
}

const parseCurrency = (value?: string) => {
  if (!value) return null;
  const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : null;
};

export const FundamentalAssessment: React.FC<FundamentalAssessmentProps> = ({ report, sourceLabel }) => {
  if (!report?.fundamentalAnalysis) return null;
  const analysis = useMemo(() => {
    const fa = report.fundamentalAnalysis as any;
    if (!fa) return null;

    const currentPrice =
      typeof fa.valuation?.currentPrice === 'number'
        ? fa.valuation.currentPrice
        : parseCurrency(report.currentPrice);
    const intrinsicValue =
      typeof fa.valuation?.intrinsicValue === 'number'
        ? fa.valuation.intrinsicValue
        : parseCurrency(report.priceTarget);
    const upsidePct =
      typeof fa.valuation?.upsidePct === 'number'
        ? Math.round(fa.valuation.upsidePct)
        : currentPrice != null && intrinsicValue != null && currentPrice !== 0
          ? Math.round(((intrinsicValue - currentPrice) / currentPrice) * 100)
          : null;

    const recommendation = {
      rating: fa.recommendation?.rating || report.verdict || 'HOLD',
      rationale:
        fa.recommendation?.rationale ||
        report.verdictReason ||
        report.rocketReason ||
        report.summary ||
        'No rationale provided.'
    };

    const inputs =
      Array.isArray(fa.valuation?.inputs) && fa.valuation.inputs.length
        ? fa.valuation.inputs
        : [];

    const thesisBullets =
      Array.isArray(fa.thesis?.bullets) && fa.thesis.bullets.length
        ? fa.thesis.bullets
        : report.summary
          ? report.summary.split('. ').filter(Boolean).slice(0, 3)
          : (report.shortTermFactors?.positive || []).map((f) => f.detail || f.title).slice(0, 3);

    const risks =
      Array.isArray(fa.risks) && fa.risks.length
        ? fa.risks
        : (report.shortTermFactors?.negative || [])
            .map((f) => f.detail || f.title)
            .filter(Boolean)
            .slice(0, 3) || [];

    return {
      schemaVersion: fa.schemaVersion || '1.0',
      method: fa.method || 'analyst_langgraph',
      recommendation,
      valuation: {
        currency: fa.valuation?.currency || 'USD',
        currentPrice,
        intrinsicValue,
        upsidePct,
        inputs,
        notes: fa.valuation?.notes || report.valuation || ''
      },
      thesis: { bullets: thesisBullets },
      risks: risks.length ? risks : ['No material risks captured.'],
      scores: {
        rocketScore: report.rocketScore,
        financialHealthScore: report.financialHealthScore,
        momentumScore: report.momentumScore,
        moatRating: report.moatAnalysis?.moatRating
      }
    };
  }, [report]);

  if (!analysis) return null;

  const isBuy = analysis.recommendation.rating === 'BUY';
  const isSell = analysis.recommendation.rating === 'SELL';

  const verdictColor = isBuy
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : isSell
    ? 'text-rose-600 bg-rose-50 border-rose-200'
    : 'text-amber-600 bg-amber-50 border-amber-200';

  const upsideColor =
    analysis.valuation.upsidePct != null && analysis.valuation.upsidePct > 0 ? 'text-emerald-600' : 'text-rose-600';

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8 font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Fundamental Assessment</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          v{analysis.schemaVersion} • {analysis.method.replace('_', ' ').toUpperCase()}
          {sourceLabel ? ` • ${sourceLabel}` : ''}
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Verdict & Valuation (The "Numbers") */}
        <div className="lg:col-span-4 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
          
          {/* Recommendation */}
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase mb-2">Recommendation</div>
            <div className={`inline-flex items-center px-3 py-1 rounded-md border ${verdictColor} mb-3`}>
              <span className="text-lg font-bold tracking-tight">{analysis.recommendation.rating}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {analysis.recommendation.rationale}
            </p>
          </div>

          {/* Intrinsic Value */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-500 uppercase mb-3">Valuation Model</div>
            <div className="flex items-baseline gap-4 mb-1">
              <div>
                <div className="text-3xl font-light text-slate-900 tracking-tight">
                  {analysis.valuation.intrinsicValue != null ? `$${analysis.valuation.intrinsicValue.toFixed(2)}` : 'N/A'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Intrinsic Value</div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-medium ${upsideColor} flex items-center`}>
                  {analysis.valuation.upsidePct != null && analysis.valuation.upsidePct > 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {analysis.valuation.upsidePct != null ? `${Math.abs(analysis.valuation.upsidePct)}%` : '—'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Upside / Downside</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>
                vs Current Price:{' '}
                <span className="font-medium text-slate-900">
                  {analysis.valuation.currentPrice != null ? `$${analysis.valuation.currentPrice.toFixed(2)}` : 'N/A'}
                </span>
              </span>
            </div>
          </div>

          {/* Inputs Table */}
          <div className="pt-4 border-t border-slate-100">
             <div className="text-xs font-medium text-slate-500 uppercase mb-3">Key Inputs</div>
             <div className="bg-slate-50 rounded border border-slate-100 overflow-hidden">
               <table className="w-full text-xs text-left">
                 <tbody>
                   {analysis.valuation.inputs.map((input: any, idx: number) => (
                     <tr key={idx} className="border-b border-slate-100 last:border-0">
                       <td className="px-3 py-2 text-slate-600 font-medium">{input.name}</td>
                       <td className="px-3 py-2 text-slate-900 text-right font-mono">
                         {input.value} <span className="text-slate-400 text-[10px]">{input.unit}</span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             {analysis.valuation.notes && (
               <p className="text-[10px] text-slate-400 mt-2 italic leading-tight">
                 "{analysis.valuation.notes}"
               </p>
             )}
          </div>

        </div>

        {/* Right Column: Thesis & Risks (The "Narrative") */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Investment Thesis */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900">Investment Thesis</h4>
            </div>
            <ul className="space-y-3">
              {analysis.thesis.bullets.map((bullet: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed group">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Risks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900">Key Risks</h4>
            </div>
            <ul className="space-y-3">
              {analysis.risks.map((risk: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed group">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
