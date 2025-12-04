
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SavedReportItem, UserProfile, AnalysisSession, EquityReport } from '../types';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Database, 
  X, 
  Loader2, 
  Activity, 
  Zap, 
  Globe, 
  Clock,
  ArrowRight,
  Crown,
  Folder,
  Satellite,
  CheckCircle,
  AlertOctagon,
  Play,
  Trash2,
  Minus,
  Bookmark,
  Rocket,
  Filter,
  LayoutGrid,
  List,
  Layers,
  Bell,
  Calendar,
  MousePointer2
} from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  reportLibrary: SavedReportItem[];
  hasMoreReports?: boolean;
  hasMoreBookmarks?: boolean;
  onLoadMoreReports?: () => void;
  onLoadMoreBookmarks?: () => void;
  isLoadingReportsPage?: boolean;
  isLoadingBookmarksPage?: boolean;
  onSearch: (e?: React.FormEvent, ticker?: string) => void;
  onLoadReport: (item: SavedReportItem) => void;
  onDeleteReport: (ticker: string, e: React.MouseEvent) => void;
  tickerInput: string;
  onTickerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suggestions: {symbol: string, name: string}[];
  showSuggestions: boolean;
  onSelectSuggestion: (symbol: string) => void;
  setShowSuggestions: (show: boolean) => void;
  onViewSample: () => void;
  analysisSessions: AnalysisSession[];
  onViewAnalyzedReport: (id: string) => void;
  onCancelAnalysis: (id: string) => void;
}

interface LibraryCardProps {
  session?: AnalysisSession;
  savedItem?: SavedReportItem;
  onClick: () => void;
  onAction: (e: React.MouseEvent) => void;
  viewMode?: 'GRID' | 'LIST';
}

type FilterType = 'ALL' | 'BOOKMARKED' | 'BULLISH' | 'HIGH_SCORE';

// --- SIDEBAR COMPONENT ---
const DashboardSidebar = ({ library, sessions }: { library: SavedReportItem[], sessions: AnalysisSession[] }) => {
    // Mock Data for "Market Radar" - In a real app, this would come from an API
    const alerts = [
        { title: "CPI Data Release", time: "Tomorrow, 8:30 AM", type: "high", icon: <Activity className="w-3 h-3 text-red-400" /> },
        { title: "Tech Sector Earnings", time: "This Week", type: "med", icon: <TrendingUp className="w-3 h-3 text-indigo-400" /> },
        { title: "Fed Chair Speech", time: "Friday, 2:00 PM", type: "high", icon: <Bell className="w-3 h-3 text-amber-400" /> }
    ];

    // Combine Sessions and Library for Activity Feed
    const activityItems = [
        ...sessions.map(s => ({
            type: 'ANALYSIS',
            ticker: s.ticker,
            time: Date.now(), // Active now
            status: s.status
        })),
        ...library.map(l => ({
            type: 'REPORT',
            ticker: l.ticker,
            time: l.addedAt,
            status: 'COMPLETED'
        }))
    ].sort((a, b) => b.time - a.time).slice(0, 6);

    return (
        <div className="space-y-6 animate-fade-in delay-100">
             {/* Market Radar */}
             <div className="bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">Market Radar</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                        </span>
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">LIVE</span>
                    </div>
                </div>
                <div className="divide-y divide-white/5">
                    {alerts.map((alert, i) => (
                        <div key={i} className="p-4 hover:bg-white/5 transition-colors group cursor-default">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{alert.title}</span>
                                {alert.type === 'high' && <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                {alert.icon} {alert.time}
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* Recent Activity */}
             <div className="bg-surface rounded-xl border border-white/5 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-slate-900/50">
                    <HistoryIcon className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                </div>
                <div className="p-4 space-y-5">
                    {activityItems.length > 0 ? activityItems.map((item, i) => (
                        <div key={i} className="flex gap-3 relative">
                            <div className="mt-1.5 flex-shrink-0">
                                <div className={`w-2 h-2 rounded-full ring-2 ring-slate-900 ${item.type === 'ANALYSIS' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-600'}`}></div>
                            </div>
                            {/* Vertical Connector Line */}
                            {i !== activityItems.length - 1 && (
                                <div className="absolute top-3.5 left-[3px] w-px h-full bg-slate-800 -z-10"></div>
                            )}
                            <div>
                                <div className="text-xs text-slate-300">
                                    {item.type === 'ANALYSIS' ? 'Analyzing ' : 'Report generated for '} 
                                    <span className="font-bold text-white font-mono">{item.ticker}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                    {item.type === 'ANALYSIS' ? 'Processing...' : new Date(item.time).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-xs text-slate-500 italic text-center py-2">No recent activity</div>
                    )}
                </div>
             </div>
             
             {/* Quick Tip */}
             <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl border border-indigo-500/20 p-4">
                <div className="flex items-start gap-3">
                   <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                      <Zap className="w-4 h-4" />
                   </div>
                   <div>
                      <h4 className="text-xs font-bold text-white mb-1">Pro Tip</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                         Look for the <Rocket className="w-3 h-3 inline mx-0.5 text-indigo-400"/> icon. Scores above 80 indicate strong moonshot potential.
                      </p>
                   </div>
                </div>
             </div>
        </div>
    )
}

// Simple History Icon component since it wasn't imported
const HistoryIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/><path d="M12 7v5l4 2"/></svg>
);


// Unified Card Component for Grid
const LibraryCard: React.FC<LibraryCardProps> = ({
  session,
  savedItem,
  onClick,
  onAction,
  viewMode = 'GRID'
}) => {
  const isSession = !!session;
  const status = session ? session.status : 'SAVED';

  // --- PROCESSING STATE ---
  if (status === 'PROCESSING' && session) {
    if (viewMode === 'LIST') {
        return (
            <div className="bg-slate-900 rounded-xl p-4 border border-indigo-500/30 relative overflow-hidden flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-display font-bold text-white">{session.ticker}</span>
                        <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                    </div>
                    <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden border border-white/5 hidden md:block">
                        <div className="h-full bg-indigo-500 relative" style={{ width: `${session.progress}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono hidden md:block">{session.phase}</span>
                </div>
                <button 
                    onClick={onAction} 
                    className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }
    return (
      <div className="bg-slate-900 rounded-2xl p-5 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)] relative overflow-hidden h-full min-h-[160px] flex flex-col justify-between animate-fade-in-up group">
        {/* Background Animation */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div>
             <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-display font-bold text-white tracking-tight">{session.ticker}</span>
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
             </div>
             <div className="text-[10px] text-indigo-300 font-medium animate-pulse uppercase tracking-wider flex items-center gap-1">
                <Satellite className="w-3 h-3" /> Analyzing...
             </div>
          </div>
          <button 
             onClick={onAction}
             className="text-slate-600 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
             title="Cancel Analysis"
          >
             <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 space-y-3 mt-4">
           {/* Progress Bar */}
           <div className="space-y-1.5">
              <div className="flex justify-between items-end text-[10px]">
                  <span className="text-slate-400 font-mono truncate max-w-[70%]">{session.phase}</span>
                  <span className="text-white font-mono font-bold">{Math.round(session.progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 relative"
                    style={{ width: `${session.progress}%` }}
                  >
                      <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite]"></div>
                  </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (status === 'ERROR' && session) {
     if (viewMode === 'LIST') {
        return (
            <div className="bg-slate-900 rounded-xl p-4 border border-red-500/30 flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-display font-bold text-white">{session.ticker}</span>
                    <span className="text-xs text-red-400 font-bold uppercase">Analysis Failed</span>
                </div>
                <button onClick={onAction}><X className="w-4 h-4 text-red-400" /></button>
            </div>
        );
     }
     return (
        <div className="bg-slate-900 rounded-2xl p-5 border border-red-500/30 relative overflow-hidden h-full min-h-[160px] flex flex-col justify-between animate-fade-in-up">
           <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                 <span className="text-xl font-display font-bold text-white">{session.ticker}</span>
                 <AlertOctagon className="w-4 h-4 text-red-400" />
              </div>
              <button onClick={onAction}><X className="w-4 h-4 text-red-400 hover:text-white" /></button>
           </div>
           <div>
              <div className="text-xs text-red-300 mb-1 font-bold uppercase tracking-wide">Analysis Failed</div>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{session.error || 'Connection interrupted. Please try again.'}</p>
           </div>
        </div>
     );
  }

  // --- READY / SAVED STATE ---
  let displayData;
  if (isSession && session?.result) {
     displayData = {
        ticker: session.result.ticker,
        name: session.result.companyName,
        price: session.result.currentPrice,
        change: session.result.priceChange ?? '',
        verdict: session.result.verdict,
        rocketScore: session.result.rocketScore,
        marketCap: session.result.marketCap,
        priceTarget: session.result.priceTarget,
        reportDate: session.result.reportDate,
        isBookmarked: false,
        isNew: true
     };
  } else if (savedItem) {
     displayData = {
        ticker: savedItem.ticker,
        name: savedItem.companyName,
        price: savedItem.currentPrice,
        change: savedItem.priceChange ?? '',
        verdict: savedItem.verdict,
        rocketScore: savedItem.fullReport?.rocketScore ?? savedItem.rocketScore,
        marketCap: savedItem.fullReport?.marketCap,
        priceTarget: savedItem.fullReport?.priceTarget ?? savedItem.priceTarget,
        reportDate: savedItem.fullReport?.reportDate || new Date(savedItem.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isBookmarked: savedItem.isBookmarked,
        isNew: false
     };
  } else {
     return null;
  }

  const isPriceUp = (displayData.change || '').startsWith('+');
  const verdictColor = displayData.verdict === 'BUY' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
    : displayData.verdict === 'SELL' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
    : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

  // Calculate Upside if possible
  let upside = "N/A";
  let upsideVal = 0;
  if (displayData.price && displayData.priceTarget) {
      const current = parseFloat(displayData.price.replace(/[^0-9.]/g, ''));
      const target = parseFloat(displayData.priceTarget.replace(/[^0-9.]/g, ''));
      if (!isNaN(current) && !isNaN(target) && current > 0) {
          upsideVal = ((target - current) / current) * 100;
          upside = (upsideVal > 0 ? '+' : '') + upsideVal.toFixed(1) + '%';
      }
  }

  if (viewMode === 'LIST') {
      return (
        <div 
          onClick={onClick}
          className={`
            bg-surface rounded-xl p-4 border 
            ${displayData.isNew 
               ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
               : displayData.isBookmarked
                 ? 'border-indigo-500/40 bg-indigo-950/10'
                 : 'border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/80'
            }
            transition-all cursor-pointer group relative flex items-center justify-between animate-fade-in-up hover:-translate-y-0.5 hover:shadow-lg gap-4
          `}
        >
           {/* Left: Identity */}
           <div className="flex items-center gap-4 min-w-[180px]">
               <div>
                  <div className="flex items-center gap-2">
                     <span className="font-display font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{displayData.ticker}</span>
                     {displayData.isBookmarked && <Bookmark className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[180px] flex items-center gap-2">
                    <span className="truncate">{displayData.name}</span>
                    {displayData.reportDate && (
                      <span className="text-[10px] text-slate-500 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {displayData.reportDate}
                      </span>
                    )}
                  </div>
               </div>
               {displayData.isNew && <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/20">New</span>}
           </div>

           {/* Middle: Performance Snapshot */}
           <div className="hidden sm:flex items-center gap-8 flex-1 justify-center">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entry</span>
                    <span className="font-mono font-bold text-white">{displayData.price}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target</span>
                    <span className="font-mono font-bold text-indigo-300">{displayData.priceTarget || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Upside</span>
                    <span className={`font-mono font-bold ${upsideVal > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{upside}</span>
                </div>
                
                <div className={`ml-4 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${verdictColor} min-w-[60px] text-center`}>
                    {displayData.verdict}
                </div>
           </div>

           {/* Right: Score & Actions */}
           <div className="flex items-center gap-3">
                {displayData.rocketScore !== undefined && (
                    <div className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-white/5" title="Moonshot Score">
                        <Rocket className={`w-3.5 h-3.5 ${displayData.rocketScore >= 80 ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span className={`text-sm font-mono font-bold ${displayData.rocketScore >= 80 ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {displayData.rocketScore}
                        </span>
                    </div>
                )}
                
                {!displayData.isNew && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAction(e); }}
                        className="text-slate-600 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from Library"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
           </div>
        </div>
      );
  }

  return (
    <div 
      onClick={onClick}
      className={`
        bg-surface rounded-2xl p-5 border 
        ${displayData.isNew 
           ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
           : displayData.isBookmarked
             ? 'border-indigo-500/40 bg-indigo-950/10'
             : 'border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/80'
        }
        transition-all cursor-pointer group relative h-full flex flex-col justify-between animate-fade-in-up hover:-translate-y-1 hover:shadow-xl
      `}
    >
       {/* New Label */}
       {displayData.isNew && (
          <div className="absolute top-0 right-0">
             <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wider shadow-lg shadow-emerald-500/20">
                New
             </span>
          </div>
       )}

       {/* Header */}
      <div className="flex justify-between items-start mb-4">
         <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
               <div className="font-display font-bold text-xl text-white group-hover:text-indigo-400 transition-colors truncate">
                  {displayData.ticker}
               </div>
               {displayData.isBookmarked && (
                 <Bookmark className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
               )}
            </div>
            <div className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-2">
              <span className="truncate">{displayData.name}</span>
              {displayData.reportDate && (
                <span className="text-[10px] text-slate-500 whitespace-nowrap flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {displayData.reportDate}
                </span>
              )}
            </div>
         </div>
          {!displayData.isNew && (
            <button 
                onClick={(e) => { e.stopPropagation(); onAction(e); }}
                className="text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors z-10 -mr-2 -mt-2 opacity-0 group-hover:opacity-100"
                title="Remove from Library"
            >
                <Trash2 className="w-4 h-4" />
            </button>
          )}
       </div>
       
       {/* Performance Snapshot Grid */}
       <div className="space-y-4">
           <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/30 rounded-lg p-2 border border-white/5">
               <div>
                   <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entry</div>
                   <div className="font-mono font-bold text-white text-sm">{displayData.price}</div>
               </div>
               <div className="border-x border-white/5">
                   <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target</div>
                   <div className="font-mono font-bold text-indigo-300 text-sm">{displayData.priceTarget || 'N/A'}</div>
               </div>
               <div>
                   <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Upside</div>
                   <div className={`font-mono font-bold text-sm ${upsideVal > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{upside}</div>
               </div>
           </div>

           <div className="h-px bg-white/5 w-full"></div>
           
           {/* Details Row */}
           <div className="flex items-center justify-between gap-2">
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${verdictColor}`}>
                    {displayData.verdict}
                </div>

                {displayData.rocketScore !== undefined && (
                    <div className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-lg border border-white/5" title="Moonshot Score">
                        <Rocket className={`w-3 h-3 ${displayData.rocketScore >= 80 ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span className={`text-xs font-mono font-bold ${displayData.rocketScore >= 80 ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {displayData.rocketScore}
                        </span>
                    </div>
                )}
                
                {displayData.marketCap && (
                    <div className="text-[10px] text-slate-500 font-mono">
                        {displayData.marketCap}
                    </div>
                )}
           </div>
       </div>
    </div>
  );
};


const Dashboard: React.FC<DashboardProps> = ({
  user,
  reportLibrary,
  onSearch,
  onLoadReport,
  onDeleteReport,
  hasMoreReports,
  hasMoreBookmarks,
  onLoadMoreReports,
  onLoadMoreBookmarks,
  isLoadingReportsPage,
  isLoadingBookmarksPage,
  tickerInput,
  onTickerChange,
  suggestions,
  showSuggestions,
  onSelectSuggestion,
  setShowSuggestions,
  onViewSample,
  analysisSessions,
  onViewAnalyzedReport,
  onCancelAnalysis
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [view, setView] = useState<'GRID' | 'LIST'>('GRID');
  const marketStatus = useMemo(() => Math.random() > 0.5 ? 'volatile' : 'trending up', []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter Logic
  const filteredLibrary = useMemo(() => {
      // Logic: Only hide library items that have active sessions IF we are in the ALL view (where sessions are shown)
      // Otherwise (in filtered views like BOOKMARKED), we want to show the library items because sessions aren't displayed there.
      
      let items = filter === 'ALL'
        ? reportLibrary.filter(item => !analysisSessions.some(session => session.ticker === item.ticker))
        : reportLibrary;

      switch (filter) {
        case 'BOOKMARKED':
          return items.filter(i => i.isBookmarked);
        case 'BULLISH':
          return items.filter(i => i.verdict === 'BUY');
        case 'HIGH_SCORE':
          return items.filter(i => {
            const score = i.fullReport?.rocketScore ?? i.rocketScore ?? 0;
            return score >= 80;
          });
        default:
          return items;
      }
  }, [reportLibrary, analysisSessions, filter]);

  const totalItems = filteredLibrary.length + (filter === 'ALL' ? analysisSessions.length : 0);
  const bookmarkedCount = reportLibrary.filter(i => i.isBookmarked).length;
  const reportsGenerated = reportLibrary.length;
  const bullishCount = reportLibrary.filter(r => r.verdict === 'BUY').length;
  
  // Avg Score Calculation
  const validScores = reportLibrary
      .map(r => r.fullReport?.rocketScore ?? r.rocketScore)
      .filter((s): s is number => s !== undefined);
  const avgScore = validScores.length > 0 
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) 
      : 0;

  // Reusable Interactive Stat Card Component
  const StatFilterCard = ({ 
    active, 
    onClick, 
    icon, 
    label, 
    value, 
    colorClass
  }: { 
    active: boolean, 
    onClick: () => void, 
    icon: React.ReactNode, 
    label: string, 
    value: React.ReactNode, 
    colorClass: string
  }) => (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl p-4 border h-24 flex flex-col justify-between cursor-pointer transition-all duration-300 group backdrop-blur-md
        ${active 
          ? `bg-slate-800/80 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/10` 
          : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/60 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
        }
      `}
    >
        <div className={`absolute top-0 right-0 p-3 transition-all duration-500 ${active ? 'opacity-20 scale-110' : 'opacity-5 group-hover:opacity-20 group-hover:scale-110 group-hover:-rotate-12'}`}>
          <div className={`transform ${colorClass}`}>
             {icon}
          </div>
        </div>
        
        <div className={`text-[10px] font-bold uppercase tracking-widest z-10 transition-colors ${active ? 'text-indigo-300' : 'text-slate-500 group-hover:text-indigo-300'}`}>
           {label}
        </div>
        
        <div className={`text-3xl font-mono font-bold z-10 ${colorClass} drop-shadow-sm`}>
           {value}
        </div>
        
        {active && (
           <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x"></div>
        )}
    </div>
  );

  return (
    <div className="animate-fade-in w-full pb-20">
      
      {/* 1. Header & Search Section */}
      <div className="relative mb-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                 <Crown className="w-3 h-3" /> {user.tier} Plan
              </span>
              <span className="h-1 w-1 bg-slate-600 rounded-full"></span>
              <span className="text-xs text-slate-500 font-mono">{new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{user.name.split(' ')[0]}</span>.
            </h2>
            <p className="text-slate-400 mt-2 max-w-xl text-lg font-light">
              Ready to find the next moonshot? Markets are {marketStatus} today.
            </p>
          </div>

          {/* Quick Market Stats (Top Right) */}
          <div className="flex gap-3 relative z-10 hidden lg:flex">
             <div className="bg-surface/50 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex flex-col items-end min-w-[100px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">S&P 500</span>
                <span className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1">
                   +0.45% <TrendingUp className="w-3 h-3" />
                </span>
             </div>
             <div className="bg-surface/50 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex flex-col items-end min-w-[100px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">NASDAQ</span>
                <span className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1">
                   +1.12% <TrendingUp className="w-3 h-3" />
                </span>
             </div>
             <div className="bg-surface/50 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex flex-col items-end min-w-[100px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">VIX</span>
                <span className="text-sm font-mono font-bold text-rose-400 flex items-center gap-1">
                   +2.4% <Activity className="w-3 h-3" />
                </span>
             </div>
          </div>
        </div>

        {/* Search Bar - Hero Style */}
        <div className="w-full max-w-4xl relative z-20">
          <form onSubmit={(e) => onSearch(e)} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500 group-hover:duration-200"></div>
              <div className="relative" ref={dropdownRef}>
                <div className="relative flex items-center bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
                  <div className="pl-6 text-slate-500">
                    <Search className="w-6 h-6" />
                  </div>
                  <input
                    type="text"
                    value={tickerInput}
                    onChange={onTickerChange}
                    onFocus={() => { if(tickerInput) setShowSuggestions(true); }}
                    placeholder="ENTER TICKER SYMBOL (e.g. NVDA, PLTR)..."
                    className="w-full bg-transparent px-4 py-6 text-xl text-white placeholder-slate-600 focus:outline-none font-mono uppercase tracking-wider"
                    autoComplete="off"
                  />
                  <div className="pr-2">
                    <button
                        type="submit"
                        disabled={!tickerInput}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 text-sm tracking-wide shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105"
                    >
                        INITIATE <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50 animate-fade-in-up">
                    <ul>
                      {suggestions.map((stock) => (
                        <li 
                          key={stock.symbol}
                          onClick={() => onSelectSuggestion(stock.symbol)}
                          className="px-5 py-3 hover:bg-slate-800 cursor-pointer border-b border-white/5 last:border-0 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-lg text-white group-hover:text-indigo-400 transition-colors w-16">{stock.symbol}</span>
                            <span className="text-sm text-slate-400 group-hover:text-slate-300">{stock.name}</span>
                          </div>
                          <TrendingUp className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
          </form>
          
          <div className="mt-4 flex flex-wrap items-center gap-4">
             <button 
                onClick={onViewSample}
                className="text-xs font-bold text-slate-500 hover:text-indigo-400 flex items-center gap-2 transition-colors bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5 hover:border-indigo-500/30"
             >
                <Zap className="w-3 h-3" /> Load Sample Report
             </button>
             <div className="text-[10px] text-slate-600 font-mono uppercase">
                Trending: <span className="text-slate-400 hover:text-white cursor-pointer transition-colors mx-1" onClick={() => onSearch(undefined, 'NVDA')}>NVDA</span>
                <span className="text-slate-400 hover:text-white cursor-pointer transition-colors mx-1" onClick={() => onSearch(undefined, 'TSLA')}>TSLA</span>
                <span className="text-slate-400 hover:text-white cursor-pointer transition-colors mx-1" onClick={() => onSearch(undefined, 'PLTR')}>PLTR</span>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Quick Filter Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatFilterCard 
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
            label="Reports Generated"
            value={reportsGenerated}
            icon={<Database className="w-12 h-12" />}
            colorClass="text-white"
          />
          <StatFilterCard 
            active={filter === 'BOOKMARKED'}
            onClick={() => setFilter('BOOKMARKED')}
            label="Bookmarked"
            value={bookmarkedCount}
            icon={<Bookmark className="w-12 h-12" />}
            colorClass="text-purple-400"
          />
          <StatFilterCard 
            active={filter === 'BULLISH'}
            onClick={() => setFilter('BULLISH')}
            label="Bullish Finds"
            value={bullishCount}
            icon={<Rocket className="w-12 h-12" />}
            colorClass="text-emerald-400"
          />
          <StatFilterCard 
            active={filter === 'HIGH_SCORE'}
            onClick={() => setFilter('HIGH_SCORE')}
            label="Avg Moonshot Score"
            value={avgScore}
            icon={<Activity className="w-12 h-12" />}
            colorClass="text-amber-400"
          />
      </div>

      {/* 3. Main Content Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LEFT COLUMN: Report Library (Takes 3/4 width on desktop) */}
        <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-400" /> 
                Analysis Library
                <span className="text-xs font-mono font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-white/5 ml-2">
                    {totalItems} Items
                </span>
                {filter !== 'ALL' && (
                    <span className="text-xs font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full flex items-center gap-1 animate-fade-in">
                        Filtered: {filter.replace('_', ' ')} <button onClick={() => setFilter('ALL')}><X className="w-3 h-3 hover:text-red-200" /></button>
                    </span>
                )}
                </h3>

                {/* View Mode Toggle */}
                <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-white/5 self-start">
                  <button 
                    onClick={() => setView('GRID')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${view === 'GRID' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <LayoutGrid className="w-3 h-3" /> Grid
                  </button>
                  <button 
                    onClick={() => setView('LIST')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${view === 'LIST' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <List className="w-3 h-3" /> List
                  </button>
                </div>
            </div>

            {totalItems === 0 ? (
                <div className="bg-slate-900/30 rounded-2xl p-12 border border-white/5 border-dashed flex flex-col items-center justify-center text-center min-h-[300px] animate-fade-in">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    {filter === 'BOOKMARKED' ? <Bookmark className="w-8 h-8 text-slate-600" /> :
                    filter === 'BULLISH' ? <Rocket className="w-8 h-8 text-slate-600" /> :
                    filter === 'HIGH_SCORE' ? <Activity className="w-8 h-8 text-slate-600" /> :
                    <Database className="w-8 h-8 text-slate-600" />}
                </div>
                
                <h4 className="text-xl font-bold text-white mb-2">
                    {filter === 'ALL' ? "Your library is empty" : "No reports match this filter"}
                </h4>
                
                <p className="text-slate-400 max-w-sm mb-6">
                    {filter === 'ALL' 
                        ? 'Search for a stock ticker above and click "Initiate" to generate your first AI-powered equity report.' 
                        : `We couldn't find any items in your library matching the "${filter.replace('_', ' ')}" criteria.`
                    }
                </p>
                
                {filter === 'ALL' ? (
                    <button 
                        onClick={onViewSample} 
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-bold flex items-center gap-1"
                    >
                        See a sample report <ArrowRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button 
                        onClick={() => setFilter('ALL')} 
                        className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                        Clear Filters
                    </button>
                )}
                </div>
            ) : (
                <div className={view === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr" : "flex flex-col gap-3"}>
                  {/* 1. Active / Processing Sessions (Always First, only show if ALL filter) */}
                  {filter === 'ALL' && analysisSessions.map((session) => (
                      <LibraryCard 
                          key={session.id} 
                          session={session} 
                          onClick={() => session.status === 'READY' && onViewAnalyzedReport(session.id)}
                          onAction={(e) => { e.stopPropagation(); onCancelAnalysis(session.id); }}
                          viewMode={view}
                      />
                  ))}

                  {/* 2. Library Items */}
                  {filteredLibrary.map((item) => {
                      const stableKey = item.id || item.bookmarkId || `${item.ticker}-${item.addedAt}`;
                      return (
                        <LibraryCard 
                            key={stableKey} 
                            savedItem={item}
                            onClick={() => onLoadReport(item)}
                            onAction={(e) => onDeleteReport(item.ticker, e)}
                            viewMode={view}
                        />
                      );
                  })}

                  {(hasMoreReports || hasMoreBookmarks) && (
                    <div className="col-span-full flex gap-3 flex-wrap">
                      {hasMoreReports && (
                        <button
                          onClick={onLoadMoreReports}
                          disabled={isLoadingReportsPage}
                          className="px-4 py-2 rounded-lg border border-white/10 bg-slate-900/80 text-sm font-semibold text-white hover:border-indigo-400/60 hover:text-indigo-200 transition-colors disabled:opacity-50"
                        >
                          {isLoadingReportsPage ? 'Loading reports…' : 'Load more reports'}
                        </button>
                      )}
                      {hasMoreBookmarks && (
                        <button
                          onClick={onLoadMoreBookmarks}
                          disabled={isLoadingBookmarksPage}
                          className="px-4 py-2 rounded-lg border border-white/10 bg-slate-900/80 text-sm font-semibold text-white hover:border-indigo-400/60 hover:text-indigo-200 transition-colors disabled:opacity-50"
                        >
                          {isLoadingBookmarksPage ? 'Loading bookmarks…' : 'Load more bookmarks'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
            )}
        </div>

        {/* RIGHT COLUMN: Sidebar (Alerts & Activity) */}
        <div className="lg:col-span-1 sticky top-24">
            <DashboardSidebar library={reportLibrary} sessions={analysisSessions} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
