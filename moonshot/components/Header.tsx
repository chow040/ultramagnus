
import React, { useState, useRef, useEffect } from 'react';
import { Rocket, FolderOpen, User, Settings, LogOut, ChevronDown, CreditCard, Shield, Key } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  onHome: () => void;
  savedCount: number;
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onHome, 
  savedCount, 
  user, 
  onLogin, 
  onLogout, 
  onOpenSettings 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="border-b border-white/10 bg-slate-900/50 relative z-50 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={onHome}
          title="Return to Dashboard"
        >
        <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-lg shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-white transition-all">
            Ultramagnus
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide group-hover:text-indigo-300 transition-colors">AI-POWERED EQUITY RESEARCH</p>
        </div>

        </div>
        <div className="flex items-center gap-4">
        {/* Saved Reports Button */}
        <button 
          onClick={onHome}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 hover:border-indigo-500/50 transition-all group"
        >
          <FolderOpen className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
          <span className="text-xs font-bold text-slate-300 group-hover:text-white">Saved Reports</span>
          {savedCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 rounded-full">
              {savedCount}
            </span>
          )}
        </button>
        
        {/* User Account Menu */}
        <div className="relative" ref={menuRef}>
          {user ? (
            <div>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-800/50 border border-white/10 hover:bg-slate-800 hover:border-indigo-500/30 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                   {user.avatarUrl ? (
                     <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                   ) : (
                     user.name.charAt(0)
                   )}
                </div>
                <div className="hidden md:flex flex-col items-start">
                   <span className="text-xs font-bold text-white leading-none">{user.name}</span>
                   <span className="text-[9px] text-indigo-300 font-medium uppercase tracking-wider">{user.tier}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">
                  <div className="p-4 border-b border-white/5 bg-gradient-to-r from-slate-900 to-slate-800">
                    <div className="text-sm font-bold text-white">{user.name}</div>
                    <div className="text-xs text-slate-400 truncate">{user.email}</div>
                  </div>
                  
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { onOpenSettings(); setIsMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors group"
                    >
                      <Settings className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      Account Settings
                    </button>
                  </div>

                  <div className="p-2 border-t border-white/5 bg-slate-950/30">
                    <button 
                      onClick={() => { onLogout(); setIsMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
