
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
  MousePointer2,
  FileText,
  FileStack
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
  onViewCommandCenter: () => void;
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

type FilterType = 'ALL' | 'BOOKMARKED' | 'BULLISH';

// --- SIDEBAR COMPONENT ---
const DashboardSidebar = ({ library, sessions }: { library: SavedReportItem[], sessions: AnalysisSession[] }) => {
    // Mock Data for "Market Radar" - In a real app, this would come from an API
    const alerts = [
        { title: "CPI Data Release", time: "Tomorrow, 8:30 AM", type: "high", icon: <Activity className="w-3 h-3 text-primary" /> },
        { title: "Tech Sector Earnings", time: "This Week", type: "med", icon: <TrendingUp className="w-3 h-3 text-primary" /> },
        { title: "Fed Chair Speech", time: "Friday, 2:00 PM", type: "high", icon: <Bell className="w-3 h-3 text-primary" /> }
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
             <div className="bg-surface rounded-sm border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-tertiary/10">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" strokeWidth={1.5} />
                        <h3 className="text-sm font-semibold text-primary">Market Radar</h3>
                    </div>
                </div>
                <div className="divide-y divide-border">
                    {alerts.map((alert, i) => (
                        <div key={i} className="p-4 hover:bg-tertiary/10 transition-colors group cursor-default">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-medium text-primary transition-colors">{alert.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-secondary font-mono">
                                {alert.icon} {alert.time}
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* Recent Activity */}
             <div className="bg-surface rounded-sm border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2 bg-tertiary/10">
                    <HistoryIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-primary">Recent Activity</h3>
                </div>
                <div className="p-4 space-y-5">
                    {activityItems.length > 0 ? activityItems.map((item, i) => (
                        <div key={i} className="flex gap-3 relative">
                            <div className="mt-1.5 flex-shrink-0">
                                <div className={`w-2 h-2 rounded-full ${item.type === 'ANALYSIS' ? 'bg-primary animate-pulse' : 'bg-secondary'}`}></div>
                            </div>
                            {/* Vertical Connector Line */}
                            {i !== activityItems.length - 1 && (
                                <div className="absolute top-3.5 left-[3px] w-px h-full bg-border -z-10"></div>
                            )}
                            <div>
                                <div className="text-xs text-secondary">
                                    {item.type === 'ANALYSIS' ? 'Analyzing ' : 'Report generated for '} 
                                    <span className="font-medium text-primary font-mono">{item.ticker}</span>
                                </div>
                                <div className="text-[10px] text-secondary/70 mt-0.5 font-mono">
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
             <div className="bg-tertiary/10 rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                   <div className="p-1.5 bg-surface rounded-lg text-primary border border-border shadow-sm">
                      <Zap className="w-4 h-4" />
                   </div>
                   <div>
                      <h4 className="text-xs font-bold text-primary mb-1">Pro Tip</h4>
                      <p className="text-[10px] text-secondary leading-relaxed">
                         Look for the <Rocket className="w-3 h-3 inline mx-0.5 text-primary"/> icon. Scores above 80 indicate strong moonshot potential.
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
            <div className="bg-surface rounded-sm p-4 border border-border relative overflow-hidden flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-sans font-semibold text-primary">{session.ticker}</span>
                        <Loader2 className="w-3 h-3 text-secondary animate-spin" />
                    </div>
                    <div className="h-1.5 w-32 bg-tertiary rounded-full overflow-hidden border border-border hidden md:block">
                        <div className="h-full bg-primary relative" style={{ width: `${session.progress}%` }}></div>
                    </div>
                    <span className="text-xs text-secondary font-mono hidden md:block">{session.phase}</span>
                </div>
                <button 
                    onClick={onAction} 
                    className="p-2 text-secondary hover:text-primary rounded-sm hover:bg-tertiary/20 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }
    return (
      <div className="bg-surface rounded-sm p-5 border border-border relative overflow-hidden h-full min-h-[160px] flex flex-col justify-between animate-fade-in-up group">
        
        <div className="relative z-10 flex justify-between items-start">
          <div>
             <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-sans font-semibold text-primary tracking-tight">{session.ticker}</span>
                <Loader2 className="w-4 h-4 text-secondary animate-spin" />
             </div>
             <div className="text-[10px] text-secondary font-medium uppercase tracking-wider flex items-center gap-1">
                <Satellite className="w-3 h-3" /> Analyzing...
             </div>
          </div>
          <button 
             onClick={onAction}
             className="text-secondary hover:text-primary p-2 rounded-full hover:bg-tertiary/20 transition-colors"
             title="Cancel Analysis"
          >
             <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 space-y-3 mt-4">
           {/* Progress Bar */}
           <div className="space-y-1.5">
              <div className="flex justify-between items-end text-[10px]">
                  <span className="text-secondary font-mono truncate max-w-[70%]">{session.phase}</span>
                  <span className="text-primary font-mono font-medium">{Math.round(session.progress)}%</span>
              </div>
              <div className="h-1 w-full bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${session.progress}%` }}
                  >
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
            <div className="bg-surface rounded-sm p-4 border border-border flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-sans font-semibold text-primary">{session.ticker}</span>
                    <span className="text-xs text-red-600 font-medium uppercase">Analysis Failed</span>
                </div>
                <button onClick={onAction}><X className="w-4 h-4 text-secondary hover:text-primary" /></button>
            </div>
        );
     }
     return (
        <div className="bg-surface rounded-sm p-5 border border-border relative overflow-hidden h-full min-h-[160px] flex flex-col justify-between animate-fade-in-up">
           <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                 <span className="text-xl font-sans font-semibold text-primary">{session.ticker}</span>
                 <AlertOctagon className="w-4 h-4 text-red-600" />
              </div>
              <button onClick={onAction}><X className="w-4 h-4 text-secondary hover:text-primary" /></button>
           </div>
           <div>
              <div className="text-xs text-red-600 mb-1 font-medium uppercase tracking-wide">Analysis Failed</div>
              <p className="text-xs text-secondary leading-relaxed line-clamp-3">{session.error || 'Connection interrupted. Please try again.'}</p>
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
  const verdictColor = displayData.verdict === 'BUY' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
    : displayData.verdict === 'SELL' ? 'text-rose-600 bg-rose-50 border-rose-100' 
    : 'text-amber-600 bg-amber-50 border-amber-100';

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
            bg-surface rounded-sm p-4 border 
            ${displayData.isNew 
               ? 'border-emerald-500/50' 
               : displayData.isBookmarked
                 ? 'border-primary/20 bg-tertiary/5'
                 : 'border-border hover:border-secondary/30 hover:bg-tertiary/5'
            }
            transition-all cursor-pointer group relative flex items-center justify-between animate-fade-in-up gap-4
          `}
        >
           {/* Left: Identity */}
           <div className="flex items-center gap-4 min-w-[180px]">
               <div>
                  <div className="flex items-center gap-2">
                     <span className="font-sans font-semibold text-lg text-primary group-hover:text-primary transition-colors">{displayData.ticker}</span>
                     {displayData.isBookmarked && <Bookmark className="w-3.5 h-3.5 text-primary fill-primary" />}
                     {displayData.isNew && <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>}
                  </div>
                  <div className="text-xs text-secondary truncate max-w-[180px] flex items-center gap-2">
                    <span className="truncate">{displayData.name}</span>
                    {displayData.reportDate && (
                      <span className="text-[10px] text-secondary/70 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {displayData.reportDate}
                      </span>
                    )}
                  </div>
               </div>
           </div>

           {/* Middle: Performance Snapshot */}
           <div className="hidden sm:grid grid-cols-[1fr_auto_1fr_1fr_1fr] gap-4 flex-1 items-center justify-items-center">
                <div className="flex flex-col items-center w-full">
                    <span className="text-[10px] font-medium text-secondary uppercase tracking-wider mb-1">Entry</span>
                    <span className="font-mono font-medium text-primary">{displayData.price}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-secondary" />
                <div className="flex flex-col items-center w-full">
                    <span className="text-[10px] font-medium text-secondary uppercase tracking-wider mb-1">Target</span>
                    <span className="font-mono font-medium text-primary">{displayData.priceTarget || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center w-full">
                    <span className="text-[10px] font-medium text-secondary uppercase tracking-wider mb-1">Upside</span>
                    <span className={`font-mono font-medium ${upsideVal > 0 ? 'text-emerald-600' : 'text-secondary'}`}>{upside}</span>
                </div>
                
                <div className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${verdictColor} w-[80px] text-center`}>
                    {displayData.verdict}
                </div>
           </div>

           {/* Right: Score & Actions */}
           <div className="flex items-center gap-3">
                {displayData.rocketScore !== undefined && (
                    <div className="flex items-center gap-1.5 bg-tertiary/20 px-2.5 py-1.5 rounded-sm border border-border" title="Moonshot Score">
                        <Rocket className={`w-3.5 h-3.5 ${displayData.rocketScore >= 80 ? 'text-primary' : 'text-secondary'}`} />
                        <span className={`text-sm font-mono font-medium ${displayData.rocketScore >= 80 ? 'text-primary' : 'text-secondary'}`}>
                            {displayData.rocketScore}
                        </span>
                    </div>
                )}
                
                {!displayData.isNew && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAction(e); }}
                        className="text-secondary hover:text-red-600 p-2 rounded-lg hover:bg-tertiary/20 transition-colors opacity-0 group-hover:opacity-100"
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
             ? 'border-primary/20 bg-tertiary/5 shadow-sm'
             : 'border-border hover:border-secondary/30 hover:bg-tertiary/5'
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
               <div className="font-display font-bold text-xl text-primary group-hover:text-primary transition-colors truncate">
                  {displayData.ticker}
               </div>
               {displayData.isBookmarked && (
                 <Bookmark className="w-3.5 h-3.5 text-primary fill-primary" />
               )}
            </div>
            <div className="text-xs text-secondary truncate mt-0.5 flex items-center gap-2">
              <span className="truncate">{displayData.name}</span>
              {displayData.reportDate && (
                <span className="text-[10px] text-secondary/70 whitespace-nowrap flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {displayData.reportDate}
                </span>
              )}
            </div>
         </div>
          {!displayData.isNew && (
            <button 
                onClick={(e) => { e.stopPropagation(); onAction(e); }}
                className="text-secondary hover:text-red-600 p-1.5 rounded-lg hover:bg-tertiary/20 transition-colors z-10 -mr-2 -mt-2 opacity-0 group-hover:opacity-100"
                title="Remove from Library"
            >
                <Trash2 className="w-4 h-4" />
            </button>
          )}
       </div>
       
       {/* Performance Snapshot Grid */}
       <div className="space-y-4">
           <div className="grid grid-cols-3 gap-2 text-center bg-tertiary/10 rounded-lg p-2 border border-border">
               <div>
                   <div className="text-[9px] font-bold text-secondary uppercase tracking-wider mb-1">Entry</div>
                   <div className="font-mono font-bold text-primary text-sm">{displayData.price}</div>
               </div>
               <div className="border-x border-border">
                   <div className="text-[9px] font-bold text-secondary uppercase tracking-wider mb-1">Target</div>
                   <div className="font-mono font-bold text-primary text-sm">{displayData.priceTarget || 'N/A'}</div>
               </div>
               <div>
                   <div className="text-[9px] font-bold text-secondary uppercase tracking-wider mb-1">Upside</div>
                   <div className={`font-mono font-bold text-sm ${upsideVal > 0 ? 'text-emerald-600' : 'text-secondary'}`}>{upside}</div>
               </div>
           </div>

           <div className="h-px bg-border w-full"></div>
           
           {/* Details Row */}
           <div className="flex items-center justify-between gap-2">
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${verdictColor}`}>
                    {displayData.verdict}
                </div>

                {displayData.rocketScore !== undefined && (
                    <div className="flex items-center gap-1.5 bg-tertiary/20 px-2 py-1 rounded-lg border border-border" title="Moonshot Score">
                        <Rocket className={`w-3 h-3 ${displayData.rocketScore >= 80 ? 'text-primary' : 'text-secondary'}`} />
                        <span className={`text-xs font-mono font-bold ${displayData.rocketScore >= 80 ? 'text-primary' : 'text-secondary'}`}>
                            {displayData.rocketScore}
                        </span>
                    </div>
                )}
                
                {displayData.marketCap && (
                    <div className="text-[10px] text-secondary font-mono">
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
  onViewCommandCenter,
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
        default:
          return items;
      }
  }, [reportLibrary, analysisSessions, filter]);

  const totalItems = filteredLibrary.length + (filter === 'ALL' ? analysisSessions.length : 0);
  const bookmarkedCount = reportLibrary.filter(i => i.isBookmarked).length;
  const reportsGenerated = reportLibrary.length;
  const bullishCount = reportLibrary.filter(r => r.verdict === 'BUY').length;

  // Reusable Interactive Stat Tab Component (Dieter Rams Style: Minimal, Functional)
  const StatFilterTab = ({ 
    active, 
    onClick, 
    label, 
    count
  }: { 
    active: boolean, 
    onClick: () => void, 
    label: string, 
    count: number
  }) => (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border
        ${active 
          ? 'bg-primary text-white border-primary shadow-sm' 
          : 'bg-surface text-secondary border-border hover:border-secondary/50 hover:text-primary'
        }
      `}
    >
      <span>{label}</span>
      <span className={`font-mono text-xs ${active ? 'text-white/70' : 'text-secondary/70'}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="animate-fade-in w-full pb-20">
      
      {/* 1. Header & Search Section */}
      <div className="relative mb-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-tertiary/30 border border-border text-secondary text-[10px] font-medium uppercase rounded-sm flex items-center gap-1.5">
                 <Crown className="w-3 h-3" /> {user.tier} Plan
              </span>
              <span className="h-1 w-1 bg-secondary rounded-full"></span>
              <span className="text-xs text-secondary font-mono">{new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-sans font-semibold text-primary tracking-tight leading-tight">
              Hello, <span className="text-primary">{user.name.split(' ')[0]}</span>.
            </h2>
            <p className="text-secondary mt-2 max-w-xl text-base font-light">
              Your command center for AI-powered market analysis. Markets are {marketStatus} today.
            </p>
          </div>

          {/* Quick Market Stats (Top Right) */}
          <div className="flex gap-3 relative z-10 hidden lg:flex">
             <div className="bg-surface p-3 rounded-sm border border-border flex flex-col items-end min-w-[100px]">
                <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">S&P 500</span>
                <span className="text-sm font-mono font-medium text-emerald-600 flex items-center gap-1">
                   +0.45% <TrendingUp className="w-3 h-3" />
                </span>
             </div>
             <div className="bg-surface p-3 rounded-sm border border-border flex flex-col items-end min-w-[100px]">
                <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">NASDAQ</span>
                <span className="text-sm font-mono font-medium text-emerald-600 flex items-center gap-1">
                   +1.12% <TrendingUp className="w-3 h-3" />
                </span>
             </div>
             <div className="bg-surface p-3 rounded-sm border border-border flex flex-col items-end min-w-[100px]">
                <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">VIX</span>
                <span className="text-sm font-mono font-medium text-rose-600 flex items-center gap-1">
                   +2.4% <Activity className="w-3 h-3" />
                </span>
             </div>
          </div>
        </div>

        {/* Search Bar - Hero Style */}
        <div className="w-full max-w-4xl relative z-20">
          <form onSubmit={(e) => onSearch(e)} className="relative group">
              <div className="relative" ref={dropdownRef}>
                <div className="relative flex items-center bg-surface rounded-sm border border-border shadow-sm overflow-hidden hover:border-secondary/50 transition-colors">
                  <div className="pl-4 text-secondary">
                    <Search className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    value={tickerInput}
                    onChange={onTickerChange}
                    onFocus={() => { if(tickerInput) setShowSuggestions(true); }}
                    placeholder="ENTER TICKER SYMBOL (e.g. NVDA, PLTR)..."
                    className="w-full bg-transparent px-4 py-4 text-lg text-primary placeholder-tertiary focus:outline-none font-mono uppercase tracking-wider"
                    autoComplete="off"
                  />
                  <div className="pr-2">
                    <button
                        type="submit"
                        disabled={!tickerInput}
                        className="bg-primary hover:opacity-90 text-white px-6 py-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-sm flex items-center gap-2 text-xs tracking-wide"
                    >
                        INITIATE <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-sm border border-border shadow-lg overflow-hidden z-50 animate-fade-in-up">
                    <ul>
                      {suggestions.map((stock) => (
                        <li 
                          key={stock.symbol}
                          onClick={() => onSelectSuggestion(stock.symbol)}
                          className="px-5 py-3 hover:bg-tertiary/10 cursor-pointer border-b border-border last:border-0 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-medium text-lg text-primary w-16">{stock.symbol}</span>
                            <span className="text-sm text-secondary group-hover:text-primary">{stock.name}</span>
                          </div>
                          <TrendingUp className="w-4 h-4 text-secondary group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
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
                className="text-xs font-medium text-secondary hover:text-primary flex items-center gap-2 transition-colors bg-transparent px-3 py-1.5 rounded-full border border-border hover:border-secondary/50"
             >
                <Zap className="w-3 h-3" /> Load Sample Report
             </button>
             <button 
                onClick={onViewCommandCenter}
                className="text-xs font-medium text-secondary hover:text-primary flex items-center gap-2 transition-colors bg-transparent px-3 py-1.5 rounded-full border border-border hover:border-secondary/50"
             >
                <LayoutGrid className="w-3 h-3" /> Command Center
             </button>
             <div className="text-[10px] text-secondary font-mono uppercase ml-2">
                Trending: <span className="text-secondary hover:text-primary cursor-pointer transition-colors mx-1" onClick={() => onSearch(undefined, 'NVDA')}>NVDA</span>
                <span className="text-secondary hover:text-primary cursor-pointer transition-colors mx-1" onClick={() => onSearch(undefined, 'TSLA')}>TSLA</span>
                <span className="text-secondary hover:text-primary cursor-pointer transition-colors mx-1" onClick={() => onSearch(undefined, 'PLTR')}>PLTR</span>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Quick Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
          <StatFilterTab 
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
            label="All Reports"
            count={reportsGenerated}
          />
          <StatFilterTab 
            active={filter === 'BOOKMARKED'}
            onClick={() => setFilter('BOOKMARKED')}
            label="Bookmarked"
            count={bookmarkedCount}
          />
          <StatFilterTab 
            active={filter === 'BULLISH'}
            onClick={() => setFilter('BULLISH')}
            label="Bullish Finds"
            count={bullishCount}
          />
      </div>

      {/* 3. Main Content Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LEFT COLUMN: Report Library (Takes 3/4 width on desktop) */}
        <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-sans font-semibold text-primary flex items-center gap-2">
                <Folder className="w-5 h-5 text-primary" strokeWidth={1.5} /> 
                Analysis Library
                <span className="text-xs font-mono font-normal text-secondary bg-tertiary/20 px-2 py-0.5 rounded-sm border border-border ml-2">
                    {totalItems} Items
                </span>
                {filter !== 'ALL' && (
                    <span className="text-xs font-medium text-white bg-primary px-2 py-0.5 rounded-sm flex items-center gap-1 animate-fade-in">
                        Filtered: {filter.replace('_', ' ')} <button onClick={() => setFilter('ALL')}><X className="w-3 h-3 hover:text-white/80" /></button>
                    </span>
                )}
                </h3>

                {/* View Mode Toggle */}
                <div className="flex items-center p-1 bg-tertiary/20 rounded-lg border border-border self-start">
                  <button 
                    onClick={() => setView('GRID')}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium flex items-center gap-2 transition-all ${view === 'GRID' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-tertiary/20'}`}
                  >
                      <LayoutGrid className="w-3 h-3" /> Grid
                  </button>
                  <button 
                    onClick={() => setView('LIST')}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium flex items-center gap-2 transition-all ${view === 'LIST' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-tertiary/20'}`}
                  >
                      <List className="w-3 h-3" /> List
                  </button>
                </div>
            </div>

            {totalItems === 0 ? (
                <div className="bg-surface rounded-sm p-12 border border-border border-dashed flex flex-col items-center justify-center text-center min-h-[300px] animate-fade-in">
                <div className="w-16 h-16 bg-tertiary/20 rounded-full flex items-center justify-center mb-4">
                    {filter === 'BOOKMARKED' ? <Bookmark className="w-8 h-8 text-secondary" /> :
                    filter === 'BULLISH' ? <TrendingUp className="w-8 h-8 text-secondary" /> :
                    <FileStack className="w-8 h-8 text-secondary" />}
                </div>
                
                <h4 className="text-xl font-semibold text-primary mb-2">
                    {filter === 'ALL' ? "Your library is empty" : "No reports match this filter"}
                </h4>
                
                <p className="text-secondary max-w-sm mb-6">
                    {filter === 'ALL' 
                        ? 'Search for a stock ticker above and click "Initiate" to generate your first AI-powered equity report.' 
                        : `We couldn't find any items in your library matching the "${filter.replace('_', ' ')}" criteria.`
                    }
                </p>
                
                {filter === 'ALL' ? (
                    <button 
                        onClick={onViewSample} 
                        className="text-primary hover:text-primary/80 text-sm font-bold flex items-center gap-1 border-b border-primary pb-0.5"
                    >
                        See a sample report <ArrowRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button 
                        onClick={() => setFilter('ALL')} 
                        className="bg-primary text-white px-4 py-2 rounded-sm font-medium text-sm hover:opacity-90 transition-colors"
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
                          className="px-4 py-2 rounded-sm border border-border bg-surface text-sm font-medium text-primary hover:bg-tertiary/10 transition-colors disabled:opacity-50"
                        >
                          {isLoadingReportsPage ? 'Loading reports…' : 'Load more reports'}
                        </button>
                      )}
                      {hasMoreBookmarks && (
                        <button
                          onClick={onLoadMoreBookmarks}
                          disabled={isLoadingBookmarksPage}
                          className="px-4 py-2 rounded-sm border border-border bg-surface text-sm font-medium text-primary hover:bg-tertiary/10 transition-colors disabled:opacity-50"
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
