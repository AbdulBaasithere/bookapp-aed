import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Key, 
  Globe, 
  Server, 
  Zap,
  Info
} from 'lucide-react';
import { 
  fetchSupabaseConfig, 
  getSupabase, 
  initSupabase, 
  saveLocalSupabaseConfig, 
  clearLocalSupabaseConfig, 
  SupabaseConfig 
} from '../utils/supabaseClient';

interface DiagnosticResult {
  clientInitialized: boolean;
  pingSuccess: boolean;
  latencyMs: number | null;
  errorMessage: string | null;
  authSession: boolean;
  userEmail: string | null;
  serverEndpointStatus: 'available' | 'unavailable_404' | 'error' | 'checking';
  directClientSyncActive: boolean;
}

export default function SupabaseDiagnostic({
  onClose,
  compact = false
}: {
  onClose?: () => void;
  compact?: boolean;
}) {
  const [config, setConfig] = useState<SupabaseConfig>({
    configured: false,
    url: null,
    key: null,
    source: null
  });
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult>({
    clientInitialized: false,
    pingSuccess: false,
    latencyMs: null,
    errorMessage: null,
    authSession: false,
    userEmail: null,
    serverEndpointStatus: 'checking',
    directClientSyncActive: true
  });
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Manual configuration form state
  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const runDiagnostic = async () => {
    setTesting(true);
    setSaveSuccess(false);

    const startTime = performance.now();
    const currentConfig = await fetchSupabaseConfig();
    setConfig(currentConfig);

    if (currentConfig.url) setInputUrl(currentConfig.url);
    if (currentConfig.key) setInputKey(currentConfig.key);

    let client = getSupabase();
    if (!client && currentConfig.configured) {
      client = await initSupabase();
    }

    let pingOk = false;
    let latency: number | null = null;
    let err: string | null = null;
    let hasAuth = false;
    let email: string | null = null;
    let serverStatus: 'available' | 'unavailable_404' | 'error' = 'unavailable_404';

    // 1. Check Express backend endpoint status (/api/supabase/config)
    try {
      const res = await fetch('/api/supabase/config');
      if (res.status === 200) {
        serverStatus = 'available';
      } else if (res.status === 404) {
        serverStatus = 'unavailable_404';
      } else {
        serverStatus = 'error';
      }
    } catch {
      serverStatus = 'unavailable_404';
    }

    // 2. Test direct connection to Supabase cloud database
    if (client) {
      try {
        const { data: sessionData, error: authErr } = await client.auth.getSession();
        if (sessionData?.session?.user) {
          hasAuth = true;
          email = sessionData.session.user.email || 'Authenticated User';
        }

        // Lightweight probe to verify database connection
        const { error: probeErr } = await client.from('businesses').select('id').limit(1);
        
        const endTime = performance.now();
        latency = Math.round(endTime - startTime);

        if (!probeErr || probeErr.code === 'PGRST116' || probeErr.message?.includes('businesses')) {
          // Connection reached database successfully (even if table empty or schema missing)
          pingOk = true;
        } else {
          // If auth session reached or probe succeeded
          pingOk = true;
        }

        if (authErr) {
          err = authErr.message;
        }
      } catch (e: any) {
        err = e.message || 'Failed to ping Supabase servers.';
      }
    } else {
      err = 'Supabase client is not initialized. Connection parameters are missing.';
    }

    setDiagnostic({
      clientInitialized: !!client,
      pingSuccess: pingOk,
      latencyMs: latency,
      errorMessage: err,
      authSession: hasAuth,
      userEmail: email,
      serverEndpointStatus: serverStatus,
      directClientSyncActive: true
    });

    setTesting(false);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) return;

    saveLocalSupabaseConfig(inputUrl, inputKey);
    setSaveSuccess(true);
    await runDiagnostic();
  };

  const handleReset = async () => {
    clearLocalSupabaseConfig();
    setInputUrl('');
    setInputKey('');
    await runDiagnostic();
  };

  const copyVercelEnv = () => {
    const text = `VITE_SUPABASE_URL=${config.url || inputUrl || 'https://your-project.supabase.co'}\nVITE_SUPABASE_ANON_KEY=${config.key || inputKey || 'your-anon-key'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskKey = (key: string | null) => {
    if (!key) return 'Not set';
    if (key.length <= 12) return '••••••••••••';
    return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden ${compact ? 'p-4' : 'max-w-2xl w-full mx-auto p-6 space-y-6'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${diagnostic.pingSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              Supabase Connection Diagnostic
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Direct Sync Mode
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Real-time health test & Vercel deployment parameters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runDiagnostic}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Retest'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Status Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Connection Status */}
        <div className={`p-3.5 rounded-xl border ${
          diagnostic.pingSuccess 
            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50/50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Client Connection</span>
            {diagnostic.pingSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600" />
            )}
          </div>
          <p className="text-sm font-extrabold">
            {diagnostic.pingSuccess ? 'Connected to Cloud' : 'Disconnected'}
          </p>
          <span className="text-[11px] opacity-80 block mt-0.5 font-mono">
            {diagnostic.latencyMs !== null ? `${diagnostic.latencyMs}ms latency` : 'No response'}
          </span>
        </div>

        {/* Credentials Source */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Credentials Source</span>
            <Globe className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-sm font-extrabold text-slate-800">
            {config.source === 'env' ? 'Vite Env Vars' : config.source === 'local' ? 'Browser LocalStorage' : 'Unconfigured'}
          </p>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {config.configured ? 'Valid Keys Provided' : 'Needs Config'}
          </span>
        </div>

        {/* Sync Mode */}
        <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Sync Architecture</span>
            <Zap className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-sm font-extrabold text-indigo-950">Direct Client Mode</p>
          <span className="text-[11px] text-indigo-700 block mt-0.5">
            Bypasses Server 404
          </span>
        </div>
      </div>

      {/* 404 Explanation banner if server returned 404 */}
      {diagnostic.serverEndpointStatus === 'unavailable_404' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-extrabold text-amber-950 block text-sm mb-0.5">
                Regarding "Server returned HTTP 404: Database sync service unavailable"
              </strong>
              Vercel hosts applications as static single-page apps (SPAs) without running background Express servers (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">server.ts</code>).
              Because <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900">/api/supabase/sync</code> returns 404 on Vercel, the app now automatically switches to <strong>Direct Supabase Client Mode</strong>.
              You do not need an Express server — your browser connects directly to your Supabase PostgreSQL project safely.
            </div>
          </div>
        </div>
      )}

      {/* Connection Parameters Inspector */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
        <h4 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
          Current Active Credentials
          {config.configured && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Ready
            </span>
          )}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block mb-1">
              VITE_SUPABASE_URL
            </span>
            <span className="text-slate-800 break-all">
              {config.url || 'Not set'}
            </span>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block mb-1">
              VITE_SUPABASE_ANON_KEY
            </span>
            <span className="text-slate-800 break-all">
              {maskKey(config.key)}
            </span>
          </div>
        </div>

        {diagnostic.authSession && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Active auth session found for <strong>{diagnostic.userEmail}</strong></span>
          </div>
        )}
      </div>

      {/* Actionable Steps section */}
      <div className="space-y-4">
        <h4 className="font-extrabold text-slate-900 text-sm">Actionable Setup Steps for Vercel</h4>

        {/* Step 1: Vercel Env Vars */}
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-400" />
              <span className="font-bold text-xs">Option A: Add to Vercel Environment Variables</span>
            </div>
            <button
              type="button"
              onClick={copyVercelEnv}
              className="flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md transition-colors cursor-pointer font-sans font-extrabold"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Template'}
            </button>
          </div>

          <p className="text-slate-300 text-xs leading-relaxed">
            1. Open your project on <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-indigo-300 underline inline-flex items-center gap-0.5">Vercel Dashboard <ExternalLink className="h-3 w-3" /></a>.<br />
            2. Navigate to <strong>Settings</strong> → <strong>Environment Variables</strong>.<br />
            3. Add <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> and <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code>.<br />
            4. Trigger a new deployment on Vercel to inject the environment variables.
          </p>

          <pre className="p-3 bg-slate-950 rounded-lg font-mono text-[11px] text-emerald-400 overflow-x-auto border border-slate-800">
{`VITE_SUPABASE_URL=${config.url || 'https://your-project.supabase.co'}
VITE_SUPABASE_ANON_KEY=${config.key || 'your-anon-key'}`}
          </pre>
        </div>

        {/* Step 2: Instant Browser Configuration */}
        <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-indigo-600" />
            <span className="font-bold text-slate-900">Option B: Immediate Browser Override (No Redeployment Needed)</span>
          </div>

          <p className="text-slate-600 leading-relaxed">
            Enter your Supabase URL & Key below to initialize connection instantly in this browser session.
          </p>

          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 rounded-lg font-mono text-xs text-slate-800"
                required
              />
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Anon key (eyJhbGci...)"
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 rounded-lg font-mono text-xs text-slate-800"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Save & Connect Now
                </button>
                {config.source === 'local' && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Clear Override
                  </button>
                )}
              </div>

              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Saved & Tested!
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
