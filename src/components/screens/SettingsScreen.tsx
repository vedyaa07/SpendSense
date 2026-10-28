import React, { useState } from 'react';
import { CurrencyCode, UserProfile } from '../../types/finance';
import { CURRENCIES } from '../../utils/formatters';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  User,
  Shield,
  Key,
  LogOut,
  LogIn,
  UserPlus,
  RefreshCw,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  Info,
  Loader2,
  Eye,
  EyeOff,
  Download,
} from 'lucide-react';

interface SettingsScreenProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  currencyCode: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
  onResetData: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userProfile,
  onUpdateProfile,
  currencyCode,
  onCurrencyChange,
  onResetData,
}) => {
  const [authView, setAuthView] = useState<'profile' | 'login' | 'signup' | 'reset-password'>(
    userProfile.isAuthenticated ? 'profile' : 'login'
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Independent password visibility states for each field
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    if (!supabase) {
      setErrorMessage('Supabase is not configured. Check your environment variables.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        const profileName =
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'SpendSense User';

        onUpdateProfile({
          id: data.user.id,
          name: profileName,
          email: data.user.email || email.trim(),
          isAuthenticated: true,
          memberSince: new Date(data.user.created_at).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          }),
        });

        setSuccessMessage('Successfully signed in! Your personal ledger has been loaded.');
        setAuthView('profile');
        setPassword('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please provide an email and password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (!supabase) {
      setErrorMessage('Supabase is not configured. Check your environment variables.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: fullName.trim() || email.split('@')[0],
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.session && data?.user) {
        // Direct session created (if email confirmation is turned off in Supabase)
        onUpdateProfile({
          id: data.user.id,
          name: fullName.trim() || email.split('@')[0],
          email: data.user.email || email.trim(),
          isAuthenticated: true,
          memberSince: 'Just now',
        });
        setSuccessMessage('Account created and signed in successfully!');
        setAuthView('profile');
      } else {
        // Confirmation email sent
        setSuccessMessage(
          `Confirmation email sent to ${email.trim()}. Please check your inbox to confirm your account, then sign in.`
        );
        setAuthView('login');
      }
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred during account registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    if (!supabase) {
      setErrorMessage('Supabase is not configured. Check your environment variables.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        `Password recovery instructions have been sent to ${email.trim()}. Please check your inbox.`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch password recovery email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    clearMessages();
    setIsLoading(true);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      onUpdateProfile({
        id: 'guest',
        name: 'Guest User',
        email: 'guest@spendsense.app',
        isAuthenticated: false,
      });
      setAuthView('login');
      setSuccessMessage('Signed out successfully. All private records have been cleared from memory.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error signing out.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6 lg:p-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
          Security & Account
        </span>
        <h1 className="text-[28px] sm:text-[34px] font-bold text-[#121316] tracking-tight leading-tight">
          Settings & Supabase Authentication
        </h1>
        <p className="text-[13px] text-[#52565E] mt-1.5 max-w-2xl">
          Manage your verified account credentials, secure database connection, and currency preferences.
        </p>
      </div>

      {/* Supabase Connection Status Banner */}
      <div className="p-4 bg-[#F4F4F2] border border-[#E2E4E0] rounded-[0.5rem] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#52565E] shrink-0 mt-0.5" />
        <div className="text-[12px] text-[#52565E] leading-relaxed">
          <div className="flex items-center gap-2 mb-1">
            <strong className="text-[#121316] font-semibold">Supabase Backend Status:</strong>
            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#1B4332] border border-[#A7F3D0]">
                <CheckCircle2 className="w-2.5 h-2.5 text-[#10B981]" />
                Connected & RLS Enforced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                <AlertCircle className="w-2.5 h-2.5 text-[#D97706]" />
                Local Mode
              </span>
            )}
          </div>
          Every user record is isolated in PostgreSQL with Row Level Security (RLS) policies. Signing out purges private memory state to guarantee guest isolation.
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMessage && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-[0.25rem] text-[13px] text-[#991B1B] font-medium flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-[#C62828] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[0.25rem] text-[13px] text-[#1B4332] font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Auth & Profile Container */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] overflow-hidden">
        {/* Navigation Tabs for Auth Views */}
        <div className="flex items-center border-b border-[#E2E4E0] bg-[#F4F4F2] px-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              clearMessages();
              setAuthView('profile');
            }}
            className={`py-3 px-4 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
              authView === 'profile'
                ? 'border-[#1B4332] text-[#1B4332]'
                : 'border-transparent text-[#52565E] hover:text-[#121316]'
            }`}
          >
            User Profile
          </button>
          <button
            onClick={() => {
              clearMessages();
              setAuthView('login');
            }}
            className={`py-3 px-4 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
              authView === 'login'
                ? 'border-[#1B4332] text-[#1B4332]'
                : 'border-transparent text-[#52565E] hover:text-[#121316]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              clearMessages();
              setAuthView('signup');
            }}
            className={`py-3 px-4 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
              authView === 'signup'
                ? 'border-[#1B4332] text-[#1B4332]'
                : 'border-transparent text-[#52565E] hover:text-[#121316]'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => {
              clearMessages();
              setAuthView('reset-password');
            }}
            className={`py-3 px-4 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
              authView === 'reset-password'
                ? 'border-[#1B4332] text-[#1B4332]'
                : 'border-transparent text-[#52565E] hover:text-[#121316]'
            }`}
          >
            Reset Password
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* View 1: User Profile Screen */}
          {authView === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E4E0] gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-[20px] font-bold shrink-0">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-[18px] font-bold text-[#121316]">{userProfile.name}</h2>
                    <p className="text-[13px] text-[#52565E] font-mono">{userProfile.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#1B4332] border border-[#A7F3D0]">
                        {userProfile.isAuthenticated ? 'Authenticated Supabase Session' : 'Guest / Demo Mode'}
                      </span>
                      {userProfile.memberSince && (
                        <span className="text-[11px] text-[#8A909A]">
                          Member since {userProfile.memberSince}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {userProfile.isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#C62828] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] rounded-[0.25rem] transition-colors self-start sm:self-auto disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                )}
              </div>

              {/* Account Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => onUpdateProfile({ ...userProfile, name: e.target.value })}
                    className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    value={userProfile.email}
                    disabled
                    className="w-full h-10 px-3 bg-[#F4F4F2] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#52565E] cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-[#FBFBFA] border border-[#E2E4E0] rounded-[0.25rem] text-[11px] text-[#8A909A] font-mono">
                <div>User ID: {userProfile.id}</div>
                <div className="mt-0.5">Session Provider: Supabase Auth (JWT bearer)</div>
              </div>
            </div>
          )}

          {/* View 2: Real Supabase Sign In Screen */}
          {authView === 'login' && (
            <div className="max-w-md mx-auto space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-[20px] font-bold text-[#121316]">Sign In to SpendSense</h3>
                <p className="text-[13px] text-[#52565E] mt-1">
                  Authenticate against Supabase to load your private encrypted ledger.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3 text-[#8A909A]" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        clearMessages();
                        setAuthView('reset-password');
                      }}
                      className="text-[11px] font-semibold text-[#1B4332] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-3 text-[#8A909A]" />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-10 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((prev) => !prev)}
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1 text-[#8A909A] hover:text-[#121316] transition-colors focus:outline-none"
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold text-[14px] rounded-[0.25rem] transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>Sign In</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <span className="text-[12px] text-[#52565E]">
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      clearMessages();
                      setAuthView('signup');
                    }}
                    className="font-semibold text-[#1B4332] hover:underline"
                  >
                    Create Account
                  </button>
                </span>
              </div>
            </div>
          )}

          {/* View 3: Real Supabase Sign Up Screen */}
          {authView === 'signup' && (
            <div className="max-w-md mx-auto space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-[20px] font-bold text-[#121316]">Create Your Supabase Account</h3>
                <p className="text-[13px] text-[#52565E] mt-1">
                  Start tracking expenses with deterministic budget depletion and isolated storage.
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3 text-[#8A909A]" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Password (min 6 characters)
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-3 text-[#8A909A]" />
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-10 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((prev) => !prev)}
                      aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1 text-[#8A909A] hover:text-[#121316] transition-colors focus:outline-none"
                    >
                      {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-3 text-[#8A909A]" />
                    <input
                      type={showSignUpConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-10 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpConfirmPassword((prev) => !prev)}
                      aria-label={showSignUpConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 p-1 text-[#8A909A] hover:text-[#121316] transition-colors focus:outline-none"
                    >
                      {showSignUpConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold text-[14px] rounded-[0.25rem] transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Create Account</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <span className="text-[12px] text-[#52565E]">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      clearMessages();
                      setAuthView('login');
                    }}
                    className="font-semibold text-[#1B4332] hover:underline"
                  >
                    Sign In
                  </button>
                </span>
              </div>
            </div>
          )}

          {/* View 4: Real Supabase Password Reset Screen */}
          {authView === 'reset-password' && (
            <div className="max-w-md mx-auto space-y-5">
              <div className="text-center mb-6">
                <h3 className="text-[20px] font-bold text-[#121316]">Reset Your Password</h3>
                <p className="text-[13px] text-[#52565E] mt-1">
                  Enter your verified email address and Supabase will dispatch a password reset link.
                </p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
                    Account Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3 text-[#8A909A]" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold text-[14px] rounded-[0.25rem] transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  <span>Send Reset Email</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    clearMessages();
                    setAuthView('login');
                  }}
                  className="text-[12px] font-semibold text-[#52565E] hover:text-[#121316]"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* App Preferences & Data Reset Card */}
      <div className="bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.5rem] p-6 lg:p-8 space-y-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8A909A]">
            Preferences
          </span>
          <h2 className="text-[18px] font-bold text-[#121316]">
            Application & Currency Settings
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
              Base Currency
            </label>
            <select
              value={currencyCode}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#E2E4E0] rounded-[0.25rem] text-[14px] text-[#121316] input-focus-ring cursor-pointer"
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c].symbol} — {CURRENCIES[c].name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#8A909A] mt-1">
              SpendSense defaults to INR (₹) with Indian Lakhs and Crores formatting.
            </p>
          </div>

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.02em] text-[#52565E] mb-1">
              Demo Data Reset
            </label>
            <button
              onClick={onResetData}
              className="w-full h-10 px-4 text-[13px] font-semibold text-[#C62828] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] rounded-[0.25rem] transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo / Guest Ledger
            </button>
            <p className="text-[11px] text-[#8A909A] mt-1">
              Resets guest records without affecting authenticated Supabase data.
            </p>
          </div>
        </div>

        {/* Clean Project Archive Download */}
        <div className="pt-4 border-t border-[#E2E4E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-[13px] font-semibold text-[#121316]">Clean Project Package</h4>
            <p className="text-[12px] text-[#52565E]">
              Download the complete, secret-free SpendSense source archive with <code>.env.example</code>.
            </p>
          </div>
          <a
            href="/api/download-project"
            download="spendsense-project.zip"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-[#1B4332] bg-[#ECFDF5] border border-[#A7F3D0] hover:bg-[#D1FAE5] rounded-[0.25rem] transition-colors self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#10B981]" />
            Download Clean Project ZIP
          </a>
        </div>
      </div>
    </div>
  );
};
