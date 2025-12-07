
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EquityReport, PricePoint, FinancialYear, SavedReportItem, FactorAnalysis } from '../types';
import { streamChatWithGemini } from '../services/geminiService';
import { fetchConversation } from '../services/conversationClient';
import { apiJson } from '../services/apiClient';
import { 
  Target, 
  Calendar, 
  Newspaper,
  PhoneCall,
  Hash,
  ExternalLink,
  DollarSign,
  BarChart2,
  Activity,
  Table,
  PieChart,
  Rocket,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Check,
  Download,
  Goal,
  ShieldCheck,
  Bookmark,
  BookmarkCheck,
  Gauge,
  ChevronDown,
  X,
  Info,
  Calculator,
  Briefcase,
  AlertTriangle,
  Lock,
  Castle,
  Zap,
  BarChart,
  NotebookPen,
  Save,
  Sparkles,
  Bot,
  Lightbulb,
  History,
  ArrowRight,
  Clock,
  FolderCheck,
  MessageSquare,
  Send,
  Minimize2,
  RefreshCw,
  BookOpen,
  UserCheck
} from 'lucide-react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
  AreaChart,
  Area,
  Cell,
  Scatter,
  ScatterChart,
  ReferenceLine
} from 'recharts';
import html2canvas from 'html2canvas';
import { logger } from '../src/lib/logger';
import { jsPDF } from 'jspdf';

interface ReportCardProps {
  report: EquityReport;
  reportId?: string;
  isBookmarked: boolean;
  onToggleBookmark: (item: SavedReportItem) => void;
  isTeaserMode?: boolean;
  onUnlock?: () => void;
}

// Helper to parse price strings "$150.00" -> 150.00
const parsePrice = (priceStr: string) => {
  try {
    if (!priceStr) return 0;
    return parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  } catch (e) {
    return 0;
  }
};

// Helper to calculate Linear Regression (y = mx + b)
const calculateTrendLine = (data: PricePoint[], startIndex: number, endIndex: number, totalLength: number) => {
  const slicedData = data.slice(startIndex, endIndex);
  const n = slicedData.length;
  if (n < 2) return [];

  let sumX = 0, sumY = 0, sumXY = 0, sumXY2 = 0, sumXX = 0;
  
  slicedData.forEach((point, i) => {
    const x = startIndex + i;
    const y = point.price;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const trendPoints = [];
  for(let i = startIndex; i < endIndex; i++) {
    trendPoints.push({
      index: i,
      value: slope * i + intercept
    });
  }
  return trendPoints;
};

// Internal component for handling text expansion on click
const ExpandableText = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  if (!text) return null;
  // Lower threshold to ensure button shows for moderately long text
  const showButton = text.length > 50;

  return (
    <div className="relative w-full mt-2" ref={containerRef}>
      {/* Base layer (truncated) */}
      <div 
        className={`text-xs text-secondary font-medium px-1 transition-opacity duration-200 ${isExpanded ? 'opacity-0 invisible' : 'opacity-100 visible'}`}
      >
        <div className="line-clamp-3 leading-relaxed text-center">
          {text}
        </div>
        
        {/* Read More Trigger - Only shows if text is likely long enough to truncate */}
        {showButton && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            className="w-full flex items-center justify-center gap-1 mt-3 text-[10px] uppercase font-bold text-primary hover:text-white transition-all bg-surface border border-primary/20 hover:bg-primary py-1.5 rounded-sm shadow-sm"
          >
             Read More <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {/* Expanded Overlay */}
      <div 
        className={`absolute top-0 left-0 w-full z-50 bg-surface border border-border shadow-xl rounded-sm p-3 transition-all duration-200 origin-center ${
          isExpanded 
            ? 'opacity-100 visible transform scale-100' 
            : 'opacity-0 invisible transform scale-95 pointer-events-none'
        }`}
      >
         <div className="flex justify-between items-start mb-2 border-b border-border pb-2">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Analysis Details</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="text-secondary hover:text-primary transition-colors p-1"
            >
              <X className="w-3 h-3" />
            </button>
         </div>
         <p className="text-xs text-primary font-medium leading-relaxed text-left max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
            {text}
         </p>
      </div>
    </div>
  );
};

// --- Helper Components ---

const LockedFeature = ({ children, isLocked, onUnlock, label, className }: { children: React.ReactNode, isLocked?: boolean, onUnlock?: () => void, label: string, className?: string }) => {
  if (!isLocked) return <div className={className}>{children}</div>;

  return (
    <div className={`relative overflow-hidden group ${className || ''}`}>
      <div className="filter blur-md opacity-40 pointer-events-none select-none transition-all duration-500" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/20 backdrop-blur-[1px]">
        <div className="bg-surface/90 p-5 rounded-sm border border-border shadow-xl flex flex-col items-center text-center max-w-[90%] transform transition-transform hover:scale-105">
           <div className="p-2.5 bg-tertiary/20 rounded-full mb-3 ring-1 ring-border">
             <Lock className="w-5 h-5 text-primary" />
           </div>
           <h4 className="text-primary font-bold text-sm mb-1">{label} Locked</h4>
           <p className="text-[10px] text-secondary mb-3 max-w-[180px]">
             Sign in or use your own API key to reveal this premium insight.
           </p>
           <button 
             onClick={onUnlock}
             className="px-5 py-2 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-sm transition-all shadow-sm flex items-center gap-2"
           >
             Unlock Now <ArrowRight className="w-3 h-3" />
           </button>
        </div>
      </div>
    </div>
  )
};

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-surface p-4 rounded-sm border border-border text-center flex flex-col items-center justify-center hover:border-secondary/50 transition-colors">
    <div className="text-[10px] text-secondary uppercase font-bold mb-1 tracking-wider">{label}</div>
    <div className="text-xl md:text-2xl font-mono font-bold text-primary">{value}</div>
  </div>
);

const KPICard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-surface rounded-sm p-4 border border-border text-center flex flex-col items-center justify-center">
    <div className="text-[10px] text-secondary uppercase font-bold mb-1">{label}</div>
    <div className="text-xl font-mono font-bold text-primary">{value}</div>
  </div>
);

const FactorCard = ({ title, factors, icon }: { title: string; factors: FactorAnalysis; icon: React.ReactNode }) => {
  if (!factors) return null;
  return (
    <div className="bg-surface rounded-sm p-6 border border-border shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <div className="bg-tertiary/10 p-2 rounded-sm border border-border shadow-sm">
           {icon}
        </div>
        <h3 className="font-sans font-bold text-lg text-primary">{title}</h3>
      </div>
      
      <div className="space-y-4 flex-1">
         {/* Positive Factors */}
         <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
               <TrendingUp className="w-3 h-3" /> Bullish Drivers
            </h4>
            {factors.positive?.map((factor, i) => (
               <div key={i} className="p-2.5 rounded-sm bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                  <div className="text-xs font-bold text-emerald-700 mb-1">{factor.title}</div>
                  <p className="text-xs text-primary leading-relaxed">{factor.detail}</p>
               </div>
            )) || <div className="text-xs text-secondary italic">None identified</div>}
         </div>

         {/* Negative Factors */}
         <div className="space-y-2 pt-2">
            <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
               <TrendingDown className="w-3 h-3" /> Risk Factors
            </h4>
             {factors.negative?.map((factor, i) => (
               <div key={i} className="p-2.5 rounded-sm bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                  <div className="text-xs font-bold text-red-700 mb-1">{factor.title}</div>
                  <p className="text-xs text-primary leading-relaxed">{factor.detail}</p>
               </div>
            )) || <div className="text-xs text-secondary italic">None identified</div>}
         </div>
      </div>
    </div>
  );
};

export const ReportCardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-10 w-full animate-fade-in relative">
      
      {/* ACTIVE LOADING STATE INDICATOR - Positioned at top for visibility */}
      <div className="bg-surface/80 rounded-sm p-8 border border-border flex flex-col items-center justify-center space-y-4 shadow-xl relative z-10 backdrop-blur-sm mb-8">
           <Loader2 className="w-12 h-12 text-primary animate-spin" />
           <div className="text-center space-y-2">
             <div className="text-secondary font-sans text-xl font-bold tracking-wider animate-pulse">
               GENERATING ANALYSIS...
             </div>
             <p className="text-secondary text-sm">
               Processing financial models, scraping news, and evaluating risk factors.
             </p>
           </div>
           {/* Progress bar visual */}
           <div className="h-1.5 w-64 bg-tertiary/20 rounded-full overflow-hidden mt-4">
               <div className="h-full bg-primary w-1/2 animate-[pulse_1.5s_infinite]"></div>
           </div>
      </div>

      {/* Blurred/Dimmed Skeleton Structure representing the upcoming report */}
      <div className="opacity-20 filter blur-[2px] pointer-events-none select-none space-y-6">
        
        {/* 1. Header Skeleton */}
        <div className="bg-surface rounded-sm p-6 md:p-8 border border-border shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 md:h-12 w-48 md:w-64 bg-tertiary/20 rounded-sm" />
                <div className="h-6 w-16 bg-tertiary/20 rounded-sm" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full max-w-3xl bg-tertiary/20 rounded-sm" />
                <div className="h-4 w-2/3 max-w-3xl bg-tertiary/20 rounded-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 bg-tertiary/20 rounded-sm" />
              <div className="h-9 w-20 bg-tertiary/20 rounded-sm" />
            </div>
          </div>
        </div>

        {/* 2. At a Glance Skeleton (Grouped Layout) */}
        <div className="grid grid-cols-12 gap-4">
          {/* Verdict */}
          <div className="col-span-12 xl:col-span-2 bg-surface p-6 rounded-sm border border-border h-48 flex flex-col items-center justify-center space-y-3">
              <div className="h-3 w-20 bg-tertiary/20 rounded-sm" />
              <div className="h-10 w-10 bg-tertiary/20 rounded-full" />
              <div className="h-8 w-24 bg-tertiary/20 rounded-sm" />
          </div>
          {/* Intelligence */}
          <div className="col-span-12 xl:col-span-5 bg-surface rounded-sm border border-border h-48 grid grid-cols-2 divide-x divide-border">
             <div className="p-6 flex flex-col items-center justify-center space-y-3">
                <div className="h-3 w-24 bg-tertiary/20 rounded-sm" />
                <div className="h-10 w-24 bg-tertiary/20 rounded-sm" />
                <div className="h-12 w-full bg-tertiary/20 rounded-sm" />
             </div>
             <div className="p-6 flex flex-col items-center justify-center space-y-3">
                <div className="h-3 w-24 bg-tertiary/20 rounded-sm" />
                <div className="h-10 w-24 bg-tertiary/20 rounded-sm" />
                <div className="h-12 w-full bg-tertiary/20 rounded-sm" />
             </div>
          </div>
          {/* Valuation */}
          <div className="col-span-12 xl:col-span-5 bg-surface rounded-sm border border-border h-48 grid grid-cols-2 divide-x divide-border">
             <div className="p-6 flex flex-col items-center justify-center space-y-3">
                <div className="h-3 w-24 bg-tertiary/20 rounded-sm" />
                <div className="h-10 w-32 bg-tertiary/20 rounded-sm" />
                <div className="h-6 w-20 bg-tertiary/20 rounded-sm" />
             </div>
             <div className="p-6 flex flex-col items-center justify-center space-y-3">
                <div className="h-3 w-24 bg-tertiary/20 rounded-sm" />
                <div className="h-10 w-32 bg-tertiary/20 rounded-sm" />
                <div className="h-6 w-20 bg-tertiary/20 rounded-sm" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- CHAT WIDGET (PORTAL) ---

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  kind?: 'summary' | 'message';
}

const ChatWidget = ({
  report,
  reportId,
  userNotes,
  userThesis,
  isOpen,
  onToggle
}: {
  report: EquityReport;
  reportId?: string;
  userNotes: string;
  userThesis: string;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const buildGreeting = useCallback((): ChatMessage => ({
    id: 'init',
    role: 'assistant',
    text: `Hello! I'm Ultramagnus. I've analyzed the ${report.ticker} report.\n\nI can clarify the valuation, identify hidden risks, or compare ${report.ticker} to its competitors. How can I help?`,
    timestamp: new Date(),
    kind: 'message'
  }), [report.ticker]);

  const [messages, setMessages] = useState<ChatMessage[]>([buildGreeting()]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hydrateConversation = useCallback((conversation: any) => {
    const mapped: ChatMessage[] = Array.isArray(conversation?.messages)
      ? conversation.messages.map((m: any) => ({
          id: m.id || String(m.createdAt || Date.now()),
          role: m.role === 'assistant' ? 'assistant' : 'user',
          text: m.content || '',
          timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
          kind: 'message'
        }))
      : [];

    if (conversation?.summary?.text) {
      setSummaryText(conversation.summary.text);
    } else {
      setSummaryText(null);
    }

    if (mapped.length) {
      setMessages(mapped);
    } else {
      setMessages([buildGreeting()]);
    }
  }, [buildGreeting]);

  useEffect(() => {
    setMessages([buildGreeting()]);
    setSummaryText(null);
    setHistoryError(null);
  }, [buildGreeting, reportId]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!isOpen || !reportId) {
        return;
      }
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const conversation = await fetchConversation(reportId);
        hydrateConversation(conversation);
      } catch (err: any) {
        setHistoryError(err?.message || 'Unable to load chat history.');
        setMessages([buildGreeting()]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [isOpen, reportId, hydrateConversation, buildGreeting]);

  const QUICK_PROMPTS = [
    "Summarize the Bull Case",
    "What are the main risks?",
    "Explain the valuation",
    "Compare to peers",
    "Any insider buying?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Small delay to ensure render complete before focus
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const persistChatTurn = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!reportId) return;
    return apiJson(`/api/reports/${reportId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, model: 'gemini-2.5-flash' })
    }, { operation: 'conversation.save' });
  }, [reportId]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date(),
      kind: 'message'
    };

    const messageHistory = messages.filter((m) => m.kind !== 'summary');
    const historyPayload = [...messageHistory, userMsg].map((m) => ({
      role: m.role,
      text: m.text
    }));

    if (!reportId) {
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'Save this report to your library to enable chat history and responses.',
          timestamp: new Date(),
          kind: 'message'
        }
      ]);
      setInputValue('');
      return;
    }

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    let assistantId: string | null = null;
    let finalText = '';

    try {
      await persistChatTurn('user', userMsg.text);

      assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: '', timestamp: new Date(), kind: 'message' }]);

      const onChunk = (chunk: string) => {
        finalText += chunk;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: finalText } : m));
      };

      await streamChatWithGemini(report, historyPayload, userNotes, userThesis, reportId, onChunk);

      if (!finalText.trim()) {
        throw new Error('Empty response from stream.');
      }

      await persistChatTurn('assistant', finalText);
      const conversation = await fetchConversation(reportId);
      hydrateConversation(conversation);
      if (conversation?.summary?.text) {
        setSummaryText(conversation.summary.text);
      }
    } catch (error) {
      if (assistantId) {
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      }
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
        kind: 'message'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      text: "History cleared. Starting fresh analysis context. What's on your mind?",
      timestamp: new Date(),
      kind: 'message'
    }]);
    setSummaryText(null);
    setHistoryError(null);
  };

  // Helper to render formatting
  const renderFormattedText = (text: string) => {
    // Split by simple markdown bolding **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-primary font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Safe check for document/portal availability
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none print:hidden overflow-hidden">
      
      <div className="w-full h-full relative p-4 md:p-6 flex flex-col items-end justify-end">
        {/* CHAT WINDOW */}
        <div 
          className={`
            pointer-events-auto
            w-[90vw] md:w-[400px] 
            bg-surface/95 backdrop-blur-xl 
            border border-border 
            rounded-sm shadow-2xl 
            overflow-hidden flex flex-col
            transition-all duration-300 origin-bottom-right
            mb-20 md:mb-24
            ${isOpen ? 'h-[600px] max-h-[80vh] opacity-100 scale-100 translate-y-0' : 'h-0 opacity-0 scale-90 translate-y-10'}
          `}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-surface border-b border-border flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-tertiary/10 p-1.5 rounded-sm border border-border">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary leading-tight">Ultramagnus AI</h3>
                <p className="text-[10px] text-secondary">Genius Mode • {report.ticker}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={resetChat}
                className="p-1.5 hover:bg-tertiary/10 rounded-sm text-secondary transition-colors"
                title="Clear Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button 
                onClick={onToggle}
                className="p-1.5 hover:bg-tertiary/10 rounded-sm text-secondary transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background">
            {summaryText && (
              <div className="bg-tertiary/10 border border-border text-primary text-xs rounded-sm p-3">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold text-secondary mb-1">
                  <Info className="w-3 h-3" /> Conversation summary
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{renderFormattedText(summaryText)}</div>
              </div>
            )}

            {historyError && (
              <div className="bg-amber-50 border border-amber-100 text-amber-900 text-xs rounded-sm p-3">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold text-amber-800 mb-1">
                  <AlertTriangle className="w-3 h-3" /> Chat history unavailable
                </div>
                <div>{historyError}</div>
              </div>
            )}

            {isLoadingHistory && (
              <div className="flex items-center gap-2 text-secondary text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading chat history...
              </div>
            )}

            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-sm text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-br-none shadow-sm' 
                      : 'bg-surface text-primary rounded-bl-none border border-border'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5 opacity-50 text-[10px] font-bold uppercase tracking-wider">
                      <Bot className="w-3 h-3" /> Assistant
                    </div>
                  )}
                  <div className="whitespace-pre-wrap font-sans">{renderFormattedText(msg.text)}</div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-surface p-3 rounded-sm rounded-bl-none border border-border flex gap-1 items-center h-10">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Area */}
          {messages.filter((m) => m.kind !== 'summary').length < 4 && !isTyping && (
            <div className="px-4 py-2 bg-surface border-t border-border overflow-x-auto no-scrollbar flex gap-2 shrink-0">
               {QUICK_PROMPTS.map((prompt) => (
                 <button
                   key={prompt}
                   onClick={() => handleSend(prompt)}
                   className="whitespace-nowrap px-3 py-1.5 rounded-full bg-background border border-border text-xs text-secondary hover:bg-tertiary/10 hover:text-primary transition-all"
                 >
                   {prompt}
                 </button>
               ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-4 bg-surface border-t border-border shrink-0">
            <div className="relative flex items-center bg-background rounded-sm border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about risks, targets, or news..."
                className="w-full bg-transparent px-4 py-3 text-sm text-primary placeholder-tertiary focus:outline-none"
                disabled={isTyping}
              />
              <button 
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="p-2 mr-1 text-secondary hover:text-primary disabled:opacity-50 transition-colors rounded-sm hover:bg-tertiary/10"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="text-[10px] text-center text-tertiary mt-2 flex items-center justify-center gap-1">
              <Info className="w-3 h-3" /> AI can make mistakes. Verify critical data.
            </div>
          </div>
        </div>

        {/* FLOATING ACTION BUTTON */}
        <button 
          onClick={onToggle}
          className={`
            absolute bottom-6 right-6
            pointer-events-auto
            group flex items-center justify-center 
            w-14 h-14 md:w-16 md:h-16
            bg-primary 
            rounded-full shadow-lg 
            hover:scale-105 
            transition-all duration-300 z-50
            border border-border
          `}
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-full transition-opacity"></div>
          
          {/* Icon Transition */}
          <div className={`absolute transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}>
             <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white animate-pulse-slow" />
          </div>
          <div className={`absolute transition-all duration-300 ${isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
             <ChevronDown className="w-8 h-8 text-white" />
          </div>

          {/* Notification Dot (Only show if closed and not yet opened) */}
          {!isOpen && messages.length === 1 && (
             <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce"></div>
          )}
        </button>
      </div>

    </div>,
    document.body
  );
};

const ReportCard: React.FC<ReportCardProps> = ({ report, reportId, isBookmarked, onToggleBookmark, isTeaserMode = false, onUnlock }) => {
  const [chartTab, setChartTab] = useState<'financials' | 'price' | 'peers'>('price');
  const [finSubTab, setFinSubTab] = useState<'overview' | 'table'>('overview');
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const [notes, setNotes] = useState('');
  const [thesis, setThesis] = useState('');
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [activeNotebookTab, setActiveNotebookTab] = useState<'thesis' | 'notes'>('thesis');
  const [isExporting, setIsExporting] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [showValuation, setShowValuation] = useState(false);
  
  // State for Chat Visibility (Lifted from Widget)
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Load feedback and notes from local storage on mount/report change
  useEffect(() => {
    const storedFeedback = localStorage.getItem(`ultramagnus_feedback_${report.ticker}`);
    if (storedFeedback === 'yes' || storedFeedback === 'no') {
      setFeedback(storedFeedback);
    } else {
      setFeedback(null);
    }

    const storedNotes = localStorage.getItem(`ultramagnus_notes_${report.ticker}`);
    setNotes(storedNotes || '');

    const storedThesis = localStorage.getItem(`ultramagnus_thesis_${report.ticker}`);
    setThesis(storedThesis || '');
    
    // Auto-open if content exists, default to correct tab
    if (storedThesis || storedNotes) {
      setIsNotebookOpen(true);
      if (!storedThesis && storedNotes) {
        setActiveNotebookTab('notes');
      } else {
        setActiveNotebookTab('thesis');
      }
    } else {
      setIsNotebookOpen(false);
    }

  }, [report.ticker]);

  const handleFeedback = (isHelpful: boolean) => {
    const value = isHelpful ? 'yes' : 'no';
    setFeedback(value);
    localStorage.setItem(`ultramagnus_feedback_${report.ticker}`, value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setNotes(newValue);
    localStorage.setItem(`ultramagnus_notes_${report.ticker}`, newValue);
  };

  const handleThesisChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setThesis(newValue);
    localStorage.setItem(`ultramagnus_thesis_${report.ticker}`, newValue);
  };

  const handleBookmarkToggle = () => {
    onToggleBookmark({
      ticker: report.ticker,
      companyName: report.companyName,
      currentPrice: report.currentPrice,
      priceChange: report.priceChange,
      verdict: report.verdict,
      addedAt: Date.now(),
      fullReport: report,
      isBookmarked: !isBookmarked
    });
  };

  const isHighScore = report.rocketScore >= 80;
  const isMediumScore = report.rocketScore >= 50 && report.rocketScore < 80;
  
  const scoreColor = isHighScore ? 'text-green-400' : isMediumScore ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = isHighScore ? 'from-green-500/20' : isMediumScore ? 'from-yellow-500/20' : 'from-red-500/20';
  
  // Financial Health Score styling
  const healthScore = report.financialHealthScore || 0;
  const isHealthy = healthScore >= 70;
  const isModerateHealth = healthScore >= 40 && healthScore < 70;
  
  const healthColor = isHealthy ? 'text-emerald-400' : isModerateHealth ? 'text-amber-400' : 'text-rose-400';
  const healthBg = isHealthy ? 'from-emerald-500/20' : isModerateHealth ? 'from-amber-500/20' : 'from-rose-500/20';

  // Momentum Score styling
  const momentumScore = report.momentumAnalysis?.score || 50;
  const isOverbought = momentumScore >= 70;
  const isOversold = momentumScore <= 30;
  
  const momentumColor = isOverbought ? 'text-rose-400' : isOversold ? 'text-emerald-400' : 'text-amber-400';
  const momentumBg = isOverbought ? 'from-rose-500/20' : isOversold ? 'from-emerald-500/20' : 'from-amber-500/20';
  const momentumLabel = report.momentumAnalysis?.signal || (isOverbought ? 'Overbought' : isOversold ? 'Oversold' : 'Neutral');

  const isPriceUp = report.priceChange.startsWith('+');
  const priceColor = isPriceUp ? 'text-green-400' : report.priceChange.startsWith('-') ? 'text-red-400' : 'text-slate-200';

  // Verdict Colors
  const verdictColor = report.verdict === 'BUY' ? 'text-emerald-400' : report.verdict === 'SELL' ? 'text-rose-400' : 'text-amber-400';
  const verdictBg = report.verdict === 'BUY' ? 'bg-emerald-500/5' : report.verdict === 'SELL' ? 'bg-rose-500/5' : 'bg-amber-500/5';
  const VerdictIcon = report.verdict === 'BUY' ? TrendingUp : report.verdict === 'SELL' ? TrendingDown : Minus;
  
  // History Helpers
  const prevVerdictColor = report.history?.previousVerdict === 'BUY' ? 'text-emerald-400' : report.history?.previousVerdict === 'SELL' ? 'text-red-400' : 'text-amber-400';
  const prevVerdictBg = report.history?.previousVerdict === 'BUY' ? 'bg-emerald-500/10' : report.history?.previousVerdict === 'SELL' ? 'bg-red-500/10' : 'bg-amber-500/10';


  // Earnings Analysis Helpers
  const earnings = report.earningsCallAnalysis;
  const sentimentColor = earnings.sentiment === 'Bullish' ? 'text-green-400 bg-green-500/10 border-green-500/20' 
    : earnings.sentiment === 'Bearish' ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

  // Sentiment Analysis Styling
  const overallSentiment = report.overallSentiment || { score: 50, label: "Neutral", summary: "Data unavailable" };
  const sentScore = overallSentiment.score;
  const sentLabel = overallSentiment.label;
  const sentColor = sentScore >= 60 ? 'text-green-400' : sentScore <= 40 ? 'text-red-400' : 'text-amber-400';
  const sentBarColor = sentScore >= 60 ? 'bg-green-500' : sentScore <= 40 ? 'bg-red-500' : 'bg-amber-500';

  // Calculate Upside/Downside for Target Price
  const targetUpside = useMemo(() => {
    try {
      if (!report.priceTarget || !report.currentPrice) return null;
      const current = parsePrice(report.currentPrice);
      const target = parsePrice(report.priceTarget);
      if (isNaN(current) || isNaN(target)) return null;
      
      const pct = ((target - current) / current) * 100;
      return pct;
    } catch (e) {
      return null;
    }
  }, [report.currentPrice, report.priceTarget]);

  const upsideColor = targetUpside && targetUpside > 0 ? 'text-green-400' : targetUpside && targetUpside < 0 ? 'text-red-400' : 'text-slate-200';

  // Scenario Spectrum Calculations
  const scenarioData = useMemo(() => {
    if (!report.scenarioAnalysis) return null;
    const current = parsePrice(report.currentPrice);
    const bear = parsePrice(report.scenarioAnalysis.bear.price);
    const base = parsePrice(report.scenarioAnalysis.base.price);
    const bull = parsePrice(report.scenarioAnalysis.bull.price);

    if (!current || !bear || !base || !bull) return null;

    // Calculate range with 10% buffer
    const min = Math.min(current, bear) * 0.9; 
    const max = Math.max(current, bull) * 1.1;
    const range = max - min;

    const getPos = (val: number) => Math.max(0, Math.min(100, ((val - min) / range) * 100));
    const getPctDiff = (target: number) => ((target - current) / current) * 100;

    return {
      currentPos: getPos(current),
      bearPos: getPos(bear),
      basePos: getPos(base),
      bullPos: getPos(bull),
      bearDiff: getPctDiff(bear),
      baseDiff: getPctDiff(base),
      bullDiff: getPctDiff(bull)
    };
  }, [report.scenarioAnalysis, report.currentPrice]);

  // Visual helper for day's range and 52w range
  const calculatePricePosition = (current: string, low: string, high: string) => {
    const c = parsePrice(current);
    const l = parsePrice(low);
    const h = parsePrice(high);
    if (!c || !l || !h || h === l) return 50;
    return Math.max(0, Math.min(100, ((c - l) / (h - l)) * 100));
  };

  const dayRangePos = calculatePricePosition(report.currentPrice, report.dayLow, report.dayHigh);
  const week52Pos = calculatePricePosition(report.currentPrice, report.week52Low, report.week52High);


  // CSV Export Logic
  const handleExportCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Company', report.companyName],
      ['Ticker', report.ticker],
      ['Report Date', report.reportDate],
      ['Price', report.currentPrice],
      ['Target Price (1Y)', report.priceTarget],
      ['Verdict', report.verdict],
      ['Moonshot Score', report.rocketScore.toString()],
      ['Financial Health Score', (report.financialHealthScore || 0).toString()],
      ['Market Cap', report.marketCap],
      ['P/E Ratio', report.peRatio],
      ['Summary', `"${report.summary.replace(/"/g, '""')}"`],
      ['Verdict Reason', `"${report.verdictReason.replace(/"/g, '""')}"`],
      ['Investment Thesis', `"${thesis.replace(/"/g, '""')}"`],
      ['Analyst Notes', `"${notes.replace(/"/g, '""')}"`]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${report.ticker}_Ultramagnus_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        backgroundColor: '#0f172a', // Match theme background
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${report.ticker}_Ultramagnus_Report.pdf`);
    } catch (error) {
      logger.captureError(error, { meta: { action: 'report.export.pdf', ticker: data.ticker } });
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Price Trend Logic & Data Prep
  const priceChartData = useMemo(() => {
    if (!report.priceHistory || report.priceHistory.length === 0) return [];
    
    const data = report.priceHistory;
    const targets = report.analystPriceTargets || []; // New data
    const totalPoints = data.length;
    const shortTermStart = Math.max(0, totalPoints - 6);

    const longTermTrend = calculateTrendLine(data, 0, totalPoints, totalPoints);
    const shortTermTrend = calculateTrendLine(data, shortTermStart, totalPoints, totalPoints);

    return data.map((point, index) => {
      const ltPoint = longTermTrend.find(p => p.index === index);
      const stPoint = shortTermTrend.find(p => p.index === index);
      // Find matching target for the month
      const targetPoint = targets.find(t => t.month === point.month);
      
      return {
        ...point,
        longTermTrend: ltPoint ? ltPoint.value : null,
        shortTermTrend: stPoint ? stPoint.value : null,
        analystTarget: targetPoint ? targetPoint.averageTarget : null
      };
    });
  }, [report.priceHistory, report.analystPriceTargets]);

  const peerAnalysis = useMemo(() => {
    const parseValue = (val: string | undefined) => {
      if (!val) return 0;
      const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    // Safe access to financials
    const financials = report.financials || [];
    
    // 1. Prepare Target Data
    const latest = financials.length > 0 ? financials[financials.length - 1] : null;
    const prev = financials.length > 1 ? financials[financials.length - 2] : null;
    
    let targetGrowth = 0;
    if (latest && prev && prev.revenue) {
      targetGrowth = ((latest.revenue - prev.revenue) / prev.revenue) * 100;
    }
    
    let targetMargin = 0;
    if (latest && latest.revenue) {
      targetMargin = (latest.netIncome / latest.revenue) * 100;
    }

    const targetData = {
      ticker: report.ticker,
      name: report.companyName,
      marketCap: report.marketCap,
      marketCapVal: parseValue(report.marketCap) * (report.marketCap.includes('T') ? 1000 : 1), // Simple weight for sorting
      peRatio: report.peRatio,
      peVal: parseValue(report.peRatio),
      revenueGrowth: targetGrowth.toFixed(1) + '%',
      growthVal: targetGrowth,
      netMargin: targetMargin.toFixed(1) + '%',
      marginVal: targetMargin,
      isTarget: true
    };

    // 2. Prepare Peer Data (Safe Map)
    const peers = report.peers || [];
    const peersData = peers.map(p => ({
      ticker: p.ticker,
      name: p.name,
      marketCap: p.marketCap,
      marketCapVal: parseValue(p.marketCap) * (p.marketCap.includes('T') ? 1000 : 1),
      peRatio: p.peRatio,
      peVal: parseValue(p.peRatio),
      revenueGrowth: p.revenueGrowth,
      growthVal: parseValue(p.revenueGrowth),
      netMargin: p.netMargin,
      marginVal: parseValue(p.netMargin),
      isTarget: false
    }));

    const all = [targetData, ...peersData].sort((a, b) => b.marketCapVal - a.marketCapVal);
    
    // Calculate Averages for Quadrants
    const validPe = all.filter(d => d.peVal > 0);
    const avgPe = validPe.length > 0 ? validPe.reduce((acc, curr) => acc + curr.peVal, 0) / validPe.length : 0;
    const avgGrowth = all.length > 0 ? all.reduce((acc, curr) => acc + curr.growthVal, 0) / all.length : 0;
    const avgMargin = all.length > 0 ? all.reduce((acc, curr) => acc + curr.marginVal, 0) / all.length : 0;

    // Find Max for bars
    const maxGrowth = all.length > 0 ? Math.max(...all.map(d => Math.abs(d.growthVal))) : 0;
    const maxMargin = all.length > 0 ? Math.max(...all.map(d => Math.abs(d.marginVal))) : 0;

    return { all, avgPe, avgGrowth, avgMargin, maxGrowth, maxMargin };
  }, [report]);

  // KPIs (Safe Access)
  const financials = report.financials || [];
  const latestFin = financials.length > 0 ? financials[financials.length - 1] : null;
  const grossMargin = latestFin?.revenue ? ((latestFin.grossProfit / latestFin.revenue) * 100).toFixed(1) + '%' : 'N/A';
  const netMargin = latestFin?.revenue ? ((latestFin.netIncome / latestFin.revenue) * 100).toFixed(1) + '%' : 'N/A';
  const debtToEquity = latestFin?.shareholderEquity ? (latestFin.totalDebt / latestFin.shareholderEquity).toFixed(2) : 'N/A';
  const roe = latestFin?.shareholderEquity ? ((latestFin.netIncome / latestFin.shareholderEquity) * 100).toFixed(1) + '%' : 'N/A';

  return (
    <div ref={reportRef} className="space-y-8 animate-fade-in-up pb-10">
      
      {/* 1. Header & Identity */}
      <div className="bg-surface rounded-sm p-6 md:p-8 border border-border relative overflow-hidden">
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              <h2 className="text-3xl md:text-4xl font-sans font-semibold text-primary tracking-tight">{report.companyName}</h2>
              <span className="px-2 py-1 rounded-sm text-sm font-mono bg-tertiary/30 text-secondary border border-border">
                {report.ticker}
              </span>
            </div>
            
            {/* REPORT DATE */}
            <div className="flex items-center gap-2 text-xs text-secondary font-mono mb-6">
               <Clock className="w-3 h-3" />
               <span>Report Generated: {report.reportDate || new Date().toLocaleDateString()}</span>
            </div>

            <p className="text-secondary max-w-3xl leading-relaxed text-sm md:text-base border-l-2 border-primary/20 pl-4">
              {report.summary}
            </p>
          </div>
          
          <div className="flex items-center gap-3 print:hidden" data-html2canvas-ignore>
            <button 
              onClick={handleBookmarkToggle}
              className={`px-4 py-2 text-xs font-medium rounded-sm border transition-colors flex items-center gap-2 ${isBookmarked ? 'bg-primary text-white border-primary' : 'bg-transparent hover:bg-tertiary/20 text-secondary border-border'}`}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {isBookmarked ? 'Bookmarked' : 'Bookmark Report'}
            </button>
            <button 
              onClick={handleExportCSV}
              disabled={isExporting}
              className="px-4 py-2 bg-transparent hover:bg-tertiary/20 text-secondary text-xs font-medium rounded-sm border border-border transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Table className="w-4 h-4" /> CSV
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-transparent hover:bg-tertiary/20 text-secondary text-xs font-medium rounded-sm border border-border transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" /> PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. At a Glance Section (REFACTORED: Dieter Rams Style - 3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: THE SIGNAL (Verdict & Current Price) - Unlocked */}
        <div className="bg-surface rounded-sm border border-border flex flex-col divide-y divide-border h-full">
            {/* Verdict */}
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary mb-4">
                   <Target className="w-4 h-4" /> Verdict
                </div>
                <div className={`text-5xl font-sans font-bold ${verdictColor} flex items-center gap-3 mb-2`}>
                   <VerdictIcon className="w-10 h-10" /> {report.verdict}
                </div>
                <div className="text-[10px] text-secondary font-medium px-3 py-1 rounded-full bg-tertiary/10 border border-border">
                  AI Confidence: High
                </div>
            </div>
            {/* Current Price */}
            <div className="p-6 flex-shrink-0 flex flex-col items-center justify-center text-center bg-tertiary/5 h-[140px]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary mb-2">
                   <DollarSign className="w-4 h-4" /> Current Price
                </div>
                <div className="text-3xl font-mono font-bold text-primary mb-1">
                   {report.currentPrice}
                </div>
                <div className={`text-sm font-bold px-3 py-1 rounded-full bg-surface border border-border ${priceColor}`}>
                   {report.priceChange} Today
                </div>
            </div>
            {/* Target Price (mobile-first so price + target stay together) */}
            <div className="p-6 flex-shrink-0 flex flex-col items-center justify-center text-center bg-tertiary/5 h-[140px] lg:hidden">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary mb-2">
                   <Goal className="w-4 h-4" /> 1Y Target
                </div>
                <div className="text-3xl font-mono font-bold text-primary mb-1">
                   {report.priceTarget || 'N/A'}
                </div>
                {targetUpside !== null && (
                  <div className={`text-sm font-bold px-3 py-1 rounded-full bg-surface border border-border ${upsideColor}`}>
                     {targetUpside > 0 ? '+' : ''}{targetUpside.toFixed(1)}% Upside
                  </div>
                )}
                <div className="text-[11px] text-secondary/80 mt-2">Analyst consensus (1Y)</div>
            </div>
        </div>

        {/* COLUMN 2: THE POTENTIAL (Moonshot Score & Target) - Locked */}
        <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Growth Potential" className="bg-surface rounded-sm border border-border flex flex-col divide-y divide-border h-full">
            {/* Moonshot Score */}
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center relative group">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary mb-4">
                   <Rocket className="w-4 h-4" /> Moonshot Score
                </div>
                <div className={`text-6xl font-mono font-medium ${scoreColor} mb-4`}>
                   {report.rocketScore}
                </div>
                <div className="w-full max-w-[200px]">
                   <ExpandableText text={report.rocketReason} />
                </div>
            </div>
            {/* Target Price (desktop) */}
            <div className="p-6 flex-shrink-0 flex flex-col items-center justify-center text-center bg-tertiary/5 h-[140px] hidden lg:flex">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary mb-2">
                   <Goal className="w-4 h-4" /> 1Y Target
                </div>
                <div className="text-3xl font-mono font-bold text-primary mb-1">
                   {report.priceTarget || 'N/A'}
                </div>
                {targetUpside !== null && (
                  <div className={`text-sm font-bold px-3 py-1 rounded-full bg-surface border border-border ${upsideColor}`}>
                     {targetUpside > 0 ? '+' : ''}{targetUpside.toFixed(1)}% Upside
                  </div>
                )}
                <div className="text-[11px] text-secondary/80 mt-2">Analyst consensus (1Y)</div>
            </div>
        </LockedFeature>

        {/* COLUMN 3: THE FUNDAMENTALS (Health & Momentum) - Locked */}
        <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Risk Profile" className="bg-surface rounded-sm border border-border flex flex-col divide-y divide-border h-full">
            {/* Financial Health */}
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center relative group">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary mb-4">
                   <ShieldCheck className="w-4 h-4" /> Financial Health
                </div>
                <div className={`text-5xl font-mono font-medium ${healthColor} mb-4`}>
                   {report.financialHealthScore || 'N/A'}
                </div>
                <div className="w-full max-w-[200px]">
                   <ExpandableText text={report.financialHealthReason || 'Based on balance sheet strength.'} />
                </div>
            </div>
            {/* Momentum */}
            <div className="p-6 flex-shrink-0 flex flex-col items-center justify-center text-center bg-tertiary/5 h-[140px]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary mb-2">
                   <Activity className="w-4 h-4" /> Momentum
                </div>
                <div className={`text-3xl font-mono font-bold ${momentumColor} mb-1`}>
                   {momentumScore}
                </div>
                <div className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-surface border border-border ${momentumColor}`}>
                   {momentumLabel}
                </div>
            </div>
        </LockedFeature>

      </div>

      {/* NEW: Thesis Evolution / Change Log - LOCKED IN TEASER */}
      {report.history && (
        <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Thesis Evolution" className="bg-surface rounded-sm p-6 border border-border shadow-sm relative overflow-hidden">
           <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Verdict Flow Visual */}
              <div className="flex items-center gap-4 bg-tertiary/10 p-4 rounded-sm border border-border w-full md:w-auto justify-center">
                  <div className="flex flex-col items-center">
                     <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${prevVerdictBg} ${prevVerdictColor}`}>
                        {report.history.previousVerdict}
                     </span>
                     <span className="text-[10px] text-secondary mt-1">{report.history.previousDate}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-tertiary" />
                  <div className="flex flex-col items-center">
                     <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${verdictBg} ${verdictColor}`}>
                        {report.verdict}
                     </span>
                     <span className="text-[10px] text-secondary mt-1">Today</span>
                  </div>
              </div>

              <div className="flex-1 w-full">
                 <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Thesis Evolution - What Changed?
                 </h3>
                 <ul className="space-y-2">
                    {report.history.changeRationale.map((reason, idx) => (
                       <li key={idx} className="flex items-start gap-2 text-sm text-primary">
                          <span className="text-primary mt-1.5 w-1.5 h-1.5 rounded-full bg-primary"></span>
                          {reason}
                       </li>
                    ))}
                 </ul>
              </div>
           </div>
        </LockedFeature>
      )}

      {/* NEW: Scenario Analysis Section (REFINED VISUAL) - LOCKED IN TEASER */}
      {report.scenarioAnalysis && scenarioData && (
        <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Scenario Modeling" className="bg-surface rounded-sm p-6 border border-border">
           <h3 className="font-sans font-bold text-lg text-primary mb-6 flex items-center gap-2">
               <BarChart className="w-5 h-5 text-primary" />
               1-Year Scenario Analysis (Bear vs. Bull)
           </h3>
           
           {/* 1. Price Spectrum Visualization */}
           <div className="relative h-24 w-full mb-8 px-8 select-none">
              {/* Track */}
              <div className="absolute top-1/2 left-0 right-0 h-2 bg-tertiary/20 rounded-full transform -translate-y-1/2 border border-border"></div>
              
              {/* Connection Line (Bear to Bull) - Optional context */}
              <div className="absolute top-1/2 h-2 bg-gradient-to-r from-red-100 via-primary/10 to-emerald-100 rounded-full transform -translate-y-1/2 opacity-50" 
                   style={{ left: `${scenarioData.bearPos}%`, right: `${100 - scenarioData.bullPos}%` }}></div>

              {/* Bear Marker (Below) */}
              <div className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-help" style={{ left: `${scenarioData.bearPos}%` }}>
                 <div className="w-4 h-4 rounded-full bg-surface border-[3px] border-red-500 shadow-sm z-10 transition-transform group-hover:scale-110"></div>
                 <div className="absolute top-6 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Bear</span>
                    <span className="text-[10px] font-mono text-secondary">{report.scenarioAnalysis.bear.price}</span>
                    {report.scenarioAnalysis.bear.probability && (
                       <span className="text-[9px] text-red-600/80 font-bold mt-1">{report.scenarioAnalysis.bear.probability}</span>
                    )}
                 </div>
              </div>

              {/* Base Marker (Below) */}
              <div className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-help" style={{ left: `${scenarioData.basePos}%` }}>
                 <div className="w-4 h-4 rounded-full bg-surface border-[3px] border-primary shadow-sm z-10 transition-transform group-hover:scale-110"></div>
                 <div className="absolute top-6 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Base</span>
                    <span className="text-[10px] font-mono text-secondary">{report.scenarioAnalysis.base.price}</span>
                    {report.scenarioAnalysis.base.probability && (
                       <span className="text-[9px] text-primary/80 font-bold mt-1">{report.scenarioAnalysis.base.probability}</span>
                    )}
                 </div>
              </div>

              {/* Bull Marker (Below) */}
              <div className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-help" style={{ left: `${scenarioData.bullPos}%` }}>
                 <div className="w-4 h-4 rounded-full bg-surface border-[3px] border-emerald-500 shadow-sm z-10 transition-transform group-hover:scale-110"></div>
                 <div className="absolute top-6 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Bull</span>
                    <span className="text-[10px] font-mono text-secondary">{report.scenarioAnalysis.bull.price}</span>
                     {report.scenarioAnalysis.bull.probability && (
                       <span className="text-[9px] text-emerald-600/80 font-bold mt-1">{report.scenarioAnalysis.bull.probability}</span>
                    )}
                 </div>
              </div>

              {/* Current Price Marker (Above - Prominent) */}
              <div className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20" style={{ left: `${scenarioData.currentPos}%` }}>
                 <div className="absolute bottom-4 flex flex-col items-center">
                    <div className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-sm shadow-sm whitespace-nowrap mb-1">
                       Current
                    </div>
                    <div className="w-0.5 h-3 bg-gradient-to-b from-primary to-transparent opacity-50"></div>
                 </div>
                 <div className="w-5 h-5 bg-white border-4 border-primary rounded-full shadow-sm"></div>
              </div>
           </div>

           {/* 2. Scenario Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bear Case */}
              <div className="bg-surface rounded-sm border border-red-200 p-5 relative overflow-hidden group hover:bg-red-50 transition-colors">
                 <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                 <div className="flex justify-between items-baseline mb-3">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold uppercase text-red-600 tracking-wider">Bear Case</span>
                       {report.scenarioAnalysis.bear.probability && (
                          <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm border border-red-200">
                             {report.scenarioAnalysis.bear.probability}
                          </span>
                       )}
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-mono font-bold text-primary">{report.scenarioAnalysis.bear.price}</div>
                       <div className="text-[10px] font-bold text-red-600">{scenarioData.bearDiff > 0 ? '+' : ''}{scenarioData.bearDiff.toFixed(1)}%</div>
                    </div>
                 </div>
                 <p className="text-xs text-secondary leading-relaxed border-t border-border pt-3">
                    {report.scenarioAnalysis.bear.logic}
                 </p>
              </div>
              
              {/* Base Case */}
              <div className="bg-surface rounded-sm border border-primary/20 p-5 relative overflow-hidden group hover:bg-primary/5 transition-colors">
                 <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                 <div className="flex justify-between items-baseline mb-3">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold uppercase text-primary tracking-wider">Base Case</span>
                       {report.scenarioAnalysis.base.probability && (
                          <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm border border-primary/20">
                             {report.scenarioAnalysis.base.probability}
                          </span>
                       )}
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-mono font-bold text-primary">{report.scenarioAnalysis.base.price}</div>
                       <div className={`text-[10px] font-bold ${scenarioData.baseDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>{scenarioData.baseDiff > 0 ? '+' : ''}{scenarioData.baseDiff.toFixed(1)}%</div>
                    </div>
                 </div>
                 <p className="text-xs text-secondary leading-relaxed border-t border-border pt-3">
                    {report.scenarioAnalysis.base.logic}
                 </p>
              </div>

              {/* Bull Case */}
              <div className="bg-surface rounded-sm border border-emerald-200 p-5 relative overflow-hidden group hover:bg-emerald-50 transition-colors">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600"></div>
                 <div className="flex justify-between items-baseline mb-3">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Bull Case</span>
                       {report.scenarioAnalysis.bull.probability && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-sm border border-emerald-200">
                             {report.scenarioAnalysis.bull.probability}
                          </span>
                       )}
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-mono font-bold text-primary">{report.scenarioAnalysis.bull.price}</div>
                       <div className="text-[10px] font-bold text-emerald-600">{scenarioData.bullDiff > 0 ? '+' : ''}{scenarioData.bullDiff.toFixed(1)}%</div>
                    </div>
                 </div>
                 <p className="text-xs text-secondary leading-relaxed border-t border-border pt-3">
                    {report.scenarioAnalysis.bull.logic}
                 </p>
              </div>
           </div>
        </LockedFeature>
      )}

      {/* 2.5 Financial Modeling (DCF) */}
      {/* 2.5 Financial Modeling (AI Assessment) */}
      {report.aiAssessment && (
      <LockedFeature label="Financial Modeling" isLocked={isTeaserMode} onUnlock={onUnlock}>
        <div className="bg-surface rounded-sm border border-border p-6">
           <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="text-lg font-bold text-primary">Valuation Model: {report.aiAssessment.method.replace(/_/g, ' ').toUpperCase()}</h3>
                 <p className="text-xs text-secondary mt-1">AI-Generated Assessment • {report.aiAssessment.valuation.notes}</p>
              </div>
              <div className="text-right">
                 <div className="text-2xl font-mono font-bold text-primary">
                    {report.aiAssessment.valuation.currency} {report.aiAssessment.valuation.intrinsicValue.toFixed(2)}
                 </div>
                 <div className={`text-xs font-bold ${report.aiAssessment.valuation.upsidePct > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Implied Upside: {report.aiAssessment.valuation.upsidePct > 0 ? '+' : ''}{report.aiAssessment.valuation.upsidePct.toFixed(1)}%
                 </div>
              </div>
           </div>

           {/* Inputs Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                 <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Model Inputs</h4>
                 <table className="w-full text-xs">
                    <thead>
                       <tr className="border-b border-border text-secondary">
                          <th className="text-left py-2 font-medium">Metric</th>
                          <th className="text-right py-2 font-medium">Value</th>
                          <th className="text-right py-2 font-medium">Note</th>
                       </tr>
                    </thead>
                    <tbody className="font-mono">
                       {report.aiAssessment.valuation.inputs.map((input, i) => (
                          <tr key={i} className="border-b border-border/50">
                             <td className="py-2 text-secondary capitalize">{input.name.replace(/_/g, ' ')}</td>
                             <td className="py-2 text-right font-bold text-primary">
                                {input.value} <span className="text-[10px] text-secondary font-normal">{input.unit}</span>
                             </td>
                             <td className="py-2 text-right text-secondary italic text-[10px]">{input.note}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              
              <div className="flex flex-col justify-center">
                 <div className="bg-tertiary/5 p-4 rounded-sm border border-border">
                    <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Thesis Highlights</h4>
                    <ul className="space-y-2">
                       {report.aiAssessment.thesis.bullets.map((bullet, i) => (
                          <li key={i} className="flex gap-2 text-xs text-primary leading-relaxed">
                             <span className="text-emerald-500 font-bold">•</span>
                             {bullet}
                          </li>
                       ))}
                    </ul>
                 </div>
                 
                 {report.aiAssessment.risks && report.aiAssessment.risks.length > 0 && (
                    <div className="mt-4">
                       <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Key Risks</h4>
                       <div className="flex flex-wrap gap-2">
                          {report.aiAssessment.risks.map((risk, i) => (
                             <span key={i} className="px-2 py-1 bg-red-50 text-red-700 border border-red-100 rounded-sm text-[10px] font-bold">
                                {risk}
                             </span>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </LockedFeature>
      )}

      {/* 3. Detailed Stats Grid (REFACTORED: 3-Panel Dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-surface rounded-sm p-6 border border-border">
         {/* 1. Valuation Metrics */}
         <div className="flex flex-col justify-between">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Valuation</h4>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="text-xl font-mono font-bold text-primary">{report.marketCap}</div>
                  <div className="text-xs text-secondary">Market Cap</div>
               </div>
               <div>
                  <div className="text-xl font-mono font-bold text-primary">{report.peRatio}</div>
                  <div className="text-xs text-secondary">P/E Ratio</div>
               </div>
            </div>
         </div>

         {/* 2. Day's Range */}
         <div className="border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
             <div className="flex justify-between items-end mb-2">
                 <h4 className="text-xs font-bold text-secondary uppercase tracking-widest">Day's Range</h4>
                 <div className="flex gap-4 font-mono text-xs">
                    <span className="text-secondary">{report.dayLow}</span>
                    <span className="text-secondary">{report.dayHigh}</span>
                 </div>
             </div>
             <div className="relative h-2 bg-tertiary/20 rounded-full overflow-hidden">
                <div className="absolute top-0 bottom-0 bg-primary rounded-full opacity-50" style={{ left: '0%', right: '0%' }}></div> {/* Fills full width visually as background for range */}
                <div className="absolute top-0 bottom-0 w-1 bg-primary" style={{ left: `${dayRangePos}%` }}></div>
             </div>
             <div className="flex justify-between text-xs text-secondary mt-1">
                <span>Low</span>
                <span>High</span>
             </div>
         </div>

         {/* 3. 52-Week Range */}
         <div className="border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
             <div className="flex justify-between items-end mb-2">
                 <h4 className="text-xs font-bold text-secondary uppercase tracking-widest">52-Week Range</h4>
                 <div className="flex gap-4 font-mono text-xs">
                    <span className="text-secondary">{report.week52Low}</span>
                    <span className="text-secondary">{report.week52High}</span>
                 </div>
             </div>
             <div className="relative h-2 bg-tertiary/20 rounded-full overflow-hidden">
                <div className="absolute top-0 bottom-0 bg-tertiary/20 w-full"></div>
                <div className="absolute top-0 bottom-0 bg-primary" style={{ width: `${week52Pos}%` }}></div>
                <div className="absolute top-0 bottom-0 w-1 bg-primary shadow-sm" style={{ left: `${week52Pos}%` }}></div>
             </div>
             <div className="flex justify-between text-xs text-secondary mt-1">
                <span>Low</span>
                <span>High</span>
             </div>
         </div>
      </div>
      
      {/* 4. SMART MONEY & RISK PROFILE - LOCKED IN TEASER */}
      <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Institutional Data" className="bg-surface rounded-sm p-6 border border-border shadow-sm">
         <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="bg-tertiary/10 p-2 rounded-sm border border-border">
               <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-sans font-bold text-lg text-primary">Smart Money & Risk Profile</h3>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Risk Metrics */}
            <div className="space-y-6">
               <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Risk Calibration
               </h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-tertiary/10 p-4 rounded-sm border border-border text-center">
                     <div className="text-xs text-secondary uppercase font-bold mb-1">Beta (Volatility)</div>
                     <div className="text-xl font-mono font-bold text-primary">{report.riskMetrics?.beta || "N/A"}</div>
                     <div className="text-xs text-secondary mt-1">vs S&P 500</div>
                  </div>
                  <div className="bg-tertiary/10 p-4 rounded-sm border border-border text-center">
                     <div className="text-xs text-secondary uppercase font-bold mb-1">Short Interest</div>
                     <div className="text-xl font-mono font-bold text-amber-600">{report.riskMetrics?.shortInterestPercentage || "N/A"}</div>
                     <div className="text-xs text-secondary mt-1">of Float</div>
                  </div>
               </div>
               <div className="flex justify-between items-center text-xs text-secondary px-1 border-t border-border pt-3">
                  <span>Days to Cover: <span className="text-primary font-mono">{report.riskMetrics?.shortInterestRatio || "N/A"}</span></span>
                  <span>Volatility: <span className="text-primary font-mono">{report.riskMetrics?.volatility || "N/A"}</span></span>
               </div>
            </div>

            {/* Institutional Sentiment */}
            <div className="space-y-4 lg:border-x border-border lg:px-6 flex flex-col justify-center">
               <h4 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Institutional Sentiment
               </h4>
               <div>
                  <div className="text-xs font-medium text-primary leading-relaxed text-left">
                     {report.institutionalSentiment || "N/A"}
                  </div>
                  <p className="text-[10px] text-secondary mt-2 leading-relaxed text-left">
                     Tracks major hedge fund and mutual fund flows over the last reporting period.
                  </p>
               </div>
            </div>

            {/* Insider Activity */}
            <div className="space-y-4">
               <h4 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Recent Insider Activity
               </h4>
               {report.insiderActivity && report.insiderActivity.length > 0 ? (
                  <div className="space-y-3">
                     {report.insiderActivity.map((txn, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-tertiary/10 rounded-sm border border-border">
                           <div>
                              <div className="text-xs font-bold text-primary">{txn.insiderName}</div>
                              <div className="text-[10px] text-secondary">{txn.role} • {txn.transactionDate}</div>
                           </div>
                           <div className="text-right">
                              <div className={`text-xs font-bold ${txn.transactionType === 'Buy' ? 'text-emerald-600' : 'text-red-600'}`}>
                                 {txn.transactionType}
                              </div>
                              <div className="text-[10px] font-mono text-secondary">{txn.value}</div>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="text-xs text-secondary italic text-center py-4">No recent insider filings found.</div>
               )}
            </div>
         </div>
      </LockedFeature>

      {/* 5. QUALITATIVE ANALYSIS: MOAT & MANAGEMENT - LOCKED IN TEASER */}
      <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Qualitative Analysis" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {report.moatAnalysis && (
           <div className="bg-surface rounded-sm p-6 border border-border shadow-sm flex flex-col h-full">
              {/* MOAT CONTENT */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                 <div className="bg-tertiary/10 p-2 rounded-sm border border-border shadow-sm">
                    <Castle className="w-5 h-5 text-amber-600" />
                 </div>
                 <h3 className="font-sans font-bold text-lg text-primary">Economic Moat</h3>
                 <div className={`ml-auto px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider border ${
                    report.moatAnalysis.moatRating === 'Wide' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                    report.moatAnalysis.moatRating === 'Narrow' ? 'bg-yellow-100 text-yellow-600 border-yellow-200' :
                    'bg-tertiary/10 text-secondary border-border'
                 }`}>
                    {report.moatAnalysis.moatRating} Moat
                 </div>
              </div>
              <div className="flex-1 space-y-4">
                 <div>
                    <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">Primary Source</div>
                    <div className="text-xs md:text-sm font-bold text-primary bg-tertiary/10 p-3 rounded-sm border border-border">
                       {report.moatAnalysis.moatSource}
                    </div>
                 </div>
                 <div>
                    <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">Strategic Rationale</div>
                    <p className="text-xs text-primary leading-relaxed p-3 rounded-sm bg-tertiary/5 border border-transparent">
                       {report.moatAnalysis.rationale}
                    </p>
                 </div>
              </div>
           </div>
        )}

        {report.managementQuality && (
           <div className="bg-surface rounded-sm p-6 border border-border shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                 <div className="bg-tertiary/10 p-2 rounded-sm border border-border shadow-sm">
                    <UserCheck className="w-5 h-5 text-primary" />
                 </div>
                 <h3 className="font-sans font-bold text-lg text-primary">Management & Governance</h3>
              </div>
              
              <div className="flex-1 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-tertiary/10 p-3 rounded-sm border border-border">
                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Tenure</div>
                        <div className="text-xs md:text-sm font-medium text-primary leading-snug">{report.managementQuality.executiveTenure}</div>
                    </div>
                    <div className="bg-tertiary/10 p-3 rounded-sm border border-border">
                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Insider Own</div>
                        <div className="text-xs md:text-sm font-medium text-primary leading-snug">{report.managementQuality.insiderOwnership}</div>
                    </div>
                 </div>

                 <div>
                    <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Track Record</div>
                    <div className="text-xs text-primary leading-relaxed bg-tertiary/5 p-2 rounded-sm border border-border">{report.managementQuality.trackRecord}</div>
                 </div>

                 <div>
                    <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
                         <AlertTriangle className="w-3 h-3 text-amber-600" /> Governance Check
                    </div>
                    <div className="text-xs text-primary leading-relaxed bg-tertiary/5 p-2 rounded-sm border border-border">{report.managementQuality.governanceRedFlags}</div>
                 </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                 <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Analyst Verdict</div>
                 <p className="text-sm font-bold text-primary italic border-l-2 border-primary pl-3">
                    "{report.managementQuality.verdict}"
                 </p>
              </div>
           </div>
        )}
      </LockedFeature>

      {/* 6. Factor Analysis (Side by Side) - LOCKED IN TEASER */}
      <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Factor Analysis" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FactorCard 
          title="Short-Term Outlook (1-6 Mo)" 
          factors={report.shortTermFactors} 
          icon={<Activity className="w-5 h-5 text-primary" />}
        />
        <FactorCard 
          title="Long-Term Outlook (6 Mo+)" 
          factors={report.longTermFactors} 
          icon={<Target className="w-5 h-5 text-primary" />}
        />
      </LockedFeature>

      {/* 7. Main Analysis Area (Tabs) */}
      <div className="bg-surface rounded-sm border border-border flex flex-col overflow-hidden min-h-[500px]">
        {/* Main Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-tertiary/5">
            <div className="flex items-center gap-2 bg-tertiary/10 p-1 rounded-sm border border-border overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setChartTab('price')}
                className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-sm transition-all whitespace-nowrap ${chartTab === 'price' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
              >
                <Activity className="w-4 h-4" />
                Price Action
              </button>
              <button 
                onClick={() => setChartTab('financials')}
                className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-sm transition-all whitespace-nowrap ${chartTab === 'financials' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
              >
                <BarChart2 className="w-4 h-4" />
                Financial Deep Dive
              </button>
              <button 
                onClick={() => setChartTab('peers')}
                className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-sm transition-all whitespace-nowrap ${chartTab === 'peers' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
              >
                <Users className="w-4 h-4" />
                Peer Comparison
              </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-background relative">
          
          {/* PRICE ACTION TAB */}
          {chartTab === 'price' && (
             <div className="h-full min-h-[400px] p-6 animate-fade-in">
               {report.priceHistory && report.priceHistory.length > 0 ? (
                 <ResponsiveContainer width="100%" height={400}>
                   <ComposedChart data={priceChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" tick={{fontSize: 12}} />
                      <YAxis stroke="#64748b" tick={{fontSize: 12}} domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                        itemStyle={{ color: '#0f172a' }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#0f172a" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#priceGradient)" 
                        name="Price ($)"
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                      <Line 
                        type="linear" 
                        dataKey="shortTermTrend" 
                        stroke="#22c55e" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={false} 
                        name="Short-Term Trend"
                        animationDuration={1500}
                        animationBegin={300}
                      />
                      <Line 
                        type="linear" 
                        dataKey="longTermTrend" 
                        stroke="#eab308" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={false} 
                        name="Long-Term Trend"
                        animationDuration={1500}
                        animationBegin={600}
                      />
                      <Line 
                        type="step" 
                        dataKey="analystTarget" 
                        stroke="#d946ef" 
                        strokeWidth={2} 
                        strokeDasharray="3 3" 
                        dot={{ r: 3, fill: '#d946ef', strokeWidth: 1 }}
                        name="Avg Analyst Target"
                        animationDuration={1500}
                        animationBegin={900}
                      />
                   </ComposedChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-secondary">
                    Price history unavailable
                 </div>
               )}
             </div>
          )}

          {/* FINANCIALS TAB */}
          {chartTab === 'financials' && (
            <div className="p-6 animate-fade-in space-y-6">
               {/* Financial Sub-nav */}
               <div className="flex justify-center mb-6">
                  <div className="bg-tertiary/10 rounded-sm p-1 flex gap-2">
                     <button 
                       onClick={() => setFinSubTab('overview')}
                       className={`px-4 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider transition-colors ${finSubTab === 'overview' ? 'bg-primary text-white' : 'text-secondary hover:text-primary'}`}
                     >
                       Overview Charts
                     </button>
                     <button 
                       onClick={() => setFinSubTab('table')}
                       className={`px-4 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider transition-colors ${finSubTab === 'table' ? 'bg-primary text-white' : 'text-secondary hover:text-primary'}`}
                     >
                       Data Tables
                     </button>
                  </div>
               </div>

               {finSubTab === 'overview' ? (
                 <div className="space-y-8">
                   {/* KPI Grid */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KPICard label="Gross Margin" value={grossMargin} />
                      <KPICard label="Net Margin" value={netMargin} />
                      <KPICard label="ROE" value={roe} />
                      <KPICard label="Debt/Equity" value={debtToEquity} />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px]">
                      {/* Margin Chart */}
                      <div className="bg-tertiary/5 rounded-sm p-4 border border-border">
                         <h4 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2"><PieChart className="w-4 h-4" /> Profitability Trends</h4>
                         <ResponsiveContainer width="100%" height="85%">
                            <ReBarChart data={financials}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                               <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                               <YAxis stroke="#64748b" fontSize={10} />
                               <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }} />
                               <Legend wrapperStyle={{fontSize: '10px'}} />
                               <Bar dataKey="revenue" fill="#0f172a" name="Revenue" radius={[4, 4, 0, 0]} />
                               <Bar dataKey="grossProfit" fill="#475569" name="Gross Profit" radius={[4, 4, 0, 0]} />
                               <Bar dataKey="netIncome" fill="#22c55e" name="Net Income" radius={[4, 4, 0, 0]} />
                            </ReBarChart>
                         </ResponsiveContainer>
                      </div>

                      {/* Cash Flow Chart */}
                      <div className="bg-tertiary/5 rounded-sm p-4 border border-border">
                         <h4 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cash Flow Efficiency</h4>
                         <ResponsiveContainer width="100%" height="85%">
                            <AreaChart data={financials}>
                               <defs>
                                  <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                  </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                               <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                               <YAxis stroke="#64748b" fontSize={10} />
                               <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }} />
                               <Legend wrapperStyle={{fontSize: '10px'}} />
                               <Area type="monotone" dataKey="operatingCashFlow" stroke="#22c55e" fill="url(#cfGradient)" name="Operating Cash" />
                               <Area type="monotone" dataKey="freeCashFlow" stroke="#eab308" fill="transparent" strokeDasharray="5 5" name="Free Cash Flow" />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-8">
                    {/* Income Statement */}
                    <div className="bg-tertiary/5 rounded-sm border border-border overflow-hidden">
                       <div className="px-4 py-3 bg-tertiary/10 border-b border-border">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Income Statement</h4>
                       </div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                             <thead className="bg-tertiary/10 text-secondary font-mono text-xs uppercase">
                                <tr>
                                   <th className="px-4 py-3">Metric (Billions)</th>
                                   {financials.map(f => <th key={f.year} className="px-4 py-3">{f.year}</th>)}
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-border text-primary">
                                <tr><td className="px-4 py-3 font-medium text-primary">Revenue</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.revenue}</td>)}</tr>
                                <tr><td className="px-4 py-3">Gross Profit</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.grossProfit}</td>)}</tr>
                                <tr><td className="px-4 py-3">Operating Income</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.operatingIncome}</td>)}</tr>
                                <tr><td className="px-4 py-3 font-medium text-primary">Net Income</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.netIncome}</td>)}</tr>
                                <tr><td className="px-4 py-3 text-secondary">EPS</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.eps}</td>)}</tr>
                             </tbody>
                          </table>
                       </div>
                    </div>

                    {/* Balance Sheet */}
                    <div className="bg-tertiary/5 rounded-sm border border-border overflow-hidden">
                       <div className="px-4 py-3 bg-tertiary/10 border-b border-border">
                          <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Balance Sheet</h4>
                       </div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                             <thead className="bg-tertiary/10 text-secondary font-mono text-xs uppercase">
                                <tr>
                                   <th className="px-4 py-3">Metric (Billions)</th>
                                   {financials.map(f => <th key={f.year} className="px-4 py-3">{f.year}</th>)}
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-border text-primary">
                                <tr><td className="px-4 py-3 font-medium text-primary">Cash & Equivalents</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.cashAndEquivalents}</td>)}</tr>
                                <tr><td className="px-4 py-3">Total Debt</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.totalDebt}</td>)}</tr>
                                <tr><td className="px-4 py-3">Shareholder Equity</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.shareholderEquity}</td>)}</tr>
                             </tbody>
                          </table>
                       </div>
                    </div>

                    {/* Cash Flow */}
                    <div className="bg-tertiary/5 rounded-sm border border-border overflow-hidden">
                       <div className="px-4 py-3 bg-tertiary/10 border-b border-border">
                          <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Cash Flow</h4>
                       </div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                             <thead className="bg-tertiary/10 text-secondary font-mono text-xs uppercase">
                                <tr>
                                   <th className="px-4 py-3">Metric (Billions)</th>
                                   {financials.map(f => <th key={f.year} className="px-4 py-3">{f.year}</th>)}
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-border text-primary">
                                <tr><td className="px-4 py-3 font-medium text-primary">Operating Cash Flow</td>{financials.map(f => <td key={f.year} className="px-4 py-3">{f.operatingCashFlow}</td>)}</tr>
                                <tr><td className="px-4 py-3">Capital Expenditure</td>{financials.map(f => <td key={f.year} className="px-4 py-3 text-red-600">({f.capitalExpenditure})</td>)}</tr>
                                <tr className="bg-tertiary/5"><td className="px-4 py-3 font-medium text-emerald-600">Free Cash Flow</td>{financials.map(f => <td key={f.year} className="px-4 py-3 font-mono text-emerald-600 font-bold">{f.freeCashFlow}</td>)}</tr>
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* PEERS TAB */}
          {chartTab === 'peers' && (
            <div className="p-6 animate-fade-in space-y-8">
                
                {/* 1. Competitive Matrix (Chart) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-tertiary/5 rounded-sm p-4 border border-border h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                             <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" /> 
                                Competitive Matrix: Valuation vs. Growth
                             </h4>
                             <div className="flex gap-4 text-[10px] text-secondary">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> {report.ticker}</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-secondary"></div> Peers</span>
                             </div>
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                                <XAxis 
                                    type="number" 
                                    dataKey="peVal" 
                                    name="P/E Ratio" 
                                    stroke="#64748b" 
                                    label={{ value: 'Valuation (P/E Ratio)', position: 'bottom', fill: '#64748b', fontSize: 10, offset: 0 }} 
                                    fontSize={10} 
                                    domain={['auto', 'auto']}
                                />
                                <YAxis 
                                    type="number" 
                                    dataKey="growthVal" 
                                    name="Revenue Growth %" 
                                    stroke="#64748b" 
                                    label={{ value: 'Revenue Growth %', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} 
                                    fontSize={10} 
                                />
                                <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white border border-border p-3 rounded-sm shadow-sm z-50">
                                                    <div className="font-bold text-primary mb-1 flex items-center gap-2">
                                                      {data.isTarget && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                                                      {data.ticker}
                                                    </div>
                                                    <div className="text-xs text-secondary">{data.name}</div>
                                                    <div className="my-2 border-t border-border"></div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                        <span className="text-secondary">P/E Ratio:</span>
                                                        <span className="text-primary font-mono text-right">{data.peRatio}</span>
                                                        <span className="text-secondary">Growth:</span>
                                                        <span className={`font-mono text-right ${data.growthVal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{data.revenueGrowth}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                {/* Quadrant Lines */}
                                <ReferenceLine x={peerAnalysis.avgPe} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} label={{ value: "Avg P/E", position: 'insideTopRight', fill: '#eab308', fontSize: 10 }} />
                                <ReferenceLine y={peerAnalysis.avgGrowth} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} label={{ value: "Avg Growth", position: 'insideTopRight', fill: '#eab308', fontSize: 10 }} />
                                
                                <Scatter name="Companies" data={peerAnalysis.all}>
                                    {peerAnalysis.all.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.isTarget ? '#0f172a' : '#94a3b8'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Matrix Insights / Legend */}
                    <div className="bg-tertiary/5 rounded-sm p-6 border border-border flex flex-col justify-center space-y-6">
                        <div>
                            <h5 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Understanding the Matrix</h5>
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-sm border border-emerald-200 h-fit">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-emerald-600">High Growth, Low P/E</div>
                                        <div className="text-[10px] text-secondary leading-tight mt-0.5">Potentially undervalued relative to growth. The "Sweet Spot".</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="p-2 bg-primary/10 rounded-sm border border-primary/20 h-fit">
                                        <Zap className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-primary">High Growth, High P/E</div>
                                        <div className="text-[10px] text-secondary leading-tight mt-0.5">Momentum stocks with high expectations priced in.</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="p-2 bg-tertiary/10 rounded-sm border border-border h-fit">
                                        <ShieldCheck className="w-4 h-4 text-secondary" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-primary">Low Growth, Low P/E</div>
                                        <div className="text-[10px] text-secondary leading-tight mt-0.5">Mature "Value" stocks or distressed assets.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Industry Leaderboard (Table) */}
                <div className="bg-tertiary/5 rounded-sm border border-border overflow-hidden">
                     <div className="px-6 py-4 bg-tertiary/10 border-b border-border flex justify-between items-center">
                        <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> Industry Peer Comparison
                        </h4>
                        <div className="text-[10px] text-secondary hidden md:block">Sorted by Market Cap</div>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                           <thead className="bg-tertiary/10 text-secondary font-mono text-[10px] uppercase tracking-wider">
                              <tr>
                                 <th className="px-6 py-4 font-bold">Company</th>
                                 <th className="px-6 py-4 font-bold text-right">Market Cap</th>
                                 <th className="px-6 py-4 font-bold text-right">P/E Ratio</th>
                                 <th className="px-6 py-4 font-bold text-right w-1/5">Revenue Growth</th>
                                 <th className="px-6 py-4 font-bold text-right w-1/5">Net Margin</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-border text-primary">
                              {peerAnalysis.all.map((peer, i) => (
                                 <tr 
                                     key={i} 
                                     className={`group transition-colors ${peer.isTarget ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-tertiary/5'}`}
                                 >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-bold ${peer.isTarget ? 'bg-primary text-white shadow-sm' : 'bg-tertiary/20 text-primary'}`}>
                                                {peer.ticker.substring(0, 2)}
                                            </div>
                                            <div>
                                                <div className={`font-bold ${peer.isTarget ? 'text-primary' : 'text-primary'}`}>{peer.ticker}</div>
                                                <div className="text-[10px] text-secondary truncate max-w-[120px] md:max-w-[200px]">{peer.name}</div>
                                            </div>
                                            {peer.isTarget && <span className="ml-2 px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-primary text-white uppercase">You</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-primary">
                                        {peer.marketCap}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-block px-2 py-1 rounded-sm bg-tertiary/10 border border-border font-mono text-xs">
                                            {peer.peRatio}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`font-mono font-bold ${peer.growthVal > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {peer.revenueGrowth}
                                            </span>
                                            {/* Growth Bar */}
                                            <div className="w-24 h-1.5 bg-tertiary/20 rounded-full overflow-hidden relative">
                                                <div 
                                                    className={`absolute top-0 bottom-0 left-0 rounded-full ${peer.growthVal > 0 ? 'bg-emerald-600' : 'bg-red-600'}`} 
                                                    style={{ width: `${Math.min(100, Math.max(5, (Math.abs(peer.growthVal) / (peerAnalysis.maxGrowth || 1)) * 100))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`font-mono font-bold ${peer.marginVal > 0 ? 'text-primary' : 'text-amber-600'}`}>
                                                {peer.netMargin}
                                            </span>
                                            {/* Margin Bar (Handling Negative) */}
                                            <div className="w-24 h-1.5 bg-tertiary/20 rounded-full overflow-hidden flex relative">
                                                <div 
                                                    className={`absolute top-0 bottom-0 left-0 rounded-full ${peer.marginVal > 0 ? 'bg-primary' : 'bg-amber-600'}`} 
                                                    style={{ width: `${Math.min(100, Math.max(5, (Math.abs(peer.marginVal) / (peerAnalysis.maxMargin || 1)) * 100))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                </div>
            </div>
          )}

        </div>
      </div>

      {/* 8. Market Sentiment & Intelligence */}
      <div className="space-y-6">
         {/* Sentiment Analysis Gauge */}
         <div className="bg-surface rounded-sm p-6 border border-border shadow-sm">
            <h3 className="text-lg font-sans font-bold text-primary mb-4 flex items-center gap-2">
               <Gauge className="w-5 h-5 text-primary" />
               Market Sentiment Analysis
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
               <div className="w-full md:w-1/3 text-center">
                  <div className={`text-3xl font-bold mb-1 ${sentColor}`}>{sentLabel}</div>
                  <div className="text-xs text-secondary font-mono">Sentiment Score: {sentScore}/100</div>
                  {/* Gauge Visual */}
                  <div className="mt-3 h-3 bg-tertiary/20 rounded-full overflow-hidden relative border border-border">
                     <div className={`h-full ${sentBarColor} transition-all duration-1000`} style={{ width: `${sentScore}%` }}></div>
                     <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-primary/20"></div> {/* Midpoint marker */}
                  </div>
                  <div className="flex justify-between text-[10px] text-secondary mt-1 px-1">
                     <span>Bearish</span>
                     <span>Neutral</span>
                     <span>Bullish</span>
                  </div>
               </div>
               <div className="flex-1 text-sm text-primary leading-relaxed border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <p className="font-bold text-secondary text-xs uppercase mb-2">Aggregated Sentiment Summary</p>
                  "{overallSentiment.summary}"
               </div>
            </div>
         </div>

         {/* News & Earnings Grid (Refactored to match request) */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Headlines */}
            <div className="bg-surface rounded-sm p-6 border border-border shadow-sm flex flex-col h-full">
               <h3 className="text-lg font-sans font-bold text-primary mb-4 flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-primary" />
                  Recent Headlines
               </h3>
               <div className="space-y-4 flex-1">
                  {report.recentNews.map((news, idx) => (
                     <div key={idx} className="group pl-4 border-l-2 border-border hover:border-primary transition-colors">
                        <div className="text-xs text-secondary font-mono mb-1">{news.date}</div>
                        <p className="text-primary text-sm font-medium group-hover:text-primary transition-colors">{news.headline}</p>
                     </div>
                  ))}
               </div>
            </div>

            {/* Earnings & Catalysts Stack (UNIFIED CARD) */}
            <div className="bg-surface rounded-sm p-6 border border-border shadow-sm flex flex-col h-full">
               
               {/* 1. Earnings Section */}
               <div className="mb-6 pb-6 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-sans font-bold text-primary flex items-center gap-2">
                        <PhoneCall className="w-5 h-5 text-emerald-600" />
                        Earnings Call Pulse
                     </h3>
                     <div className={`px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider border ${sentimentColor}`}>
                        {earnings.sentiment}
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                     <p className="text-primary text-sm leading-relaxed">
                        {earnings.summary}
                     </p>
                     <div className="bg-tertiary/10 rounded-sm p-3 border border-border">
                        <h4 className="text-xs text-secondary font-bold uppercase mb-2">Key Takeaways</h4>
                        <ul className="space-y-1.5">
                           {earnings.keyTakeaways.map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-primary">
                                 <span className="text-primary mt-1">•</span>
                                 {point}
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>
               </div>
               
               {/* 2. Catalyst Section */}
               <div className="flex-1">
                  <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                     <Zap className="w-4 h-4" />
                     Catalyst Calendar
                  </h3>
                  <div className="space-y-3">
                     {report.upcomingEvents.map((event, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                           <div className="flex items-center gap-3">
                              <div className="font-mono text-xs text-secondary">{event.date}</div>
                              <div className="text-primary font-medium">{event.event}</div>
                           </div>
                           <div className={`px-2 py-0.5 text-xs font-bold rounded-sm border ${
                              event.impact === 'High' ? 'bg-red-100 text-red-600 border-red-200' :
                              event.impact === 'Medium' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                              'bg-tertiary/10 text-secondary border-border'
                           }`}>
                              {event.impact} Impact
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* 9. Detailed Analyst Conclusion - LOCKED IN TEASER */}
      <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Detailed Conclusion" className="bg-surface rounded-sm p-8 border border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
           <Rocket className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8">
           <div className="flex-1">
              <h3 className="text-xl font-sans font-bold text-primary mb-4 flex items-center gap-2">
                 Detailed Analyst Conclusion
              </h3>
              <p className="text-primary leading-relaxed text-sm md:text-base">
                 {report.verdictReason}
              </p>
              <div className="mt-6 p-4 bg-tertiary/10 rounded-sm border border-border">
                 <h4 className="text-sm font-bold text-secondary uppercase tracking-wider mb-2">Valuation Context</h4>
                 <p className="text-secondary text-sm">{report.valuation}</p>
              </div>
           </div>
           
           <div className="w-full md:w-64 pt-6 md:pt-0 md:border-l border-border md:pl-8 flex flex-col gap-4">
              <div>
                 <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Sector Tags</h4>
                 <div className="flex flex-wrap gap-2">
                    {report.tags.map(tag => (
                       <span key={tag} className="px-2 py-1 bg-tertiary/10 text-primary text-xs rounded-sm border border-border">
                          #{tag}
                       </span>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </LockedFeature>

      {/* 10. Combined Analyst Notebook (Thesis + Notes) - LOCKED IN TEASER */}
      <LockedFeature isLocked={isTeaserMode} onUnlock={onUnlock} label="Analyst Notebook" className="bg-surface rounded-sm border border-border shadow-sm overflow-hidden group print:hidden" data-html2canvas-ignore>
        <button 
          onClick={() => setIsNotebookOpen(!isNotebookOpen)}
          className="w-full flex items-center justify-between p-6 bg-tertiary/5 hover:bg-tertiary/10 transition-colors"
        >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-sm border border-primary/20">
                  <NotebookPen className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-sans font-bold text-lg text-primary">Analyst Notebook</h3>
              <span className="ml-2 text-[10px] text-secondary font-mono uppercase tracking-wider bg-tertiary/10 px-2 py-1 rounded-sm border border-border">
                  Private & Auto-saved
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-secondary transition-transform duration-300 ${isNotebookOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${isNotebookOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-6 pt-0">
               {/* Tabs */}
               <div className="flex items-center gap-4 mb-4 border-b border-border">
                  <button
                    onClick={() => setActiveNotebookTab('thesis')}
                    className={`pb-2 text-sm font-bold transition-all border-b-2 ${activeNotebookTab === 'thesis' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
                  >
                    Investment Thesis
                  </button>
                  <button
                    onClick={() => setActiveNotebookTab('notes')}
                    className={`pb-2 text-sm font-bold transition-all border-b-2 ${activeNotebookTab === 'notes' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
                  >
                    Scratchpad & Notes
                  </button>
               </div>

               {/* Content */}
               {activeNotebookTab === 'thesis' ? (
                 <div className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2 text-xs text-amber-600">
                       <Lightbulb className="w-3 h-3" />
                       <span>Why do you own this? What is your exit strategy? (Used by AI Assistant)</span>
                    </div>
                    <textarea
                       value={thesis}
                       onChange={handleThesisChange}
                       placeholder="Draft your core thesis here..."
                       className="w-full min-h-[200px] bg-white border border-border rounded-sm p-4 text-sm text-primary placeholder-secondary focus:outline-none focus:border-amber-500 focus:bg-white transition-all resize-y font-mono custom-scrollbar"
                    />
                 </div>
               ) : (
                 <div className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2 text-xs text-primary">
                       <NotebookPen className="w-3 h-3" />
                       <span>Key levels, risks, or reminders.</span>
                    </div>
                    <textarea
                       value={notes}
                       onChange={handleNotesChange}
                       placeholder="Record quick notes here..."
                       className="w-full min-h-[200px] bg-white border border-border rounded-sm p-4 text-sm text-primary placeholder-secondary focus:outline-none focus:border-primary focus:bg-white transition-all resize-y font-mono custom-scrollbar"
                    />
                 </div>
               )}
            </div>
        </div>
      </LockedFeature>

      {/* 11. Sources Section (REFACTORED: Collapsible Accordion) */}
      {report.sources && report.sources.length > 0 && (
        <div className="pt-6 mt-4">
           <button 
             onClick={() => setIsSourcesOpen(!isSourcesOpen)}
             className="flex items-center justify-between w-full p-4 bg-surface rounded-sm border border-border hover:bg-tertiary/10 transition-colors group"
           >
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-sm bg-tertiary/10 text-primary group-hover:text-primary transition-colors">
                 <ExternalLink className="w-4 h-4" />
               </div>
               <div className="text-left">
                 <div className="text-sm font-bold text-primary group-hover:text-primary transition-colors">
                   Verification Sources
                 </div>
                 <div className="text-xs text-secondary">
                   {report.sources.length} citations used in this analysis
                 </div>
               </div>
             </div>
             <ChevronDown className={`w-5 h-5 text-secondary transition-transform duration-300 ${isSourcesOpen ? 'rotate-180' : ''}`} />
           </button>

           <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 transition-all duration-300 ease-in-out overflow-hidden ${isSourcesOpen ? 'max-h-[500px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
             {report.sources.map((source, idx) => (
               <a 
                 key={idx} 
                 href={source.uri} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center gap-2 px-3 py-2 rounded-sm bg-tertiary/5 border border-border hover:border-primary/30 hover:bg-tertiary/10 transition-all group"
               >
                 <ExternalLink className="w-3 h-3 text-secondary group-hover:text-primary transition-colors flex-shrink-0" />
                 <span className="text-xs text-secondary group-hover:text-primary truncate transition-colors">{source.title}</span>
               </a>
             ))}
           </div>
        </div>
      )}

      {/* 12. Floating AI Chat Trigger - MOVED TO PORTAL WIDGET BELOW */}
      {/* ONLY RENDER IF NOT IN TEASER MODE */}
      {!isTeaserMode && (
         <ChatWidget 
            report={report}
            reportId={reportId}
            userNotes={notes}
            userThesis={thesis}
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(!isChatOpen)}
         />
      )}

    </div>
  );
};

export default ReportCard;
