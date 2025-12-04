import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot,
  AreaChart,
  Area
} from 'recharts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  Shield, 
  Zap, 
  Clock, 
  FileText, 
  AlertTriangle, 
  TrendingUp,
  ChevronRight,
  Calendar,
  ArrowRight
} from 'lucide-react';

// --- MOCK DATA ---
const PRICE_DATA = [
  { date: '2024-06-01', price: 145 },
  { date: '2024-06-15', price: 152 },
  { date: '2024-07-01', price: 148 },
  { date: '2024-07-15', price: 155 },
  { date: '2024-08-01', price: 162 }, // Report 1: BUY
  { date: '2024-08-15', price: 158 },
  { date: '2024-09-01', price: 165 },
  { date: '2024-09-15', price: 172 }, // Report 2: HOLD (Price Target Hit)
  { date: '2024-10-01', price: 168 },
  { date: '2024-10-15', price: 160 }, // Alert: Volatility
  { date: '2024-11-01', price: 155 },
  { date: '2024-11-15', price: 148 }, // Report 3: BUY (Dip)
  { date: '2024-12-01', price: 158 },
];

const EVENTS = [
  {
    id: 1,
    date: '2024-11-15',
    type: 'REPORT',
    verdict: 'BUY',
    title: 'Oversold Opportunity',
    desc: 'Stock has corrected 15% despite strong fundamentals. Upgrade from HOLD.',
    changes: [
      { label: 'Verdict', from: 'HOLD', to: 'BUY', positive: true },
      { label: 'Target', from: '$180', to: '$195', positive: true }
    ]
  },
  {
    id: 2,
    date: '2024-10-15',
    type: 'ALERT',
    severity: 'HIGH',
    title: 'Volatility Warning',
    desc: 'Price dropped 5% on no news. Momentum score collapsed.',
    changes: [
      { label: 'Momentum', from: '85', to: '42', positive: false }
    ]
  },
  {
    id: 3,
    date: '2024-09-15',
    type: 'REPORT',
    verdict: 'HOLD',
    title: 'Price Target Reached',
    desc: 'Stock has rallied 20% since our initial call. Taking profits recommended.',
    changes: [
      { label: 'Verdict', from: 'BUY', to: 'HOLD', positive: false },
      { label: 'Valuation', from: 'Undervalued', to: 'Fair', positive: false }
    ]
  },
  {
    id: 4,
    date: '2024-08-01',
    type: 'REPORT',
    verdict: 'BUY',
    title: 'Initial Coverage',
    desc: 'Dominant market position with expanding margins. Strong moat.',
    changes: []
  }
];

const SPARK_DATA = [
  { val: 60 }, { val: 65 }, { val: 75 }, { val: 82 }, { val: 80 }, { val: 75 }, { val: 85 }
];

export const TickerCommandCenterMockup: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
      {/* --- HEADER --- */}
      <header className="flex justify-between items-end mb-8 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">MSFT</h1>
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 font-mono">NASDAQ</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-mono text-white">$158.42</span>
            <span className="flex items-center text-emerald-400 font-mono text-sm">
              <ArrowUpRight className="w-4 h-4 mr-1" /> +1.2% Today
            </span>
          </div>
        </div>
        <div className="flex gap-3">
           <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
             <Zap className="w-4 h-4" /> Run New Analysis
           </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        
        {/* --- LEFT COLUMN: CHART & STREAM (8 cols) --- */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* 1. HERO CHART */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" /> Price vs. Conviction
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> BUY</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> HOLD</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> SELL</span>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PRICE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    tick={{fontSize: 12}} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                  />
                  <YAxis stroke="#64748b" tick={{fontSize: 12}} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9'}}
                    itemStyle={{color: '#cbd5e1'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#6366f1" 
                    strokeWidth={2} 
                    dot={false} 
                    activeDot={{r: 6, fill: '#818cf8'}}
                  />
                  {/* Verdict Markers */}
                  <ReferenceDot x="2024-08-01" y={162} r={6} fill="#10b981" stroke="#fff" />
                  <ReferenceDot x="2024-09-15" y={172} r={6} fill="#f59e0b" stroke="#fff" />
                  <ReferenceDot x="2024-11-15" y={148} r={6} fill="#10b981" stroke="#fff" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. THESIS STREAM */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Narrative Arc
            </h3>
            <div className="relative border-l-2 border-slate-800 ml-3 space-y-8 pb-10">
              {EVENTS.map((event, idx) => (
                <div key={event.id} className="relative pl-8 group">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-slate-900 ${
                    event.type === 'ALERT' ? 'bg-red-500' : 
                    event.verdict === 'BUY' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></div>

                  {/* Card */}
                  <div 
                    className={`bg-slate-900 rounded-xl p-5 border transition-all cursor-pointer hover:border-indigo-500/50 hover:shadow-lg hover:translate-x-1 ${
                      selectedEventId === event.id ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-800'
                    }`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400">{event.date}</span>
                        {event.type === 'REPORT' && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            event.verdict === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {event.verdict}
                          </span>
                        )}
                        {event.type === 'ALERT' && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> ALERT
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
                    </div>

                    <h4 className="text-white font-medium text-lg mb-1">{event.title}</h4>
                    <p className="text-slate-400 text-sm mb-4">{event.desc}</p>

                    {/* Diffs */}
                    {event.changes.length > 0 && (
                      <div className="bg-slate-950/50 rounded-lg p-3 space-y-2">
                        {event.changes.map((change, i) => (
                          <div key={i} className="flex items-center text-sm font-mono">
                            <span className="text-slate-500 w-24">{change.label}:</span>
                            <span className="text-slate-400 line-through mr-2">{change.from}</span>
                            <ArrowRight className="w-3 h-3 text-slate-600 mr-2" />
                            <span className={change.positive ? 'text-emerald-400' : 'text-red-400'}>
                              {change.to}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* --- RIGHT COLUMN: SCORECARD (4 cols) --- */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Scorecard Widget */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 sticky top-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Live Scorecard</h3>
            
            <div className="space-y-8">
              {/* Metric 1 */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Moonshot Score
                  </span>
                  <span className="text-2xl font-bold text-white">85</span>
                </div>
                <div className="h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SPARK_DATA}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="val" stroke="#6366f1" fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Metric 2 */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" /> Moat Rating
                  </span>
                  <span className="text-xl font-bold text-white">A-</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[85%]"></div>
                </div>
              </div>

              {/* Metric 3 */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-slate-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" /> Growth
                  </span>
                  <span className="text-xl font-bold text-white">High</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-[70%]"></div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Recent Files</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-slate-300 hover:text-white cursor-pointer transition-colors">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>10-K Annual Report (2024)</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300 hover:text-white cursor-pointer transition-colors">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Q3 Earnings Transcript</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
