import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Settings
} from 'lucide-react';
import {
  initSupabase,
  getSupabase,
  fetchSupabaseConfig
} from '../utils/supabaseClient';
import SupabaseDiagnostic from './SupabaseDiagnostic';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onBypass: () => void;
}

export default function Login({ onLoginSuccess, onBypass }: LoginProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Supabase connection state
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [config, setConfig] = useState<{
    configured: boolean;
    url: string | null;
    key: string | null;
    source: 'env' | 'local' | null;
  }>({ configured: false, url: null, key: null, source: null });

  // Automatically load configuration from environment (.env) on mount
  useEffect(() => {
    async function loadConfig() {
      const cfg = await fetchSupabaseConfig();
      setConfig(cfg);
      await initSupabase();
    }
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    let supabase = getSupabase();
    if (!supabase) {
      supabase = await initSupabase();
    }

    if (!supabase) {
      setError('Supabase client is not connected. Please ensure SUPABASE_URL and SUPABASE_KEY are set in your .env file.');
      setLoading(false);
      return;
    }

    try {
      if (activeTab === 'signin') {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authErr) throw authErr;

        if (data.user) {
          setSuccessMsg('Sign in successful! Redirecting...');
          setTimeout(() => {
            onLoginSuccess(data.user);
          }, 600);
        }
      } else {
        const { data, error: authErr } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authErr) throw authErr;

        if (data.user) {
          setSuccessMsg('Account created successfully! Redirecting...');
          setTimeout(() => {
            onLoginSuccess(data.user);
          }, 800);
        }
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let msg = err.message || 'An error occurred during authentication.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Invalid email or password. Please double-check your credentials.';
      } else if (msg.includes('User already registered')) {
        msg = 'An account with this email already exists. Please sign in instead.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-500/20 mb-1">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-display">
            Book App
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Smart Salon & Business OS
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 space-y-6">

          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:outline-indigo-500 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 transition-all"
                  placeholder="owner@salon.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:outline-indigo-500 pl-10 pr-10 py-2.5 rounded-xl text-xs font-semibold text-slate-800 transition-all"
                  placeholder="••••••••••••"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold leading-relaxed animate-fade-in">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs font-semibold leading-relaxed animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-3 rounded-xl cursor-pointer transition-all disabled:opacity-50 active:scale-98"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{activeTab === 'signin' ? 'Sign In to Portal' : 'Create Free Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Offline local demo bypass option */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-150"></div>
            <span className="flex-shrink mx-4 text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-slate-150"></div>
          </div>

          <button
            type="button"
            onClick={onBypass}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-700 hover:text-indigo-800 text-xs font-extrabold py-3 rounded-xl cursor-pointer transition-all border border-indigo-100/30"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            <span>Launch Offline Local Demo Mode</span>
          </button>

          {/* Cloud Database Connection Indicator */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Database className={`h-4 w-4 ${config.configured ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-[11px] font-semibold text-slate-600">
                {config.configured
                  ? 'Connected to Supabase (.env)'
                  : 'Supabase Connecting (.env)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDiagnosticModal(true)}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <Settings className="h-3 w-3" />
              <span>Diagnostics</span>
            </button>
          </div>

        </div>

      </div>

      {/* Diagnostic Modal */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl my-8">
            <SupabaseDiagnostic onClose={() => setShowDiagnosticModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
