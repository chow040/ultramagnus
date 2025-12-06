
import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('ultramagnus_user_api_key');
      if (stored) setApiKey(stored);
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('ultramagnus_user_api_key', apiKey.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } else {
      localStorage.removeItem('ultramagnus_user_api_key');
    }
  };

  const handleClearData = () => {
    if (confirm("Are you sure? This will delete all saved reports and local settings.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-surface rounded-sm border border-border shadow-xl overflow-hidden animate-fade-in-up">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface">
           <h2 className="text-lg font-sans font-semibold text-primary flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Settings
           </h2>
           <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* API Key Section */}
          <div className="bg-tertiary/5 rounded-sm p-4 border border-border">
             <h3 className="text-sm font-semibold text-primary mb-2">Gemini API Configuration</h3>
             <p className="text-xs text-secondary mb-4 leading-relaxed">
                By default, this app uses a shared demo key. For heavy usage or to ensure privacy, please provide your own Google Gemini API Key.
                <br />
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 underline mt-1 inline-block decoration-border hover:decoration-primary">
                   Get a free API Key here &rarr;
                </a>
             </p>
             
             <div className="relative">
                <input 
                   type={showKey ? "text" : "password"}
                   value={apiKey}
                   onChange={(e) => { setApiKey(e.target.value); setIsSaved(false); }}
                   placeholder="AIzaSy..."
                   className="w-full bg-surface border border-border rounded-sm py-2 pl-4 pr-20 text-sm text-primary font-mono focus:outline-none focus:border-primary transition-colors"
                />
                <div className="absolute right-2 top-1.5 flex gap-1">
                   <button 
                     onClick={() => setShowKey(!showKey)}
                     className="p-1 hover:bg-tertiary/10 rounded text-secondary hover:text-primary transition-colors"
                   >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                   </button>
                </div>
             </div>

             <div className="mt-3 flex justify-end">
                <button 
                  onClick={handleSave}
                  className={`px-4 py-2 rounded-sm text-xs font-medium transition-all flex items-center gap-2 ${isSaved ? 'bg-emerald-600 text-white' : 'bg-primary hover:opacity-90 text-white'}`}
                >
                   {isSaved ? <Check className="w-3 h-3" /> : null}
                   {isSaved ? 'Saved Securely' : 'Save Key'}
                </button>
             </div>
          </div>

          {/* Account Tier Info */}
          <div className="flex items-center justify-between p-4 bg-tertiary/5 rounded-sm border border-border">
             <div>
                <div className="text-xs font-medium text-secondary uppercase">Current Plan</div>
                <div className="text-sm font-semibold text-primary">{user?.tier || 'Guest Access'}</div>
             </div>
             {user?.tier !== 'Pro' && (
                <button className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-sm hover:opacity-90 transition-all shadow-sm">
                   Upgrade to Pro
                </button>
             )}
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-border">
             <h3 className="text-xs font-medium text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> Danger Zone
             </h3>
             <button 
                onClick={handleClearData}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-sm transition-colors text-xs font-medium"
             >
                <Trash2 className="w-4 h-4" />
                Clear All Local Data & Reset App
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
