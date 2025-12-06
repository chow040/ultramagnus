
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
    <header className="border-b border-border bg-surface/90 relative z-50 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={onHome}
          title="Return to Dashboard"
        >
        <div className="p-1">
          <Rocket className="w-6 h-6 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-lg font-sans font-semibold text-primary tracking-tight">
            Ultramagnus
          </h1>
        </div>

        </div>
        <div className="flex items-center gap-6">
        {/* Saved Reports Button */}
        <button 
          onClick={onHome}
          className="hidden md:flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
        >
          <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
          <span>Saved Reports</span>
          {savedCount > 0 && (
            <span className="bg-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-xs font-medium text-primary">
                   {user.avatarUrl ? (
                     <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                   ) : (
                     user.name.charAt(0)
                   )}
                </div>
                <div className="hidden md:flex flex-col items-start">
                   <span className="text-xs font-medium text-primary leading-none">{user.name}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-secondary transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-surface rounded-sm border border-border shadow-sm overflow-hidden animate-fade-in-up">
                  <div className="p-4 border-b border-border">
                    <div className="text-sm font-medium text-primary">{user.name}</div>
                    <div className="text-xs text-secondary truncate">{user.email}</div>
                  </div>
                  
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { onOpenSettings(); setIsMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-secondary rounded-sm hover:bg-tertiary/10 hover:text-primary transition-colors group"
                    >
                      <Settings className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                      Account Settings
                    </button>
                  </div>

                  <div className="p-2 border-t border-border bg-tertiary/5">
                    <button 
                      onClick={() => { onLogout(); setIsMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-red-600 rounded-sm hover:bg-red-50 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 rounded-sm bg-primary hover:opacity-90 text-white text-xs font-bold transition-all shadow-sm"
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
