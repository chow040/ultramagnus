
import React, { useEffect, useMemo, useState } from 'react';
import { X, Mail, Lock, ArrowRight, Rocket } from 'lucide-react';
import { AuthModalContext, AuthModalMode, trackAuthModalEvent } from '../services/analytics';
import { login, signup, startGoogle, resendVerification } from '../services/authClient';
import { UserProfile } from '../types';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (profile: UserProfile) => void;
  message?: string; // New prop for custom context messages
  context?: AuthModalContext;
  initialMode?: AuthModalMode;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, message, context = 'unknown', initialMode }) => {
  const [isLoginMode, setIsLoginMode] = useState(initialMode ? initialMode === 'signin' : !message);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationLink, setVerificationLink] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  const [lastPendingEmail, setLastPendingEmail] = useState<string>('');

  const mode: AuthModalMode = isLoginMode ? 'signin' : 'signup';

  const resetForm = (derivedMode: 'signin' | 'signup') => {
    setIsLoginMode(derivedMode === 'signin');
    setEmail('');
    setPassword('');
    setError('');
    setInfo('');
    setIsVerificationSent(false);
    setVerificationLink('');
    setResendAvailableAt(null);
    setVerificationMessage('');
    setLastPendingEmail('');
  };

  useEffect(() => {
    const derivedMode = initialMode ? (initialMode === 'signin' ? 'signin' : 'signup') : (!message ? 'signin' : 'signup');
    resetForm(derivedMode);
  }, [message, isOpen, initialMode]);

  const isFormDisabled = useMemo(() => {
    return isLoading || !email || !password;
  }, [isLoading, email, password]);

  const handleAuth = async () => {
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      trackAuthModalEvent({ context, action: 'submit', mode, provider: 'email' });

      const displayName = email.split('@')[0];
      const result = isLoginMode
        ? await login(email, password)
        : await signup(email, password, displayName);

      if (result.verificationUrl) {
        setIsVerificationSent(true);
        setVerificationLink(result.verificationUrl);
        setVerificationMessage('Verification email sent. Check your inbox to continue.');
        setLastPendingEmail(email);
        trackAuthModalEvent({ context, action: 'success', mode, provider: 'email' });
        return;
      }

      if (result.user) {
        const profile: UserProfile = {
          id: result.user.id,
          email: result.user.email,
          name: result.profile?.display_name || displayName,
          tier: result.profile?.tier || 'Pro',
          joinDate: result.profile?.join_date
            ? new Date(result.profile.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : ''
        };

        onLogin(profile);
        trackAuthModalEvent({ context, action: 'success', mode, provider: 'email' });
        onClose();
      }
    } catch (err: any) {
      const isApiError = err?.status;
      if (isLoginMode && isApiError && err.status === 403 && err?.body?.error === 'verification_required') {
        setVerificationLink(err.body?.verificationUrl || '');
        setVerificationMessage(err.body?.message || "Your email isn't verified. Check your inbox or click Resend.");
        setResendAvailableAt(err.body?.resendAvailableAt || null);
        setIsVerificationSent(false); // keep inline messaging for login
        setLastPendingEmail(email);
        setError('');
        setInfo('');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
      trackAuthModalEvent({ context, action: 'error', mode, provider: 'email', errorCode: err?.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    handleAuth();
  };

  const handleGoogle = () => {
    startGoogle();
  };

  const resetVerificationUI = () => {
    setIsVerificationSent(false);
    setVerificationLink('');
    setResendAvailableAt(null);
    setVerificationMessage('');
    setLastPendingEmail('');
  };

  const handleResend = async () => {
    const targetEmail = email || lastPendingEmail;
    if (!targetEmail) return;
    setIsResendLoading(true);
    setError('');
    try {
      const resp = await resendVerification(targetEmail);
      setVerificationLink(resp.verificationUrl || '');
      setVerificationMessage(resp.message || 'Verification email sent. Check your inbox to continue.');
      setResendAvailableAt(resp.resendAvailableAt || null);
      setIsVerificationSent(!!resp.emailSent);
      setLastPendingEmail(targetEmail);
    } catch (err: any) {
      setError(err?.message || 'Unable to resend verification right now.');
    } finally {
      setIsResendLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Decor */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <Rocket className="w-40 h-40" />
        </div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {isVerificationSent ? (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <Mail className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                We've sent a verification link to <span className="text-white font-medium">{email}</span>.<br />
                Please click the link to activate your account.
              </p>

              {verificationLink && (
                <a
                  href={verificationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20 mb-4 flex items-center justify-center gap-2"
                >
                  Verify Account <ArrowRight className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={() => {
                  setIsVerificationSent(false);
                  setIsLoginMode(true);
                }}
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors mt-2"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/30">
                  <Rocket className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white">
                  {isLoginMode ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {isLoginMode
                    ? "Sign in to access your saved reports and analysis."
                    : (message || "Create a free account to continue analyzing.")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder-slate-600"
                      placeholder="trader@example.com"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder-slate-600"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                {verificationMessage && (
                  <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-3 space-y-2">
                    <div className="font-semibold text-amber-100">
                      {verificationMessage || "Your email isn't verified. Check your inbox or click Resend."}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResendLoading || (!!resendAvailableAt && resendAvailableAt > Date.now())}
                        className="px-3 py-1.5 rounded-md bg-amber-400 text-slate-900 text-xs font-bold hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isResendLoading ? 'Sending...' : 'Resend verification email'}
                      </button>
                      {resendAvailableAt && resendAvailableAt > Date.now() && (
                        <span className="text-[11px] text-amber-100/80">
                          Try again in {Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))}s
                        </span>
                      )}
                    </div>
                    {verificationLink && (
                      <a
                        href={verificationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-200 underline hover:text-white"
                      >
                        Open verification link
                      </a>
                    )}
                  </div>
                )}
                {info && (
                  <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isFormDisabled}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      {isLoginMode ? "Sign In" : "Create Free Account"} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center border-t border-white/5 pt-6">
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full bg-white text-slate-900 font-bold py-2.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <GoogleIcon /> Sign in with Google
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    resetVerificationUI();
                    setIsLoginMode(!isLoginMode);
                  }}
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {isLoginMode ? (
                    <>New to Moonshot? <span className="text-indigo-400 font-bold">Create an account</span></>
                  ) : (
                    <>Already have an account? <span className="text-indigo-400 font-bold">Sign In</span></>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
