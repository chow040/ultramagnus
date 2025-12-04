
import React from 'react';
import { Rocket, ArrowRight, Shield, Zap, BarChart3, Brain, Terminal, TrendingUp } from 'lucide-react';

interface LandingPageProps {
  onStartAnalysis: () => void;
  onViewDemo: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartAnalysis, onViewDemo, onLogin }) => {
  return (
    <div className="relative z-20 min-h-screen flex flex-col font-sans">
      {/* Navigation */}
      <nav className="w-full px-6 py-6 md:px-12 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm fixed top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={onStartAnalysis}>
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-tight">Ultramagnus</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={onStartAnalysis}
              className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold border border-white/5 transition-all"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center mt-32 md:mt-20 mb-20">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in">
          <Brain className="w-3 h-3" /> Powered by Gemini 2.0 Flash Thinking
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight mb-6 max-w-4xl animate-fade-in-up">
          Institutional Grade <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient">Equity Research</span> for Everyone.
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed animate-fade-in-up delay-100">
          Stop relying on surface-level summaries. Ultramagnus uses advanced AI to build complex financial models, detect earnings call bias, and generate price targets in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up delay-200 w-full justify-center">
          <button 
            onClick={onStartAnalysis}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:scale-105 transition-all flex items-center justify-center gap-2 text-lg group"
          >
            Analyze a Ticker Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={onViewDemo}
            className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <Terminal className="w-5 h-5 text-slate-500" />
            View Demo Report
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-7xl w-full animate-fade-in-up delay-300 text-left px-4">
          
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deep Dive Financials</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              We don't just read the news. We parse 10-Ks, balance sheets, and cash flow statements to build a complete valuation model.
            </p>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Bias & Risk Detection</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Our AI reads between the lines of management earnings calls to spot hesitation, "spin," and hidden governance red flags.
            </p>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Scenario Modeling</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Understand the Bear, Base, and Bull cases immediately with probability-weighted price targets and upside analysis.
            </p>
          </div>

        </div>

      </main>

      {/* Footer / Ticker Tape (Static Visual) */}
      <footer className="border-t border-white/5 py-8 bg-slate-950/50 backdrop-blur-sm">
         <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
               <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <TrendingUp className="w-4 h-4" /> RECENT ANALYSES:
               </div>
               <span className="font-mono text-xs text-indigo-400">NVDA <span className="text-green-500">+2.4%</span></span>
               <span className="font-mono text-xs text-indigo-400">PLTR <span className="text-green-500">+5.1%</span></span>
               <span className="font-mono text-xs text-indigo-400">TSLA <span className="text-red-500">-1.2%</span></span>
               <span className="font-mono text-xs text-indigo-400 hidden sm:inline">AMD <span className="text-green-500">+0.8%</span></span>
            </div>
            <div className="text-xs text-slate-600">
               © 2024 Ultramagnus AI. Not financial advice.
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
