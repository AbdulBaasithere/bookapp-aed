import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export interface SupabaseConfig {
  configured: boolean;
  url: string | null;
  key: string | null;
  source: 'env' | 'local' | null;
}

// Synchronously attempts to initialize Supabase from import.meta.env or localStorage if available
function trySyncInit(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  // 1. Check localStorage first
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('glance_supabase_url')?.trim() : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('glance_supabase_key')?.trim() : null;

  if (localUrl && localKey) {
    try {
      supabaseInstance = createClient(localUrl, localKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return supabaseInstance;
    } catch (e) {
      console.error('Failed to initialize Supabase from localStorage credentials:', e);
    }
  }

  // 2. Check import.meta.env (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY)
  const viteUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const viteKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY) as string | undefined)?.trim();

  if (viteUrl && viteKey) {
    try {
      supabaseInstance = createClient(viteUrl, viteKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return supabaseInstance;
    } catch (e) {
      console.error('Failed to initialize Supabase from import.meta.env:', e);
    }
  }

  return null;
}

export async function fetchSupabaseConfig(): Promise<SupabaseConfig> {
  // 1. Check server environment config first (/api/supabase/config)
  try {
    const res = await fetch('/api/supabase/config');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.configured && data.supabaseUrl && data.supabaseKey) {
        return {
          configured: true,
          url: data.supabaseUrl,
          key: data.supabaseKey,
          source: 'env'
        };
      }
    }
  } catch (e) {
    // Server config request failed or running in pure static client mode
  }

  // 2. Try Vite client environment variables (for Vercel / Netlify / static SPA deployments)
  const viteUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const viteKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY) as string | undefined)?.trim();

  if (viteUrl && viteKey) {
    return {
      configured: true,
      url: viteUrl,
      key: viteKey,
      source: 'env'
    };
  }

  // 3. Fallback to localStorage if configured
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('glance_supabase_url')?.trim() : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('glance_supabase_key')?.trim() : null;

  if (localUrl && localKey) {
    return {
      configured: true,
      url: localUrl,
      key: localKey,
      source: 'local'
    };
  }

  return {
    configured: false,
    url: null,
    key: null,
    source: null
  };
}

export async function initSupabase(): Promise<SupabaseClient | null> {
  const existing = trySyncInit();
  if (existing) return existing;

  const config = await fetchSupabaseConfig();
  if (config.url && config.key) {
    try {
      supabaseInstance = createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return supabaseInstance;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }

  return null;
}

export function getSupabase(): SupabaseClient | null {
  return trySyncInit();
}

export function isSupabaseInitialized(): boolean {
  return trySyncInit() !== null;
}

export function saveLocalSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('glance_supabase_url', url.trim());
    localStorage.setItem('glance_supabase_key', key.trim());
  }
  supabaseInstance = null;
  trySyncInit();
}

export function clearLocalSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('glance_supabase_url');
    localStorage.removeItem('glance_supabase_key');
  }
  supabaseInstance = null;
}

function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result: any, key) => {
      let value = obj[key];
      const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snake] = value;
      return result;
    }, {});
  }
  return obj;
}

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result: any, key) => {
      let value = obj[key];
      if (key === 'working_hours') {
        try {
          if (typeof value === 'string') {
            value = JSON.parse(value);
          }
        } catch (e) {
          // ignore
        }
      }
      const camel = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camel] = value;
      return result;
    }, {});
  }
  return obj;
}

export async function syncDirectWithSupabase(client: SupabaseClient, payload: any): Promise<any> {
  const {
    userId,
    activeBusinessId,
    fetchOnly = false,
    businesses = [],
    staff = [],
    clients = [],
    packages = [],
    bookings = [],
    payments = [],
    services = []
  } = payload;

  if (!userId) {
    throw new Error('Authentication is required. User ID must be provided.');
  }

  const rawFallbackId = activeBusinessId || (businesses[0]?.id) || 'biz-1';
  const fallbackBizId = rawFallbackId === 'biz-1' ? `biz-1-${userId}` : rawFallbackId;

  if (!fetchOnly) {
    // 1. Businesses
    if (businesses.length > 0) {
      const dbBusinesses = toSnakeCase(businesses).map((b: any) => ({
        ...b,
        id: b.id === 'biz-1' ? `biz-1-${userId}` : b.id,
        user_id: userId,
        created_at: b.created_at || new Date().toISOString()
      }));
      let { error: bizErr } = await client.from('businesses').upsert(dbBusinesses);
      if (bizErr) {
        if (bizErr.message?.includes('businesses_type_check') || bizErr.code === '23514') {
          const safeDbBusinesses = dbBusinesses.map((b: any) => {
            const allowed = ['salon', 'spa', 'clinic', 'gym'];
            const lowerType = (b.type || '').toLowerCase();
            return { ...b, type: allowed.includes(lowerType) ? lowerType : 'salon' };
          });
          const { error: retryErr } = await client.from('businesses').upsert(safeDbBusinesses);
          if (retryErr) bizErr = retryErr;
          else bizErr = null;
        }

        if (bizErr) {
          const missingMatch = bizErr.message?.match(/Could not find the '([^']+)' column/i);
          if (missingMatch && missingMatch[1]) {
            const colName = missingMatch[1];
            console.warn(`[Direct Sync] Retrying businesses upsert without missing column '${colName}'...`);
            const strippedDbBusinesses = dbBusinesses.map((b: any) => {
              const copy = { ...b };
              delete copy[colName];
              return copy;
            });
            await client.from('businesses').upsert(strippedDbBusinesses);
          }
        }
      }
    }

    // 2. Staff
    if (staff.length > 0) {
      const dbStaff = toSnakeCase(staff).map((s: any) => {
        const rawBizId = s.business_id || fallbackBizId;
        const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
        return { ...s, business_id: mappedBizId, user_id: userId, created_at: s.created_at || new Date().toISOString() };
      });
      await client.from('staff').upsert(dbStaff);
    }

    // 3. Clients
    if (clients.length > 0) {
      const dbClients = toSnakeCase(clients).map((c: any) => {
        const rawBizId = c.business_id || fallbackBizId;
        const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
        return { ...c, business_id: mappedBizId, user_id: userId, created_at: c.created_at || new Date().toISOString() };
      });
      await client.from('clients').upsert(dbClients);
    }

    // 4. Packages
    if (packages.length > 0) {
      const dbPackages = toSnakeCase(packages).map((p: any) => {
        const rawBizId = p.business_id || fallbackBizId;
        const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
        return { ...p, business_id: mappedBizId, user_id: userId, created_at: p.created_at || new Date().toISOString() };
      });
      await client.from('packages').upsert(dbPackages);
    }

    // 5. Bookings
    const dbBookings = toSnakeCase(bookings).map((b: any) => {
      const rawBizId = b.business_id || fallbackBizId;
      const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
      return { ...b, business_id: mappedBizId, user_id: userId, created_at: b.created_at || new Date().toISOString() };
    });

    const bookingIds = dbBookings.map((b: any) => b.id);
    if (bookingIds.length > 0) {
      await client.from('bookings').delete().eq('user_id', userId).eq('business_id', fallbackBizId).not('id', 'in', `(${bookingIds.join(',')})`);
    } else {
      await client.from('bookings').delete().eq('user_id', userId).eq('business_id', fallbackBizId);
    }
    if (dbBookings.length > 0) {
      await client.from('bookings').upsert(dbBookings);
    }

    // 6. Payments
    const dbPayments = toSnakeCase(payments).map((p: any) => {
      const rawBizId = p.business_id || fallbackBizId;
      const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
      return { ...p, business_id: mappedBizId, user_id: userId, created_at: p.created_at || new Date().toISOString() };
    });

    const paymentIds = dbPayments.map((p: any) => p.id);
    if (paymentIds.length > 0) {
      await client.from('payments').delete().eq('user_id', userId).eq('business_id', fallbackBizId).not('id', 'in', `(${paymentIds.join(',')})`);
    } else {
      await client.from('payments').delete().eq('user_id', userId).eq('business_id', fallbackBizId);
    }
    if (dbPayments.length > 0) {
      await client.from('payments').upsert(dbPayments);
    }

    // 7. Services
    try {
      const dbServices = toSnakeCase(services).map((s: any) => {
        const rawBizId = s.business_id || fallbackBizId;
        const mappedBizId = (rawBizId === 'biz-1' || !rawBizId) ? `biz-1-${userId}` : rawBizId;
        return { ...s, business_id: mappedBizId, user_id: userId, created_at: s.created_at || new Date().toISOString() };
      });
      await client.from('services').delete().eq('user_id', userId).eq('business_id', fallbackBizId);
      if (dbServices.length > 0) {
        await client.from('services').upsert(dbServices);
      }
    } catch (e) {
      // ignore missing services table if not created in user's DB schema
    }
  }

  // Fetch updated records from Supabase directly
  const [
    { data: resBizs },
    { data: resStaff },
    { data: resClients },
    { data: resPkgs },
    { data: resBookings },
    { data: resPayments },
    { data: resServices }
  ] = await Promise.all([
    client.from('businesses').select('*').eq('user_id', userId),
    client.from('staff').select('*').eq('user_id', userId),
    client.from('clients').select('*').eq('user_id', userId),
    client.from('packages').select('*').eq('user_id', userId),
    client.from('bookings').select('*').eq('user_id', userId),
    client.from('payments').select('*').eq('user_id', userId),
    client.from('services').select('*').eq('user_id', userId)
  ]);

  return {
    success: true,
    data: {
      businesses: toCamelCase(resBizs || []),
      staff: toCamelCase(resStaff || []),
      clients: toCamelCase(resClients || []),
      packages: toCamelCase(resPkgs || []),
      bookings: toCamelCase(resBookings || []),
      payments: toCamelCase(resPayments || []),
      services: toCamelCase(resServices || [])
    }
  };
}

export async function performSupabaseSync(payload: any): Promise<any> {
  const client = getSupabase() || (await initSupabase());
  const token = (await client?.auth.getSession())?.data.session?.access_token || '';

  // 1. Attempt server endpoint call if available
  try {
    const res = await fetch('/api/supabase/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (json && json.success) {
          return json;
        }
      }
    }
  } catch (e) {
    // Backend endpoint unavailable (e.g., static hosting on Vercel)
  }

  // 2. Fallback to direct client-side Supabase synchronization
  if (client) {
    return await syncDirectWithSupabase(client, payload);
  }

  throw new Error('Supabase client is not initialized. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment variables or enter credentials in the login page.');
}

