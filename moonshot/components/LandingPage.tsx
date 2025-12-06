
import React from 'react';
import { Rocket, ArrowRight, Shield, Zap, BarChart3, Brain, Terminal, TrendingUp } from 'lucide-react';

interface LandingPageProps {
  onStartAnalysis: () => void;
  onViewDemo: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartAnalysis, onViewDemo, onLogin }) => {
  return (
    <div className="relative z-20 min-h-screen flex flex-col font-sans bg-background text-primary">
      {/* Navigation */}
      <nav className="w-full px-6 py-6 md:px-12 border-b border-border bg-surface/90 backdrop-blur-sm fixed top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={onStartAnalysis}>
            <div className="p-1">
              <Rocket className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-semibold text-primary tracking-tight">Ultramagnus</span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={onLogin}
              className="text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={onStartAnalysis}
              className="hidden md:flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center mt-32 md:mt-20 mb-20">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tertiary/30 border border-border text-secondary text-xs font-medium uppercase tracking-wider mb-8 animate-fade-in">
          <Brain className="w-3 h-3" /> Powered by Gemini 2.0 Flash Thinking
        </div>

        <h1 className="text-5xl md:text-7xl font-sans font-semibold text-primary tracking-tighter mb-8 max-w-4xl animate-fade-in-up">
          Institutional Grade <br className="hidden md:block" />
          <span className="text-secondary">Equity Research</span> for Everyone.
        </h1>

        <p className="text-lg md:text-xl text-secondary max-w-2xl mb-12 leading-relaxed animate-fade-in-up delay-100 font-light">
          Stop relying on surface-level summaries. Ultramagnus uses advanced AI to build complex financial models, detect earnings call bias, and generate price targets in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up delay-200 w-full justify-center">
          <button 
            onClick={onStartAnalysis}
            className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-medium rounded-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-lg group"
          >
            Analyze a Ticker Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={onViewDemo}
            className="w-full sm:w-auto px-8 py-4 bg-transparent text-primary font-medium rounded-sm border border-border hover:bg-tertiary/20 transition-colors flex items-center justify-center gap-2"
          >
            <Terminal className="w-5 h-5 text-secondary" />
            View Demo Report
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-7xl w-full animate-fade-in-up delay-300 text-left px-4">
          
          <div className="p-8 rounded-sm border border-border bg-surface hover:border-secondary/50 transition-colors group">
            <div className="w-10 h-10 bg-tertiary/30 rounded-sm flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-3">Deep Dive Financials</h3>
            <p className="text-sm text-secondary leading-relaxed">
              We don't just read the news. We parse 10-Ks, balance sheets, and cash flow statements to build a complete valuation model.
            </p>
          </div>

          <div className="p-8 rounded-sm border border-border bg-surface hover:border-secondary/50 transition-colors group">
            <div className="w-10 h-10 bg-tertiary/30 rounded-sm flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-3">Bias & Risk Detection</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Our AI reads between the lines of management earnings calls to spot hesitation, "spin," and hidden governance red flags.
            </p>
          </div>

          <div className="p-8 rounded-sm border border-border bg-surface hover:border-secondary/50 transition-colors group">
            <div className="w-10 h-10 bg-tertiary/30 rounded-sm flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-3">Scenario Modeling</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Understand the Bear, Base, and Bull cases immediately with probability-weighted price targets and upside analysis.
            </p>
          </div>

        </div>

      </main>

      {/* Footer / Ticker Tape (Static Visual) */}
      <footer className="border-t border-border py-8 bg-surface backdrop-blur-sm">
         <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
               <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                  <TrendingUp className="w-4 h-4" /> RECENT ANALYSES:
               </div>
               <span className="font-mono text-xs text-primary">NVDA <span className="text-green-600">+2.4%</span></span>
               <span className="font-mono text-xs text-primary">PLTR <span className="text-green-600">+5.1%</span></span>
               <span className="font-mono text-xs text-primary">TSLA <span className="text-red-600">-1.2%</span></span>
               <span className="font-mono text-xs text-primary hidden sm:inline">AMD <span className="text-green-600">+0.8%</span></span>
            </div>
            <div className="text-xs text-tertiary">
               © 2024 Ultramagnus AI. Not financial advice.
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
