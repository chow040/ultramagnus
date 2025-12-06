
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  User, 
  CreditCard, 
  Shield, 
  Key, 
  Save, 
  Check, 
  AlertTriangle, 
  Download, 
  ExternalLink,
  Eye, 
  EyeOff,
  Github,
  Zap,
  ArrowLeft
} from 'lucide-react';

interface AccountSettingsPageProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onBack: () => void;
}

type SettingsTab = 'general' | 'billing' | 'security';

const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({ user, onUpdateUser, onBack }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Form States
  const [displayName, setDisplayName] = useState(user.name);
  const [email] = useState(user.email); // Read-only usually
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('ultramagnus_user_api_key');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleSaveProfile = () => {
    setIsLoading(true);
    // Simulate API call persistence
    setTimeout(() => {
      onUpdateUser({ ...user, name: displayName });
      setIsLoading(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 800);
  };

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('ultramagnus_user_api_key', apiKey.trim());
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    } else {
      localStorage.removeItem('ultramagnus_user_api_key');
      setApiKey('');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in relative z-20">
      {/* Page Header */}
      <div className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-8 pb-4 md:pb-8 gap-4">
             <div>
                <h1 className="text-2xl font-sans font-semibold text-primary mb-2">Account Settings</h1>
                <p className="text-secondary text-sm">Manage your profile, billing, and API preferences.</p>
             </div>
             <button onClick={onBack} className="flex items-center gap-2 text-xs font-medium text-secondary hover:text-primary transition-colors self-start md:self-center bg-surface px-3 py-2 rounded-sm border border-border hover:bg-tertiary/10">
                <ArrowLeft className="w-3 h-3" /> Back to Dashboard
             </button>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
            <button 
               onClick={() => setActiveTab('general')}
               className={`pb-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === 'general' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
            >
               General
            </button>
            <button 
               onClick={() => setActiveTab('billing')}
               className={`pb-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === 'billing' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
            >
               Billing & Usage
            </button>
            <button 
               onClick={() => setActiveTab('security')}
               className={`pb-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === 'security' ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'}`}
            >
               Tokens & Security
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl py-8">
        
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
           <div className="space-y-6 animate-fade-in-up">
              
              {/* Profile Card */}
              <div className="bg-surface rounded-sm border border-border overflow-hidden">
                 <div className="px-6 py-4 border-b border-border bg-tertiary/5">
                    <h3 className="text-sm font-semibold text-primary">Profile Information</h3>
                    <p className="text-xs text-secondary mt-1">Update your display name and public avatar.</p>
                 </div>
                 <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                       <div className="flex-shrink-0">
                          <div className="w-20 h-20 rounded-full bg-tertiary/20 flex items-center justify-center text-2xl font-medium text-primary border border-border">
                             {displayName.charAt(0)}
                          </div>
                       </div>
                       <div className="flex-1 space-y-4 w-full max-w-md">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-xs font-medium text-secondary uppercase">Display Name</label>
                                <input 
                                  type="text" 
                                  value={displayName} 
                                  onChange={(e) => setDisplayName(e.target.value)}
                                  className="w-full bg-surface border border-border rounded-sm px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-xs font-medium text-secondary uppercase">Email Address</label>
                                <div className="w-full bg-tertiary/10 border border-border rounded-sm px-3 py-2 text-sm text-secondary cursor-not-allowed flex items-center justify-between">
                                   {email}
                                   <Shield className="w-3 h-3 text-emerald-600" />
                                </div>
                             </div>
                          </div>
                          <div className="pt-2">
                             <button 
                               onClick={handleSaveProfile}
                               disabled={isLoading}
                               className="px-4 py-2 bg-primary hover:opacity-90 text-white text-xs font-medium rounded-sm transition-all flex items-center gap-2"
                             >
                                {isLoading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save className="w-3 h-3" />}
                                {isSaved ? 'Saved Changes' : 'Save Changes'}
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* GitHub Connected */}
              <div className="bg-surface rounded-sm border border-border overflow-hidden">
                 <div className="px-6 py-4 border-b border-border bg-tertiary/5 flex justify-between items-center">
                    <div>
                       <h3 className="text-sm font-semibold text-primary">Connected Accounts</h3>
                       <p className="text-xs text-secondary mt-1">Manage external login providers.</p>
                    </div>
                 </div>
                 <div className="p-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-tertiary/10 rounded-sm border border-border">
                             <Github className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                             <div className="text-sm font-medium text-primary">GitHub</div>
                             <div className="text-xs text-secondary">Connected as {email}</div>
                          </div>
                       </div>
                       <button className="text-xs font-medium text-secondary hover:text-primary px-3 py-1.5 rounded-sm hover:bg-tertiary/10 transition-colors border border-transparent hover:border-border">
                          Disconnect
                       </button>
                    </div>
                 </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-red-200 rounded-sm overflow-hidden">
                 <div className="px-6 py-4 bg-red-50 border-b border-red-100">
                    <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
                 </div>
                 <div className="p-6 flex items-center justify-between bg-white">
                    <div>
                       <div className="text-sm font-medium text-primary">Delete Personal Account</div>
                       <div className="text-xs text-secondary mt-1">Permanently remove your account and all saved reports. This action cannot be undone.</div>
                    </div>
                    <button className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-sm text-xs font-medium transition-colors">
                       Delete Account
                    </button>
                 </div>
              </div>

           </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
           <div className="space-y-6 animate-fade-in-up">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Current Plan */}
                 <div className="md:col-span-2 bg-surface rounded-sm border border-border overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Zap className="w-32 h-32 text-primary transform rotate-12" />
                    </div>
                    <div className="p-8">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <div className="text-xs font-medium text-secondary uppercase tracking-wider mb-2">Current Plan</div>
                             <h2 className="text-3xl font-sans font-semibold text-primary mb-2">Pro Trader</h2>
                             <p className="text-sm text-secondary max-w-md leading-relaxed">
                                You have access to advanced Moonshot scoring, unlimited report generation, and real-time news synthesis.
                             </p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                             <Check className="w-3 h-3" /> Active
                          </span>
                       </div>
                       <div className="flex gap-3 relative z-10">
                          <button className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-sm hover:opacity-90 transition-colors shadow-sm">
                             Manage Subscription
                          </button>
                          <button className="px-4 py-2 bg-surface text-primary text-xs font-medium rounded-sm hover:bg-tertiary/10 transition-colors border border-border">
                             Contact Support
                          </button>
                       </div>
                    </div>
                 </div>

                 {/* Payment Method */}
                 <div className="bg-surface rounded-sm border border-border p-6 flex flex-col justify-between hover:border-secondary/30 transition-colors">
                    <div>
                       <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-secondary" /> Payment Method
                       </h3>
                       <div className="flex items-center gap-3 p-3 bg-tertiary/5 rounded-sm border border-border mb-2">
                          <div className="w-8 h-5 bg-white rounded flex items-center justify-center shadow-sm border border-border">
                             <div className="w-2 h-2 rounded-full bg-red-500 mr-0.5 opacity-80"></div>
                             <div className="w-2 h-2 rounded-full bg-yellow-500 opacity-80"></div>
                          </div>
                          <div className="text-xs">
                             <div className="text-primary font-mono">•••• 4242</div>
                             <div className="text-secondary">Expires 12/28</div>
                          </div>
                       </div>
                    </div>
                    <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors text-left mt-4 underline decoration-border hover:decoration-primary">
                       + Add Payment Method
                    </button>
                 </div>
              </div>

              {/* Invoices */}
              <div className="bg-surface rounded-sm border border-border overflow-hidden">
                 <div className="px-6 py-4 border-b border-border bg-tertiary/5">
                    <h3 className="text-sm font-semibold text-primary">Invoice History</h3>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-tertiary/10 text-secondary text-xs uppercase font-medium">
                          <tr>
                             <th className="px-6 py-3">Date</th>
                             <th className="px-6 py-3">Amount</th>
                             <th className="px-6 py-3">Status</th>
                             <th className="px-6 py-3 text-right">Invoice</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border text-primary">
                          {[
                             { date: 'Oct 01, 2024', amount: '$29.00', status: 'Paid' },
                             { date: 'Sep 01, 2024', amount: '$29.00', status: 'Paid' },
                             { date: 'Aug 01, 2024', amount: '$29.00', status: 'Paid' },
                          ].map((inv, i) => (
                             <tr key={i} className="hover:bg-tertiary/5 transition-colors group">
                                <td className="px-6 py-3 font-mono text-xs">{inv.date}</td>
                                <td className="px-6 py-3">{inv.amount}</td>
                                <td className="px-6 py-3">
                                   <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {inv.status}
                                   </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                   <button className="text-secondary hover:text-primary transition-colors p-1 hover:bg-tertiary/10 rounded">
                                      <Download className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

           </div>
        )}

        {/* SECURITY & API TAB */}
        {activeTab === 'security' && (
           <div className="space-y-6 animate-fade-in-up">
              
              {/* API Configuration */}
              <div className="bg-surface rounded-sm border border-border overflow-hidden">
                 <div className="px-6 py-4 border-b border-border bg-tertiary/5 flex justify-between items-center">
                    <div>
                       <h3 className="text-sm font-semibold text-primary">Gemini API Tokens</h3>
                       <p className="text-xs text-secondary mt-1">Manage your connection to Google's Gemini models.</p>
                    </div>
                    <div className="bg-tertiary/10 text-primary px-3 py-1 rounded-sm text-[10px] font-medium uppercase border border-border flex items-center gap-1">
                       <Zap className="w-3 h-3" /> Gemini 2.0 Flash Thinking
                    </div>
                 </div>
                 <div className="p-6">
                    <div className="bg-tertiary/5 rounded-sm p-4 border border-border mb-6">
                       <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                             <h4 className="text-sm font-semibold text-primary mb-1">Bring Your Own Key (BYOK)</h4>
                             <p className="text-xs text-secondary leading-relaxed max-w-2xl">
                                Ultramagnus uses a shared demo key by default which has rate limits. For heavy usage, privacy, or to access the latest experimental models, we recommend providing your own API key.
                             </p>
                             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 mt-2 border-b border-primary pb-0.5">
                                Get a free API Key <ExternalLink className="w-3 h-3" />
                             </a>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2 max-w-2xl">
                       <label className="text-xs font-medium text-secondary uppercase">Gemini API Key</label>
                       <div className="relative group">
                          <div className="absolute left-3 top-2.5">
                             <Key className="w-4 h-4 text-secondary group-focus-within:text-primary transition-colors" />
                          </div>
                          <input 
                             type={showKey ? "text" : "password"}
                             value={apiKey}
                             onChange={(e) => { setApiKey(e.target.value); setKeySaved(false); }}
                             placeholder="AIzaSy..."
                             className="w-full bg-surface border border-border rounded-sm py-2.5 pl-10 pr-24 text-sm text-primary font-mono focus:outline-none focus:border-primary transition-colors"
                          />
                          <div className="absolute right-2 top-1.5 flex gap-1">
                             <button 
                               onClick={() => setShowKey(!showKey)}
                               className="p-1.5 hover:bg-tertiary/10 rounded text-secondary hover:text-primary transition-colors"
                             >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                             </button>
                             <button 
                               onClick={handleSaveKey}
                               className={`px-3 py-1 rounded-sm text-xs font-medium transition-all flex items-center gap-1 ${keySaved ? 'bg-emerald-600 text-white shadow-sm' : 'bg-primary text-white hover:opacity-90'}`}
                             >
                                {keySaved ? <Check className="w-3 h-3" /> : 'Save'}
                             </button>
                          </div>
                       </div>
                       <p className="text-[10px] text-secondary">Your key is encrypted and stored locally in your browser. It is never sent to our servers.</p>
                    </div>
                 </div>
              </div>

              {/* Login Sessions */}
              <div className="bg-surface rounded-sm border border-border overflow-hidden">
                 <div className="px-6 py-4 border-b border-border bg-tertiary/5">
                    <h3 className="text-sm font-semibold text-primary">Active Sessions</h3>
                 </div>
                 <div className="p-6">
                    <div className="flex items-center justify-between p-3 bg-tertiary/5 rounded-sm border border-border">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-surface rounded-full border border-border">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          </div>
                          <div>
                             <div className="text-sm font-medium text-primary">San Francisco, US</div>
                             <div className="text-xs text-secondary">Chrome on macOS • Current Session</div>
                          </div>
                       </div>
                       <button className="text-xs text-secondary border border-border px-3 py-1.5 rounded-sm hover:bg-tertiary/10 hover:text-primary transition-colors">
                          Revoke
                       </button>
                    </div>
                 </div>
              </div>

           </div>
        )}

      </div>
    </div>
  );
};

export default AccountSettingsPage;
