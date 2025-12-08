
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import ReportCard, { ReportCardSkeleton } from './components/ReportCard';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import AccountSettingsPage from './components/AccountSettingsPage';
import LandingPage from './components/LandingPage';
import { TickerCommandCenterMockup } from './components/TickerCommandCenterMockup';
import FinancialsMock from './components/FinancialsMock';

import { streamEquityReport } from './services/geminiService';
import { EquityReport, LoadingState, SavedReportItem, UserProfile, AnalysisSession, DashboardView, DashboardError } from './types';
import { Search, Loader2, Sparkles, Eye, TrendingUp, TrendingDown, Minus, Bookmark, X, ArrowRight, Database, ExternalLink } from 'lucide-react';
import { AuthModalContext, trackAuthModalEvent, trackDashboardEvent } from './services/analytics';
import { fetchMe, logout as apiLogout } from './services/authClient';
import { verifyEmail } from './services/verify';
import { checkGuestLimit } from './services/limits';
import { logger } from './src/lib/logger';
import { apiJson, ApiError } from './services/apiClient';
import { broadcast, subscribe } from './services/sync';
import { fetchDashboard } from './services/dashboardClient';
import { fetchReportById, listReports } from './services/reportClient';
import { addBookmark, listBookmarks, removeBookmark } from './services/bookmarkClient';
import { saveReport } from './services/reportSaveClient';

const getStoredUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem('ultramagnus_user');
  if (!saved) return null;
  try {
    return JSON.parse(saved) as UserProfile;
  } catch {
    return null;
  }
};

const SAMPLE_REPORT: EquityReport = {
  companyName: "AstroMining Corp",
  ticker: "ASTRO",
  reportDate: "Nov 24, 2024, 10:00 AM",
  currentPrice: "$24.50",
  priceChange: "+5.25%",
  marketCap: "$5.2B",
  peRatio: "N/A",
  dayHigh: "$24.95",
  dayLow: "$23.80",
  week52High: "$28.00",
  week52Low: "$12.00",
  priceTarget: "$42.00",
  priceTargetRange: "$35.00 - $55.00",
  priceTargetModel: {
    estimatedEPS: "$1.75",
    targetPE: "24.0x",
    growthRate: "45%",
    logic: "Valuation assumes a 24x multiple on projected FY25 earnings, justified by superior growth vs peers."
  },
  scenarioAnalysis: {
    bear: { label: "Bear", price: "$15.00", logic: "Prototype failure leads to additional capital raise and delayed revenue.", probability: "25%" },
    base: { label: "Base", price: "$42.00", logic: "Successful launch of Prospector-1 and initial contract monetization.", probability: "50%" },
    bull: { label: "Bull", price: "$75.00", logic: "Discovery of platinum-group metals exceeds initial survey estimates.", probability: "25%" }
  },
  summary: "AstroMining is pioneering commercial asteroid mining technology. With successful prototype launches in late 2024, they aim to extract rare earth metals from near-earth objects, potentially disrupting the global electronics supply chain.",
  rocketScore: 85,
  rocketReason: "First-mover advantage in a potential trillion-dollar untapped market.",
  financialHealthScore: 65,
  financialHealthReason: "Solid cash position post-Series D, but high burn rate requires monitoring.",
  moatAnalysis: {
    moatRating: "Narrow",
    moatSource: "Intangible Assets (Patents)",
    rationale: "Exclusive orbital mining rights and patented plasma propulsion create high barriers to entry, though technology is unproven at scale."
  },
  managementQuality: {
    executiveTenure: "CEO 8y, CFO 4y",
    insiderOwnership: "12.5%",
    trackRecord: "Founder previously sold deep-tech startup to Google for $200M.",
    governanceRedFlags: "Dual-class share structure gives CEO super-voting rights.",
    verdict: "Founder-led, high insider ownership aligned with shareholders, though governance is centralized."
  },
  history: {
    previousDate: "Aug 2024",
    previousVerdict: "HOLD",
    changeRationale: [
      "Successful Series D funding removed near-term liquidity risk",
      "NASA partnership validated technical feasibility"
    ]
  },
  shortTermFactors: {
    positive: [
      { title: "Upcoming Prototype Launch", detail: "Scheduled launch of 'Prospector-1' next month acts as a major catalyst for validation." },
      { title: "Strategic Defense Partnership", detail: "Recently secured data-sharing agreement with the DoD boosts technical credibility and non-dilutive funding." }
    ],
    negative: [
      { title: "High Cash Burn", detail: "Monthly burn rate of $15M puts pressure on balance sheet liquidity." },
      { title: "Volatility Risk", detail: "Stock price heavily correlated with binary test outcomes." }
    ]
  },
  longTermFactors: {
    positive: [
      { title: "Exclusive Orbital Rights", detail: "Secured mining rights to high-value Near-Earth Objects (NEOs) with estimated $2T value." },
      { title: "Patented Propulsion Tech", detail: "Proprietary plasma drive reduces fuel costs by 40%, enabling cheaper retrieval missions." },
      { title: "Path to Profitability", detail: "Projected break-even by 2027 assuming current rare earth metal prices hold." }
    ],
    negative: [
      { title: "Regulatory Uncertainty", detail: "International space property rights remain legally ambiguous under current treaties." },
      { title: "Operational Timeline Risk", detail: "Deep space operations historically face multi-year delays." },
      { title: "Emerging Competition", detail: "SpaceX and Blue Origin signaling potential entry into resource extraction sector." }
    ]
  },
  upcomingEvents: [
    { date: "Nov 15, 2024", event: "Q3 Earnings Call", impact: "Medium" },
    { date: "Dec 01, 2024", event: "Asteroid Scout Launch", impact: "High" },
    { date: "Jan 08, 2025", event: "CES Keynote Presentation", impact: "Low" }
  ],
  recentNews: [
    { headline: "AstroMining Secures $500M Series D Funding", date: "Oct 05, 2024" },
    { headline: "NASA Signs Data Sharing Agreement with ASTRO", date: "Sep 22, 2024" },
    { headline: "New CFO appointed from SpaceX", date: "Aug 15, 2024" }
  ],
  earningsCallAnalysis: {
    sentiment: "Bullish",
    summary: "Management remained extremely bullish during the last call, emphasizing that their cash runway now extends through 2026.",
    keyTakeaways: [
      "Cash runway extended through 2026 via Series D",
      "CEO emphasized proprietary plasma propulsion tech success",
      "Timeline for first retrieval mission remains vague"
    ]
  },
  overallSentiment: {
    score: 82,
    label: "Bullish",
    summary: "Strong investor confidence following the Series D funding and NASA partnership, supported by optimistic management guidance."
  },
  insiderActivity: [
    { insiderName: "Sarah Connor", role: "CEO", transactionDate: "2024-10-15", transactionType: "Buy", shares: "50,000", value: "$1.2M" },
    { insiderName: "Miles Dyson", role: "CTO", transactionDate: "2024-09-20", transactionType: "Buy", shares: "12,500", value: "$300K" },
    { insiderName: "Venture Partners LLC", role: "Director", transactionDate: "2024-08-01", transactionType: "Sell", shares: "100,000", value: "$2.1M" }
  ],
  riskMetrics: {
    beta: "2.1",
    shortInterestPercentage: "14.5%",
    shortInterestRatio: "4.2",
    volatility: "High"
  },
  institutionalSentiment: "Net Accumulation",
  tags: ["Space Tech", "Speculative", "Industrial", "Growth"],
  peers: [
    {
      ticker: "SPCX",
      name: "SpaceX (Private / Est)",
      marketCap: "$150B",
      peRatio: "N/A",
      revenueGrowth: "45.0%",
      netMargin: "2.5%"
    },
    {
      ticker: "RKLB",
      name: "Rocket Lab USA",
      marketCap: "$2.8B",
      peRatio: "N/A",
      revenueGrowth: "25.0%",
      netMargin: "-45.0%"
    },
    {
      ticker: "PLTR",
      name: "Palantir Technologies",
      marketCap: "$38.0B",
      peRatio: "65.4",
      revenueGrowth: "18.5%",
      netMargin: "12.0%"
    },
    {
      ticker: "LMT",
      name: "Lockheed Martin",
      marketCap: "$110.0B",
      peRatio: "16.5",
      revenueGrowth: "4.5%",
      netMargin: "9.8%"
    }
  ],
  financials: [
    {
      year: "2021",
      revenue: 12.5,
      grossProfit: 2.1,
      operatingIncome: -10.5,
      netIncome: -15.5,
      eps: -0.45,
      cashAndEquivalents: 150,
      totalDebt: 45,
      shareholderEquity: 80,
      operatingCashFlow: -12.0,
      capitalExpenditure: 5.0,
      freeCashFlow: -17.0
    },
    {
      year: "2022",
      revenue: 28.0,
      grossProfit: 8.4,
      operatingIncome: -35.0,
      netIncome: -42.8,
      eps: -0.98,
      cashAndEquivalents: 110,
      totalDebt: 80,
      shareholderEquity: 45,
      operatingCashFlow: -30.5,
      capitalExpenditure: 15.0,
      freeCashFlow: -45.5
    },
    {
      year: "2023",
      revenue: 65.5,
      grossProfit: 22.5,
      operatingIncome: -60.2,
      netIncome: -85.2,
      eps: -1.55,
      cashAndEquivalents: 450, // Post Series C
      totalDebt: 120,
      shareholderEquity: 320,
      operatingCashFlow: -65.0,
      capitalExpenditure: 45.0,
      freeCashFlow: -110.0
    },
    {
      year: "2024",
      revenue: 145.0,
      grossProfit: 65.0,
      operatingIncome: -45.0,
      netIncome: -60.5,
      eps: -1.05,
      cashAndEquivalents: 850, // Post Series D
      totalDebt: 150,
      shareholderEquity: 680,
      operatingCashFlow: -25.0,
      capitalExpenditure: 85.0,
      freeCashFlow: -110.0
    }
  ],
  priceHistory: [
    { month: "Nov", price: 12.50 },
    { month: "Dec", price: 13.20 },
    { month: "Jan", price: 14.00 },
    { month: "Feb", price: 13.50 },
    { month: "Mar", price: 15.80 },
    { month: "Apr", price: 18.20 },
    { month: "May", price: 19.50 },
    { month: "Jun", price: 18.90 },
    { month: "Jul", price: 21.00 },
    { month: "Aug", price: 22.50 },
    { month: "Sep", price: 23.80 },
    { month: "Oct", price: 24.50 }
  ],
  analystPriceTargets: [
    { month: "Nov", averageTarget: 18.00 },
    { month: "Dec", averageTarget: 18.50 },
    { month: "Jan", averageTarget: 19.00 },
    { month: "Feb", averageTarget: 19.00 },
    { month: "Mar", averageTarget: 22.00 },
    { month: "Apr", averageTarget: 25.00 },
    { month: "May", averageTarget: 26.00 },
    { month: "Jun", averageTarget: 26.00 },
    { month: "Jul", averageTarget: 28.00 },
    { month: "Aug", averageTarget: 30.00 },
    { month: "Sep", averageTarget: 32.00 },
    { month: "Oct", averageTarget: 35.00 }
  ],
  valuation: "Currently speculative. Trading purely on future IP value rather than earnings. Comparable to early-stage biotech.",
  verdict: "BUY",
  verdictReason: "A true moonshot. Position size accordingly (1-2% of portfolio), but the asymmetric upside potential is undeniable if execution succeeds.",
  sources: [
    { title: "Space Industry News - Mining", uri: "https://example.com/news" },
    { title: "Global Rare Earth Report", uri: "https://example.com/report" }
  ]
};

// Autocomplete Data Source
const POPULAR_STOCKS = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'PLTR', name: 'Palantir Technologies' },
  { symbol: 'COIN', name: 'Coinbase Global' },
  { symbol: 'GME', name: 'GameStop Corp.' },
  { symbol: 'DIS', name: 'Walt Disney Co.' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'KO', name: 'Coca-Cola Co.' },
  { symbol: 'PEP', name: 'PepsiCo Inc.' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale' },
  { symbol: 'NKE', name: 'Nike Inc.' },
  { symbol: 'SBUX', name: 'Starbucks Corp.' },
  { symbol: 'MCD', name: 'McDonald\'s Corp.' },
  { symbol: 'BA', name: 'Boeing Co.' },
  { symbol: 'LMT', name: 'Lockheed Martin' },
  { symbol: 'XOM', name: 'Exxon Mobil' },
  { symbol: 'CVX', name: 'Chevron Corp.' },
  { symbol: 'MRNA', name: 'Moderna Inc.' },
  { symbol: 'PFE', name: 'Pfizer Inc.' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.' },
  { symbol: 'INTC', name: 'Intel Corp.' },
  { symbol: 'QCOM', name: 'Qualcomm Inc.' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'UBER', name: 'Uber Technologies' },
  { symbol: 'ABNB', name: 'Airbnb Inc.' },
  { symbol: 'HOOD', name: 'Robinhood Markets' },
  { symbol: 'PYPL', name: 'PayPal Holdings' },
  { symbol: 'SQ', name: 'Block Inc.' },
  { symbol: 'SHOP', name: 'Shopify Inc.' },
  { symbol: 'TGT', name: 'Target Corp.' },
  { symbol: 'RTX', name: 'RTX Corp.' },
  { symbol: 'GE', name: 'General Electric' },
  { symbol: 'GM', name: 'General Motors' },
  { symbol: 'F', name: 'Ford Motor Co.' }
];

// Phases for simulated progress
const ANALYSIS_PHASES = [
  "Initializing secure uplink...",
  "Scraping real-time market data...",
  "Parsing SEC Filings (10-K, 10-Q)...",
  "Analyzing Insider Trading patterns...",
  "Calculating intrinsic value models...",
  "Synthesizing investment thesis...",
  "Finalizing Moonshot Report..."
];

const profileFromResponse = (payload: any): UserProfile | null => {
  const profile = payload?.profile;
  if (!profile) return null;

  const tier = (profile.tier as UserProfile['tier']) || 'Pro';

  return {
    id: payload?.user?.id || profile.id || 'unknown',
    email: payload?.user?.email || profile.email || '',
    name: profile.display_name || profile.name || 'Trader',
    tier,
    joinDate: profile.join_date
      ? new Date(profile.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '',
    avatarUrl: profile.avatar_url || undefined
  };
};

function App() {
  const isFinancialsMock = typeof window !== 'undefined' && window.location.search.includes('financialsMock');
  if (isFinancialsMock) {
    return <FinancialsMock />;
  }

  const initialUser = getStoredUser();
  const [ticker, setTicker] = useState('');

  // View State
  const [viewMode, setViewMode] = useState<'LANDING' | 'DASHBOARD' | 'REPORT' | 'SETTINGS' | 'TICKER_COMMAND'>(initialUser ? 'DASHBOARD' : 'LANDING');

  // Demo Modal State
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Current active report to display
  const [report, setReport] = useState<EquityReport | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Background Analysis Sessions
  const [analysisSessions, setAnalysisSessions] = useState<AnalysisSession[]>([]);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<{ symbol: string, name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // User & Auth State
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [dashboardData, setDashboardData] = useState<DashboardView | null>(null);
  const [dashboardErrors, setDashboardErrors] = useState<DashboardError[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string>(''); // Dynamic message for auth modal
  const [authContext, setAuthContext] = useState<AuthModalContext>('unknown');
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signup');
  const hasInitRef = useRef(false);

// Guest Usage Tracking

// Unified Report Library (Auto-saved history + Bookmarked items)
const [reportLibrary, setReportLibrary] = useState<SavedReportItem[]>([]);
  const [saveIssues, setSaveIssues] = useState<{ ticker: string; payload: EquityReport; message: string; status?: number }[]>([]);
  const [reportLoadError, setReportLoadError] = useState<{ ticker: string; message: string; status?: number } | null>(null);
  const [bookmarkError, setBookmarkError] = useState<{ ticker: string; message: string } | null>(null);
  const [reportsPage, setReportsPage] = useState(1);
  const [bookmarksPage, setBookmarksPage] = useState(1);
  const REPORT_PAGE_SIZE = 10;
  const BOOKMARK_PAGE_SIZE = 10;
  const [hasMoreReports, setHasMoreReports] = useState(false);
  const [hasMoreBookmarks, setHasMoreBookmarks] = useState(false);
  const [isLoadingReportsPage, setIsLoadingReportsPage] = useState(false);
  const [isLoadingBookmarksPage, setIsLoadingBookmarksPage] = useState(false);
  const [staleBookmarkMessages, setStaleBookmarkMessages] = useState<string[]>([]);

  // Load User from stored session
  useEffect(() => {
    if (hasInitRef.current) return;
    hasInitRef.current = true;

    const loadSession = async () => {
      try {
        logger.info('auth.session.check.start');
        const me = await fetchMe();
        const profile = profileFromResponse(me);
        if (profile) {
          setUser(profile);
          localStorage.setItem('ultramagnus_user', JSON.stringify(profile));
          logger.info('auth.session.check.success', { meta: { userId: profile.id } });
        } else {
          logger.warn('auth.session.profile_missing');
        }
      } catch (err) {
        logger.captureError(err, { meta: { stage: 'auth.session.check' } });
        const savedUser = localStorage.getItem('ultramagnus_user');
        if (savedUser) {
          try {
            const parsed: UserProfile = JSON.parse(savedUser);
            setUser(parsed);
            logger.info('auth.session.local_fallback', { meta: { userId: parsed.id } });
          } catch (parseErr) {
            logger.captureError(parseErr, { meta: { stage: 'auth.session.local_parse_failed' } });
            localStorage.removeItem('ultramagnus_user');
          }
        }
      }
    };

    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const oauthToken = url.searchParams.get('oauth_token');
    const oauthError = url.searchParams.get('error');

    const clearParams = () => {
      url.searchParams.delete('token');
      url.searchParams.delete('oauth_token');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    };

    const run = async () => {
      try {
        if (oauthError) {
          logger.warn('auth.oauth.error', { meta: { error: oauthError } });
          clearParams();
          return;
        }

        if (oauthToken) {
          logger.info('auth.oauth.exchange.start');
          try {
            const { data: me, requestId } = await apiJson('/api/auth/google/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ oauth_token: oauthToken })
            }, { operation: 'auth.google.exchange' });

            const profile = profileFromResponse(me);
            if (profile) {
              setUser(profile);
              localStorage.setItem('ultramagnus_user', JSON.stringify(profile));
            }
            logger.info('auth.oauth.exchange.success', { requestId, meta: { hasProfile: !!profile } });
          } catch (err) {
            logger.captureError(err, { meta: { stage: 'auth.google.exchange' } });
          }
          clearParams();
          return;
        }

        if (token) {
          logger.info('auth.verify.start');
          try {
            const data = await verifyEmail(token);
            logger.info('auth.verify.success', { meta: { userId: data.user?.id } });
          } catch (err) {
            logger.captureError(err, { meta: { action: 'auth.verify' } });
          }
          clearParams();
        }

        await loadSession();
      } finally {
        setIsBootstrapping(false);
      }
    };

    run();
  }, []);

  // Sync auth state across tabs
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === 'logout') {
        setUser(null);
        localStorage.removeItem('ultramagnus_user');
        setViewMode('LANDING');
      } else if (event.type === 'login') {
        fetchMe().then((me) => {
          const profile = profileFromResponse(me);
          if (profile) {
            setUser(profile);
            localStorage.setItem('ultramagnus_user', JSON.stringify(profile));
          }
        }).catch((err) => {
          logger.captureError(err, { meta: { stage: 'auth.sync.login' } });
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // FORCE REDIRECT: If user is logged in but on LANDING page, move to dashboard
  useEffect(() => {
    if (user && viewMode === 'LANDING') {
      setViewMode('DASHBOARD');
    }
  }, [user, viewMode]);

  useEffect(() => {
    if (viewMode === 'DASHBOARD' && user) {
      trackDashboardEvent({ action: 'dashboard_view', userId: user.id });
    }
  }, [viewMode, user?.id]);

  useEffect(() => {
    logger.setUser(user || undefined);
  }, [user]);

  useEffect(() => {
    logger.setRoute(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!user || viewMode !== 'DASHBOARD') return;
    loadDashboardData();
  }, [user?.id, viewMode]);

  // PROGRESS SIMULATION EFFECT
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalysisSessions(prevSessions => {
        // Optimization: if no session is processing, return prev
        if (!prevSessions.some(s => s.status === 'PROCESSING')) return prevSessions;

        return prevSessions.map(session => {
          if (session.status !== 'PROCESSING') return session;

          // Logistic curve simulation: Fast at start, slow at end
          const current = session.progress;
          let next = current;

          if (current < 30) next += 2;
          else if (current < 60) next += 1;
          else if (current < 85) next += 0.5;
          else if (current < 95) next += 0.1;

          // Map progress to phase text
          const phaseIndex = Math.min(
            Math.floor((next / 100) * ANALYSIS_PHASES.length),
            ANALYSIS_PHASES.length - 1
          );

          return {
            ...session,
            progress: Math.min(next, 99), // Cap at 99 until API returns
            phase: ANALYSIS_PHASES[phaseIndex]
          };
        });
      });
    }, 150);

    return () => clearInterval(interval);
  }, []); // Run continuously

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setTicker(value);

    if (value.length > 0) {
      const filtered = POPULAR_STOCKS.filter(stock =>
        stock.symbol.startsWith(value) ||
        stock.symbol.includes(value) ||
        stock.name.toUpperCase().includes(value)
      ).slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (symbol: string) => {
    setTicker(symbol);
    setShowSuggestions(false);
    logger.info('ui.ticker.suggestion_selected', { meta: { symbol } });
  };

  const rememberSaveIssue = (ticker: string, payload: EquityReport, err: unknown) => {
    const apiErr = err as ApiError;
    const message = apiErr?.message || 'Failed to save report';
    const status = (apiErr as any)?.status;
    setSaveIssues(prev => {
      const filtered = prev.filter(i => i.ticker !== ticker);
      return [...filtered, { ticker, payload, message, status }];
    });
  };

  const rememberLoadIssue = (ticker: string, err: unknown) => {
    const apiErr = err as ApiError;
    const status = (apiErr as any)?.status;
    let message = apiErr?.message || 'Failed to open report';
    if (status === 403) {
      message = "You don't have access to this report.";
    } else if (status === 404) {
      message = 'This report is missing. Try regenerating it.';
    }
    setReportLoadError({ ticker, message, status });
  };

  const rememberBookmarkIssue = (ticker: string, err: unknown) => {
    const apiErr = err as ApiError;
    const status = (apiErr as any)?.status;
    let message = apiErr?.message || 'Unable to update bookmark right now.';
    if (status === 403) {
      message = "You don't have access to bookmark this report.";
    } else if (status === 404) {
      message = 'This report could not be found to bookmark.';
    }
    setBookmarkError({ ticker, message });
  };

  const resolveReportId = (ticker: string) => {
    const entry = reportLibrary.find((r) => r.ticker === ticker);
    return entry?.id || null;
  };

  const dismissSaveIssue = (ticker: string) => {
    setSaveIssues(prev => prev.filter(i => i.ticker !== ticker));
  };

  const downloadIssuePayload = (ticker: string) => {
    const issue = saveIssues.find(i => i.ticker === ticker);
    if (!issue) return;
    const blob = new Blob([JSON.stringify(issue.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${issue.ticker}-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const retrySaveIssue = async (ticker: string) => {
    const issue = saveIssues.find(i => i.ticker === ticker);
    if (!issue) return;
    try {
      const reportId = await saveReport(issue.payload);
      setReportLibrary(prev => prev.map(i => i.ticker === ticker ? { ...i, id: reportId, saveFailed: false, saveError: undefined } : i));
      dismissSaveIssue(ticker);
      logger.info('reports.save.retry.success', { meta: { ticker, reportId } });
    } catch (err) {
      rememberSaveIssue(ticker, issue.payload, err);
      setReportLibrary(prev => prev.map(i => i.ticker === ticker ? { ...i, saveFailed: true, saveError: (err as any)?.message || 'Failed to save report' } : i));
      logger.captureError(err, { meta: { stage: 'reports.save.retry', ticker } });
    }
  };

  const regenerateFromLoadIssue = (ticker: string) => {
    setReportLoadError(null);
    handleSearch(undefined, ticker);
  };


  const loadMoreReports = async () => {
    if (!user || !hasMoreReports || isLoadingReportsPage) return;
    setIsLoadingReportsPage(true);
    try {
      const nextPage = reportsPage + 1;
      const resp = await listReports(nextPage, REPORT_PAGE_SIZE);
      setReportsPage(nextPage);
      setHasMoreReports(resp.total > resp.page * resp.pageSize);
      syncLibraryWithData(resp.items, []);
    } catch (err) {
      logger.captureError(err, { meta: { stage: 'reports.load_more', page: reportsPage + 1 } });
    } finally {
      setIsLoadingReportsPage(false);
    }
  };

  const loadMoreBookmarks = async () => {
    if (!user || !hasMoreBookmarks || isLoadingBookmarksPage) return;
    setIsLoadingBookmarksPage(true);
    try {
      const nextPage = bookmarksPage + 1;
      const resp = await listBookmarks(nextPage, BOOKMARK_PAGE_SIZE);
      setBookmarksPage(nextPage);
      setHasMoreBookmarks(resp.total > resp.page * resp.pageSize);
      if (resp.errors?.length) {
        setStaleBookmarkMessages(resp.errors.map((e: any) => e.message));
      }
      syncLibraryWithData([], resp.items);
    } catch (err) {
      logger.captureError(err, { meta: { stage: 'bookmarks.load_more', page: bookmarksPage + 1 } });
    } finally {
      setIsLoadingBookmarksPage(false);
    }
  };

  const syncLibraryWithData = (reportSummaries: any[], bookmarkItems: any[]) => {
    const bookmarkMap = new Map<string, { id: string; pinned: boolean }>();
    bookmarkItems.forEach((b) => {
      const target = b.targetId;
      if (target) {
        bookmarkMap.set(target, { id: b.id, pinned: b.pinned });
      }
    });

    const next = new Map<string, SavedReportItem>();
    reportLibrary.forEach((item) => {
      const key = item.id || item.ticker;
      if (key) {
        next.set(key, item);
      }
    });

    reportSummaries.forEach((r) => {
      const key = r.id || r.ticker;
      if (!key) return;
      const existing = next.get(key);
      const bookmark = bookmarkMap.get(r.id);
      const merged: SavedReportItem = {
        id: r.id,
        ticker: r.ticker || r.title,
        companyName: r.title,
        currentPrice: existing?.currentPrice || (r as any).currentPrice || '',
        priceChange: existing?.priceChange || (r as any).priceChange || '',
        priceTarget: existing?.priceTarget || (r as any).priceTarget || '',
        verdict: existing?.verdict || (r as any).verdict || 'HOLD',
        rocketScore: existing?.rocketScore ?? (r as any).rocketScore,
        addedAt: new Date(r.updatedAt || r.createdAt).getTime(),
        fullReport: existing?.fullReport,
        isBookmarked: bookmark ? true : existing?.isBookmarked,
        bookmarkId: bookmark?.id || existing?.bookmarkId,
        saveFailed: existing?.saveFailed,
        saveError: existing?.saveError
      };
      next.set(key, merged);
    });

    // Ensure bookmarked items without report summaries still tracked for status
    bookmarkItems.forEach((b) => {
      if (!b.report) return;
      const key = b.report.id || b.report.ticker;
      if (!key) return;
      const existing = next.get(key);
      const merged: SavedReportItem = {
        ...(existing || {}),
        id: b.report.id,
        ticker: b.report.ticker || b.report.title,
        companyName: b.report.title,
        currentPrice: existing?.currentPrice || (b.report as any).currentPrice || '',
        priceChange: existing?.priceChange || (b.report as any).priceChange || '',
        priceTarget: existing?.priceTarget || (b.report as any).priceTarget || '',
        verdict: existing?.verdict || (b.report as any).verdict || 'HOLD',
        rocketScore: existing?.rocketScore ?? (b.report as any).rocketScore,
        addedAt: new Date(b.report.updatedAt || b.report.createdAt).getTime(),
        fullReport: existing?.fullReport,
        isBookmarked: true,
        bookmarkId: b.id,
        saveFailed: existing?.saveFailed,
        saveError: existing?.saveError
      };
      next.set(key, merged);
    });

    setReportLibrary(Array.from(next.values()).sort((a, b) => b.addedAt - a.addedAt));
  };

  const handleSearch = async (e?: React.FormEvent, searchTicker?: string) => {
    if (e) e.preventDefault();
    const rawTicker = searchTicker ?? ticker;
    const targetTicker = rawTicker.trim().toUpperCase();
    if (!targetTicker) {
      logger.warn('analysis.search.invalid', { meta: { rawTicker } });
      return;
    }

    try {
      const limitResult = await checkGuestLimit();
      if (!limitResult.ok) {
        logger.warn('guest.usage.limit_reached', { meta: { limit: 3 } });
        handleOpenAuth('guest-limit', "You've reached the free preview limit. Create a free account to keep analyzing.", 'signup');
        return;
      }
    } catch (err) {
      logger.captureError(err, { meta: { action: 'guest.limit.check' } });
      // On error, allow search to proceed but log
    }

    if (!searchTicker) {
      setTicker('');
    }
    setShowSuggestions(false);

    if (analysisSessions.some(s => s.ticker === targetTicker && s.status === 'PROCESSING')) {
      logger.info('analysis.session.skipped', { meta: { ticker: targetTicker, reason: 'duplicate_active' } });
      return;
    }

    const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const startedAt = performance.now();

    const newSession: AnalysisSession = {
      id: sessionId,
      ticker: targetTicker,
      progress: 0,
      status: 'PROCESSING',
      phase: ANALYSIS_PHASES[0]
    };

    setAnalysisSessions(prev => [newSession, ...prev]);
    logger.info('analysis.session.start', { correlationId: sessionId, meta: { ticker: targetTicker } });

    try {
      let data: EquityReport;
      setAnalysisSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        const nextProgress = Math.min(75, (s.progress || 0) + 10);
        return { ...s, progress: nextProgress, phase: 'Generating report...' };
      }));

      data = await streamEquityReport(targetTicker, (chunk) => {
        setAnalysisSessions(prev => prev.map(s => {
          if (s.id !== sessionId) return s;
          const bump = Math.max(1, Math.min(5, Math.round(chunk.length / 200)));
          const nextProgress = Math.min(95, (s.progress || 0) + bump);
          return { ...s, progress: nextProgress, phase: 'Streaming report...' };
        }));
      });

      setAnalysisSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          progress: 100,
          status: 'READY',
          phase: "Report Declassified. Ready for viewing.",
          result: data
        };
      }));

      logger.info('analysis.session.success', {
        correlationId: sessionId,
        meta: { ticker: data.ticker, durationMs: Math.round(performance.now() - startedAt) }
      });

      const newItem: SavedReportItem = {
        ticker: data.ticker,
        companyName: data.companyName,
        currentPrice: data.currentPrice,
        priceChange: data.priceChange,
        verdict: data.verdict,
        addedAt: Date.now(),
        fullReport: data,
        isBookmarked: false
      };

      // Persist report for authenticated users
      if (user) {
        try {
          const reportId = await saveReport(data);
          newItem.id = reportId;
          logger.info('reports.save.success', { meta: { reportId, ticker: data.ticker } });
        } catch (err) {
          rememberSaveIssue(data.ticker, data, err);
          newItem.saveFailed = true;
          newItem.saveError = (err as any)?.message || 'Failed to save report';
          logger.captureError(err, { meta: { stage: 'reports.save', ticker: data.ticker } });
        }
      }

      setReportLibrary(prev => {
        const filtered = prev.filter(i => i.ticker !== newItem.ticker);
        return [newItem, ...filtered];
      });

      logger.info('library.report.saved', { correlationId: sessionId, meta: { ticker: data.ticker } });
    } catch (err: any) {
      logger.captureError(err, {
        correlationId: sessionId,
        meta: {
          action: 'report.generate',
          ticker: targetTicker,
          durationMs: Math.round(performance.now() - startedAt)
        }
      });
      setAnalysisSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          status: 'ERROR',
          progress: 0,
          phase: "Analysis Failed. Connection terminated.",
          error: err.message || "Failed to generate report."
        };
      }));
    }
  };

  // Modified to open modal instead of changing view mode
  const handleViewSample = () => {
    setReport(SAMPLE_REPORT);
    setActiveReportId(null);
    setTicker("ASTRO");
    setShowDemoModal(true);
    logger.info('demo.sample.opened');
  };

  const handleCloseDemoModal = () => {
    setShowDemoModal(false);
    logger.info('demo.sample.closed');
  };

  const handleViewAnalyzedReport = (sessionId: string) => {
    const session = analysisSessions.find(s => s.id === sessionId);
    if (session?.result) {
      setReport(session.result);
      setActiveReportId(resolveReportId(session.ticker));
      setViewMode('REPORT');
      logger.info('analysis.session.view', { correlationId: sessionId, meta: { ticker: session.ticker } });
    } else {
      logger.warn('analysis.session.view_missing', { correlationId: sessionId, meta: { status: session?.status } });
    }
  };

  const handleCancelAnalysis = (sessionId: string) => {
    setAnalysisSessions(prev => prev.filter(s => s.id !== sessionId));
    logger.info('analysis.session.cancelled', { correlationId: sessionId });
  };

  // Smart Navigation (Logo Click)
  const handleHome = () => {
    logger.info('navigation.home', { meta: { previousView: viewMode, hasUser: !!user } });
    // If viewing a report or settings, go back to Dashboard
    if (viewMode === 'REPORT' || viewMode === 'SETTINGS') {
      setViewMode('DASHBOARD');
      setReport(null);
      setActiveReportId(null);
      setTicker('');
      return;
    }

    // If on Dashboard...
    if (viewMode === 'DASHBOARD') {
      if (user) {
        // Logged in users stay on Dashboard (reset search)
        setTicker('');
        setShowSuggestions(false);
      } else {
        // Guests exit to Landing Page
        setViewMode('LANDING');
      }
    }
  };

  // Toggle Bookmark Status (Save/Unsave without deleting)
  const toggleBookmarkReport = (item: SavedReportItem) => {
    // If we are in demo mode (on landing page), clicking bookmark should prompt login
    if (showDemoModal && !user) {
      handleOpenAuth('lock');
      return;
    }

    const existing = reportLibrary.find(i => i.ticker === item.ticker);
    const nextIsBookmarked = existing ? !existing.isBookmarked : true;

    setBookmarkError(null);
    setReportLibrary(prev => prev.map(i => i.ticker === item.ticker ? { ...i, isBookmarked: nextIsBookmarked } : i));

    const bookmarkAction = async () => {
      if (!item.id) return;
      try {
        if (nextIsBookmarked) {
          const res = await addBookmark(item.id);
          setReportLibrary(prev => prev.map(i => i.ticker === item.ticker ? { ...i, bookmarkId: res?.bookmarkId } : i));
        } else if (existing?.bookmarkId) {
          await removeBookmark(existing.bookmarkId);
          setReportLibrary(prev => prev.map(i => i.ticker === item.ticker ? { ...i, bookmarkId: undefined } : i));
        }
      } catch (err) {
        rememberBookmarkIssue(item.ticker, err);
        setReportLibrary(prev => prev.map(i => i.ticker === item.ticker ? { ...i, isBookmarked: !nextIsBookmarked } : i));
        logger.captureError(err, { meta: { stage: 'bookmark.toggle', targetId: item.id } });
      }
    };
    bookmarkAction();

    logger.info('library.bookmark.toggled', {
      meta: {
        ticker: item.ticker,
        isBookmarked: nextIsBookmarked
      }
    });
    trackDashboardEvent({ action: 'bookmark_toggle', userId: user?.id, ticker: item.ticker, isBookmarked: nextIsBookmarked });
  };

  // Permanently Remove from Library
  const deleteReport = (tickerToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportLibrary(reportLibrary.filter(item => item.ticker !== tickerToRemove));
    logger.warn('library.report.deleted', { meta: { ticker: tickerToRemove } });
  };

  const loadReport = async (item: SavedReportItem) => {
    setReportLoadError(null);
    if (item.fullReport) {
      setReport(item.fullReport);
      setActiveReportId(item.id || null);
      setViewMode('REPORT');
      logger.info('library.report.loaded', { meta: { ticker: item.ticker, fromSaved: true } });
      trackDashboardEvent({ action: 'report_open', userId: user?.id, ticker: item.ticker });
      return;
    }

    // If we have a server ID, fetch the stored report
    if (item.id) {
      try {
        const reportResp = await fetchReportById(item.id);
        setReport(reportResp.payload);
        setActiveReportId(item.id);
        setViewMode('REPORT');
        logger.info('library.report.loaded_remote', { meta: { reportId: item.id, ticker: item.ticker } });
        trackDashboardEvent({ action: 'report_open', userId: user?.id, ticker: item.ticker });
        return;
      } catch (err) {
        rememberLoadIssue(item.ticker, err);
        logger.captureError(err, { meta: { action: 'report.fetch', reportId: item.id } });
      }
    }

    // Legacy fallback: re-run analysis by ticker
    logger.info('library.report.reanalyze', { meta: { ticker: item.ticker } });
    handleSearch(undefined, item.ticker);
  };

  // Auth Handlers
  const handleLogin = (profile: UserProfile) => {
    localStorage.setItem('ultramagnus_user', JSON.stringify(profile));
    setUser(profile);
    setReportLibrary([]);
    // Explicitly set view mode to ensure transition from Landing to Dashboard
    setViewMode('DASHBOARD');
    setShowDemoModal(false); // Close demo if open
    logger.info('auth.login.success', { meta: { userId: profile.id } });
    broadcast({ type: 'login', userId: profile.id });
  };

  const handleLogout = async () => {
    try {
      logger.info('auth.logout.start');
      await apiLogout();
      logger.info('auth.logout.success');
    } catch (err) {
      logger.captureError(err, { meta: { action: 'auth.logout' } });
    }
    setUser(null);
    setDashboardData(null);
    setDashboardErrors([]);
    setIsDashboardLoading(false);
    setReport(null);
    setActiveReportId(null);
    setReportLibrary([]);
    localStorage.removeItem('ultramagnus_user');
    // Always return to landing on logout
    setViewMode('LANDING');
    broadcast({ type: 'logout' });
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    localStorage.setItem('ultramagnus_user', JSON.stringify(updatedUser));
    logger.info('account.profile.updated', { meta: { userId: updatedUser.id } });
  };

  const handleOpenAuth = (context: AuthModalContext = 'lock', message = 'Unlock full access to Ultramagnus.', initialMode: 'signin' | 'signup' = 'signup') => {
    setAuthContext(context);
    setAuthModalMessage(message);
    setAuthInitialMode(initialMode);
    setIsAuthModalOpen(true);
    trackAuthModalEvent({ context, action: 'open', mode: initialMode });
    logger.info('auth.modal.opened', { meta: { context, initialMode } });
  };

  const loadDashboardData = async () => {
    if (!user) return;
    setIsDashboardLoading(true);
    try {
      const [reportsResp, bookmarksResp] = await Promise.all([
        listReports(1, REPORT_PAGE_SIZE),
        listBookmarks(1, BOOKMARK_PAGE_SIZE)
      ]);

      const staleErrors = bookmarksResp.errors?.map((e) => e.message) || [];
      setStaleBookmarkMessages(staleErrors);
      setDashboardErrors([]);

      setReportsPage(1);
      setBookmarksPage(1);
      setHasMoreReports(reportsResp.total > reportsResp.page * reportsResp.pageSize);
      setHasMoreBookmarks(bookmarksResp.total > bookmarksResp.page * bookmarksResp.pageSize);

      syncLibraryWithData(reportsResp.items, bookmarksResp.items);
    } catch (err: any) {
      logger.captureError(err, { meta: { stage: 'dashboard.fetch' } });
      setDashboardErrors([{ section: 'reports', message: err?.message || 'Failed to load dashboard' }]);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  // Navigation to Settings Page
  const handleOpenSettings = () => {
    if (user) {
      logger.info('navigation.settings.open', { meta: { userId: user.id } });
      setViewMode('SETTINGS');
    } else {
      logger.warn('navigation.settings.blocked', { meta: { reason: 'unauthenticated' } });
      handleOpenAuth('settings', 'Please sign in to configure account settings.', 'signin');
    }
  };

  const currentReportInLibrary = report ? reportLibrary.find(w => w.ticker === report.ticker) : undefined;
  const isBookmarked = currentReportInLibrary?.isBookmarked || false;

  // Fallback guest user for display if no user logged in
  const displayUser = user || { name: "Guest Trader", tier: "Guest", email: "", joinDate: "", id: "guest" };

  // Determine Teaser Mode: Guest + No Custom Key + Not Demo
  const customKey = localStorage.getItem('ultramagnus_user_api_key');
  const isTeaserMode = !user && !customKey && report?.ticker !== 'ASTRO';

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-background text-primary flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-secondary" />
          <span className="text-sm text-secondary">Preparing your dashboard…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-background text-primary relative overflow-hidden pb-20 selection:bg-secondary/20">

      {/* MINIMALIST BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-background"></div>

      {saveIssues.length > 0 && (
        <div className="relative z-20 max-w-4xl mx-auto mt-6 px-4">
          {saveIssues.map(issue => (
            <div key={issue.ticker} className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Report save failed for {issue.ticker} {issue.status ? `(HTTP ${issue.status})` : ''}
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    {issue.status === 413
                      ? 'This report is too large to save. Download it now or trim sections before retrying.'
                      : issue.message}
                  </p>
                </div>
                <button
                  onClick={() => dismissSaveIssue(issue.ticker)}
                  className="text-amber-700 hover:text-amber-900 transition-colors"
                  aria-label="Dismiss save issue"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => retrySaveIssue(issue.ticker)}
                  className="px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                >
                  Retry save
                </button>
                <button
                  onClick={() => downloadIssuePayload(issue.ticker)}
                  className="px-3 py-1.5 rounded-md border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  Download report JSON
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {staleBookmarkMessages.length > 0 && (
        <div className="relative z-20 max-w-4xl mx-auto mt-4 px-4">
          {staleBookmarkMessages.map((msg, idx) => (
            <div key={idx} className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm text-xs text-blue-800">
              {msg}
            </div>
          ))}
        </div>
      )}

      {bookmarkError && (
        <div className="relative z-20 max-w-4xl mx-auto mt-4 px-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Bookmark update failed for {bookmarkError.ticker}
                </p>
                <p className="text-xs text-blue-800 mt-1">{bookmarkError.message}</p>
              </div>
              <button
                onClick={() => setBookmarkError(null)}
                className="text-blue-700 hover:text-blue-900 transition-colors"
                aria-label="Dismiss bookmark issue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {reportLoadError && (
        <div className="relative z-20 max-w-4xl mx-auto mt-4 px-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Could not open report for {reportLoadError.ticker} {reportLoadError.status ? `(HTTP ${reportLoadError.status})` : ''}
                </p>
                <p className="text-xs text-red-800 mt-1">{reportLoadError.message}</p>
              </div>
              <button
                onClick={() => setReportLoadError(null)}
                className="text-red-700 hover:text-red-900 transition-colors"
                aria-label="Dismiss load issue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => regenerateFromLoadIssue(reportLoadError.ticker)}
                className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
              >
                Regenerate report
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'LANDING' ? (
        <LandingPage
          onStartAnalysis={() => setViewMode('DASHBOARD')}
          onViewDemo={handleViewSample}
          onLogin={() => handleOpenAuth('landing', '', 'signin')}
        />
      ) : viewMode === 'SETTINGS' && user ? (
        <div className="relative z-10">
          <AccountSettingsPage
            user={user}
            onUpdateUser={handleUpdateUser}
            onBack={() => setViewMode('DASHBOARD')}
          />
        </div>
      ) : viewMode === 'TICKER_COMMAND' ? (
        <div className="relative z-10 min-h-screen bg-background">
           <div className="p-4">
             <button onClick={() => setViewMode('DASHBOARD')} className="mb-4 text-secondary hover:text-primary flex items-center gap-2">
               &larr; Back to Dashboard
             </button>
             <TickerCommandCenterMockup />
           </div>
        </div>
      ) : (
        <div className="relative z-10">
          <Header
            onHome={handleHome}
            savedCount={reportLibrary.filter(r => r.isBookmarked).length}
            user={user}
            onLogin={() => handleOpenAuth('header', '', 'signin')}
            onLogout={handleLogout}
            onOpenSettings={handleOpenSettings}
          />

          <main className={`container mx-auto px-4 max-w-[1400px] transition-all duration-500 ease-in-out ${viewMode === 'DASHBOARD' ? 'pt-4' : 'pt-6'}`}>

            {viewMode === 'DASHBOARD' ? (
              <Dashboard
                user={displayUser}
                onViewCommandCenter={() => setViewMode('TICKER_COMMAND')}
                reportLibrary={reportLibrary}
                hasMoreReports={hasMoreReports}
                hasMoreBookmarks={hasMoreBookmarks}
                onLoadMoreReports={loadMoreReports}
                onLoadMoreBookmarks={loadMoreBookmarks}
                isLoadingReportsPage={isLoadingReportsPage}
                isLoadingBookmarksPage={isLoadingBookmarksPage}
                isDashboardLoading={isDashboardLoading}
                onSearch={handleSearch}
                onLoadReport={loadReport}
                onDeleteReport={deleteReport}
                tickerInput={ticker}
                onTickerChange={handleInputChange}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                onSelectSuggestion={handleSelectSuggestion}
                setShowSuggestions={setShowSuggestions}
                onViewSample={handleViewSample}
                analysisSessions={analysisSessions}
                onViewAnalyzedReport={handleViewAnalyzedReport}
                onCancelAnalysis={handleCancelAnalysis}
              />
            ) : (
              <div className="min-h-[400px]">
                {report && (
                  <ReportCard
                    report={report}
                    reportId={activeReportId || undefined}
                    isBookmarked={isBookmarked}
                    onToggleBookmark={toggleBookmarkReport}
                    isTeaserMode={isTeaserMode}
                    onUnlock={() => handleOpenAuth('lock')}
                  />
                )}
              </div>
            )}

          </main>
        </div>
      )}

      {/* DEMO REPORT POP-UP MODAL */}
      {showDemoModal && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/90 backdrop-blur-sm transition-opacity"
            onClick={handleCloseDemoModal}
          ></div>

          {/* Modal Content */}
          <div className="relative w-full max-w-7xl max-h-[90vh] bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <span className="bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Preview Mode
                </span>
                <h3 className="text-primary font-bold">Ultramagnus Demo Report</h3>
              </div>
              <div className="flex items-center gap-4">
                {!user && (
                  <button
                    onClick={() => handleOpenAuth('lock')}
                    className="hidden sm:flex text-xs font-bold text-secondary hover:text-primary transition-colors"
                  >
                    Create Free Account
                  </button>
                )}
                <button
                  onClick={handleCloseDemoModal}
                  className="p-2 rounded-full bg-background hover:bg-gray-100 text-secondary hover:text-primary transition-all border border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Report Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background p-4 md:p-8">
              <div className="max-w-6xl mx-auto">
                <ReportCard
                  report={report}
                  reportId={activeReportId || undefined}
                  isBookmarked={false} // Demo doesn't show bookmarked state
                  onToggleBookmark={toggleBookmarkReport} // Leads to auth
                  isTeaserMode={false} // Unlock everything for demo
                  onUnlock={() => { }} // No-op
                />
              </div>
            </div>

            {/* Footer CTA (Sticky) */}
                {!user && (
                  <div className="p-4 bg-surface border-t border-border flex flex-col sm:flex-row items-center justify-center gap-4 text-center shrink-0">
                    <p className="text-sm text-primary font-medium">Ready to analyze real stocks with this depth?</p>
                    <button
                      onClick={() => handleOpenAuth('lock')}
                      className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-lg text-sm flex items-center gap-2"
                    >
                      Get Started for Free <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard errors */}
      {dashboardErrors && dashboardErrors.length > 0 && (
        <div className="relative z-20 max-w-4xl mx-auto mt-4 px-4">
          {dashboardErrors.map((err, idx) => (
            <div key={idx} className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3 shadow-sm text-xs text-red-800">
              {err.section}: {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
        message={authModalMessage}
        context={authContext}
        initialMode={authInitialMode}
      />

    </div>
  );
}

export default App;
