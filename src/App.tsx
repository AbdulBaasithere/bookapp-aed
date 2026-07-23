import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase, initSupabase, performSupabaseSync, fetchSupabaseConfig } from './utils/supabaseClient';
import Login from './components/Login';

const originalFetch = typeof window !== 'undefined' ? window.fetch : undefined;
const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input && (input as any).url) || '');
  if (originalFetch && url.includes('/api/supabase/')) {
    let lastError: any;
    for (let i = 0; i < 3; i++) {
      try {
        return await originalFetch(input, init);
      } catch (err: any) {
        lastError = err;
        if (i === 2) break;
        console.warn(`Fetch to ${url} failed (attempt ${i + 1}/3). Retrying in 1000ms...`, err);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw lastError || new Error(`Failed to fetch ${url} after 3 attempts.`);
  }
  if (!originalFetch) {
    throw new Error('Fetch is not available in this environment.');
  }
  return originalFetch(input, init);
};

async function safeParseResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (contentType.includes('application/json') || (text && (text.trim().startsWith('{') || text.trim().startsWith('[')))) {
    try {
      return JSON.parse(text);
    } catch (e) {
      // Fall through to error
    }
  }
  if (!res.ok) {
    throw new Error(`Server returned HTTP ${res.status}: ${res.statusText || 'Database sync service unavailable.'}`);
  }
  throw new Error('Server returned non-JSON response.');
}
import { 
  DEFAULT_BUSINESS, 
  DEFAULT_STAFF, 
  DEFAULT_CLIENTS, 
  DEFAULT_PACKAGES, 
  DEFAULT_BOOKINGS, 
  DEFAULT_PAYMENTS,
  DEFAULT_SERVICES,
  DEFAULT_LIVE_FEED
} from './initialData';
import { Business, Staff, Client, Package, Booking, Payment, Service, getBusinessEmoji } from './types';

// Import Views
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import ClientProfiles from './components/ClientProfiles';
import PackagesTracker from './components/PackagesTracker';
import PaymentsLedger from './components/PaymentsLedger';
import SettingsConfig from './components/SettingsConfig';
import ChatBot from './components/ChatBot';

// Icons
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Users, 
  Ticket, 
  CreditCard, 
  Settings as SettingsIcon,
  Sparkles,
  ShieldCheck,
  Plus,
  LogOut,
  User as UserIcon,
  Database,
  RefreshCw,
  CloudUpload,
  Loader2,
  Download,
  Check,
  AlertTriangle,
  X,
  Undo2,
  Trash2
} from 'lucide-react';


/**
 * Service layer function to identify bookings happening tomorrow
 * and generate a pre-filled WhatsApp deep link for each.
 */
export function getTomorrowWhatsAppReminders(
  bookings: Booking[],
  businessName: string = "Book App"
): Array<{ booking: Booking; whatsAppLink: string }> {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const tomorrowStr = `${year}-${month}-${date}`;

  // Filter bookings that start with tomorrow's date and are not cancelled
  const tomorrowBookings = bookings.filter(
    b => b.dateTime.startsWith(tomorrowStr) && b.status !== 'cancelled'
  );

  return tomorrowBookings.map(b => {
    const bookingDate = new Date(b.dateTime);
    const dateStr = bookingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = bookingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const text = `*APPOINTMENT REMINDER - ${businessName.toUpperCase()}* 🔔\n\n` +
      `Dear *${b.clientName}*,\n` +
      `This is a friendly reminder of your upcoming booking tomorrow:\n\n` +
      `📅 *Date:* ${dateStr} (Tomorrow)\n` +
      `⏰ *Time:* ${timeStr}\n` +
      `💇 *Service:* ${b.serviceName}\n` +
      `⌛ *Duration:* ${b.durationMinutes} mins\n\n` +
      `Please let us know if you need to reschedule. We look forward to seeing you! ✨`;

    let cleanPhone = b.clientPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const whatsAppLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    return {
      booking: b,
      whatsAppLink
    };
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Supabase Auth and Sync States
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isBypassed, setIsBypassed] = useState(() => {
    return localStorage.getItem('glance_auth_bypassed') === 'true';
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ configured: boolean; url: string | null }>({
    configured: false,
    url: null
  });

  // Fetch Supabase configuration status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const cfg = await fetchSupabaseConfig();
        setSupabaseStatus({ configured: cfg.configured, url: cfg.url });
      } catch (e) {
        console.error('Failed to fetch Supabase status', e);
      }
    }
    fetchStatus();
  }, []);

  // Check active session on mount & subscribe to changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function checkAuth() {
      try {
        const client = await initSupabase();
        if (client) {
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            setUser(session.user);
          }
          
          const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              setUser(session.user);
            } else {
              setUser(null);
            }
          });

          unsubscribe = () => {
            subscription.unsubscribe();
          };
        }
      } catch (e) {
        console.error('Error during Auth check:', e);
      } finally {
        setAuthChecked(true);
      }
    }
    
    checkAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSyncWithSupabase = async () => {
    if (!user) {
      setSyncError('You must be logged in to sync with the database.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const result = await performSupabaseSync({
        userId: user.id,
        activeBusinessId,
        businesses,
        staff,
        clients,
        packages,
        bookings,
        payments,
        services
      });

      if (result.success && result.data) {
        const { data } = result;
        
        let targetBizId = activeBusinessId;
        if (activeBusinessId === 'biz-1' && user) {
          const mappedId = `biz-1-${user.id}`;
          const hasMappedBiz = data.businesses?.some((b: any) => b.id === mappedId);
          if (hasMappedBiz) {
            targetBizId = mappedId;
            setActiveBusinessId(mappedId);
            localStorage.setItem('glance_active_business_id', mappedId);
          }
        }

        if (data.businesses?.length > 0) {
          setBusinesses(data.businesses);
          localStorage.setItem('glance_businesses', JSON.stringify(data.businesses));
        }

        // Filter and set for active business
        const filteredStaff = (data.staff || []).filter((s: any) => s.businessId === targetBizId);
        setStaff(filteredStaff);
        localStorage.setItem(`glance_staff_${targetBizId}`, JSON.stringify(filteredStaff));

        const filteredClients = (data.clients || []).filter((c: any) => c.businessId === targetBizId);
        setClients(filteredClients);
        localStorage.setItem(`glance_clients_${targetBizId}`, JSON.stringify(filteredClients));

        const filteredPkgs = (data.packages || []).filter((p: any) => p.businessId === targetBizId);
        setPackages(filteredPkgs);
        localStorage.setItem(`glance_packages_${targetBizId}`, JSON.stringify(filteredPkgs));

        const filteredBookings = (data.bookings || []).filter((b: any) => b.businessId === targetBizId);
        setBookings(filteredBookings);
        localStorage.setItem(`glance_bookings_${targetBizId}`, JSON.stringify(filteredBookings));

        const filteredPayments = (data.payments || []).filter((p: any) => p.businessId === targetBizId);
        setPayments(filteredPayments);
        localStorage.setItem(`glance_payments_${targetBizId}`, JSON.stringify(filteredPayments));

        if (!result.servicesTableMissing) {
          const filteredServices = (data.services || []).filter((s: any) => s.businessId === targetBizId);
          setServices(filteredServices);
          localStorage.setItem(`glance_services_${targetBizId}`, JSON.stringify(filteredServices));
        }

        // Group and save the rest of the businesses in localStorage
        data.businesses.forEach((b: any) => {
          if (b.id === targetBizId) return;
          const bStaff = (data.staff || []).filter((s: any) => s.businessId === b.id);
          const bClients = (data.clients || []).filter((c: any) => c.businessId === b.id);
          const bPkgs = (data.packages || []).filter((p: any) => p.businessId === b.id);
          const bBookings = (data.bookings || []).filter((bk: any) => bk.businessId === b.id);
          const bPayments = (data.payments || []).filter((p: any) => p.businessId === b.id);

          localStorage.setItem(`glance_staff_${b.id}`, JSON.stringify(bStaff));
          localStorage.setItem(`glance_clients_${b.id}`, JSON.stringify(bClients));
          localStorage.setItem(`glance_packages_${b.id}`, JSON.stringify(bPkgs));
          localStorage.setItem(`glance_bookings_${b.id}`, JSON.stringify(bBookings));
          localStorage.setItem(`glance_payments_${b.id}`, JSON.stringify(bPayments));

          if (!result.servicesTableMissing) {
            const bServices = (data.services || []).filter((s: any) => s.businessId === b.id);
            localStorage.setItem(`glance_services_${b.id}`, JSON.stringify(bServices));
          }
        });

        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'Synchronization failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    const client = getSupabase();
    if (client) {
      await client.auth.signOut();
    }
    
    // Clear all client-side cached data in local storage
    localStorage.removeItem('glance_auth_bypassed');
    localStorage.removeItem('glance_businesses');
    localStorage.removeItem('glance_active_business_id');
    localStorage.removeItem('glance_live_feed');
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('glance_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error clearing local storage keys:', e);
    }

    // Reset state back to clean defaults
    setUser(null);
    setIsBypassed(false);
    setBusinesses([{ ...DEFAULT_BUSINESS, id: 'biz-1' }]);
    setActiveBusinessId('biz-1');
    setStaff(DEFAULT_STAFF);
    setClients(DEFAULT_CLIENTS);
    setPackages(DEFAULT_PACKAGES);
    setBookings(DEFAULT_BOOKINGS);
    setPayments(DEFAULT_PAYMENTS);
  };

  // Automatically fetch / sync user-scoped data upon login
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadUserData = async () => {
      setIsSyncing(true);
      try {
        const result = await performSupabaseSync({
          userId: user.id,
          fetchOnly: true
        });

        if (isMounted && result.success && result.data) {
          const { data } = result;

          if (data.businesses && data.businesses.length > 0) {
            // User already has business accounts in the database. Load them.
            setBusinesses(data.businesses);
            localStorage.setItem('glance_businesses', JSON.stringify(data.businesses));

            const activeId = data.businesses[0].id;
            setActiveBusinessId(activeId);
            localStorage.setItem('glance_active_business_id', activeId);

            // Group everything by business ID!
            // First, let's save the active business's items
            const filteredStaff = (data.staff || []).filter((s: any) => s.businessId === activeId);
            setStaff(filteredStaff);
            localStorage.setItem(`glance_staff_${activeId}`, JSON.stringify(filteredStaff));

            const filteredClients = (data.clients || []).filter((c: any) => c.businessId === activeId);
            setClients(filteredClients);
            localStorage.setItem(`glance_clients_${activeId}`, JSON.stringify(filteredClients));

            const filteredPkgs = (data.packages || []).filter((p: any) => p.businessId === activeId);
            setPackages(filteredPkgs);
            localStorage.setItem(`glance_packages_${activeId}`, JSON.stringify(filteredPkgs));

            const filteredBookings = (data.bookings || []).filter((b: any) => b.businessId === activeId);
            setBookings(filteredBookings);
            localStorage.setItem(`glance_bookings_${activeId}`, JSON.stringify(filteredBookings));

            const filteredPayments = (data.payments || []).filter((p: any) => p.businessId === activeId);
            setPayments(filteredPayments);
            localStorage.setItem(`glance_payments_${activeId}`, JSON.stringify(filteredPayments));

            if (!result.servicesTableMissing) {
              const filteredServices = (data.services || []).filter((s: any) => s.businessId === activeId);
              setServices(filteredServices);
              localStorage.setItem(`glance_services_${activeId}`, JSON.stringify(filteredServices));
            }

            // Group and save the rest of the businesses in localStorage!
            data.businesses.forEach((b: any) => {
              if (b.id === activeId) return;
              const bStaff = (data.staff || []).filter((s: any) => s.businessId === b.id);
              const bClients = (data.clients || []).filter((c: any) => c.businessId === b.id);
              const bPkgs = (data.packages || []).filter((p: any) => p.businessId === b.id);
              const bBookings = (data.bookings || []).filter((bk: any) => bk.businessId === b.id);
              const bPayments = (data.payments || []).filter((p: any) => p.businessId === b.id);

              localStorage.setItem(`glance_staff_${b.id}`, JSON.stringify(bStaff));
              localStorage.setItem(`glance_clients_${b.id}`, JSON.stringify(bClients));
              localStorage.setItem(`glance_packages_${b.id}`, JSON.stringify(bPkgs));
              localStorage.setItem(`glance_bookings_${b.id}`, JSON.stringify(bBookings));
              localStorage.setItem(`glance_payments_${b.id}`, JSON.stringify(bPayments));

              if (!result.servicesTableMissing) {
                const bServices = (data.services || []).filter((s: any) => s.businessId === b.id);
                localStorage.setItem(`glance_services_${b.id}`, JSON.stringify(bServices));
              }
            });
          } else {
            // Brand new user without database records.
            // Push current local state to the database to back it up.
            const initialBizs = businesses.map(b => ({ ...b, id: b.id || 'biz-1' }));
            
            await performSupabaseSync({
              userId: user.id,
              activeBusinessId,
              businesses: initialBizs,
              staff,
              clients,
              packages,
              bookings,
              payments,
              services
            });
            console.log('Successfully backed up initial state to database for brand new user.');
          }
        }
      } catch (err) {
        console.error('Error loading user-scoped database:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Multi-Business States
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    try {
      const saved = localStorage.getItem('glance_businesses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading businesses from local storage', e);
    }
    // Try legacy migration
    try {
      const legacyBusiness = localStorage.getItem('glance_business');
      if (legacyBusiness) {
        const parsed = JSON.parse(legacyBusiness);
        const withId = { ...parsed, id: parsed.id || 'biz-1' };
        localStorage.setItem('glance_businesses', JSON.stringify([withId]));
        localStorage.setItem('glance_active_business_id', withId.id);
        return [withId];
      }
    } catch (e) {
      console.error('Error migrating legacy single business', e);
    }
    return [{ ...DEFAULT_BUSINESS, id: 'biz-1' }];
  });

  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('glance_active_business_id');
      if (saved) return saved;
    } catch (e) {
      console.error('Error loading active business ID', e);
    }
    try {
      const savedBizs = localStorage.getItem('glance_businesses');
      if (savedBizs) {
        const parsed = JSON.parse(savedBizs);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch (e) {
      console.error(e);
    }
    return 'biz-1';
  });

  // Active Business derived dynamically from state
  const business = businesses.find(b => b.id === activeBusinessId) || businesses[0] || { ...DEFAULT_BUSINESS, id: 'biz-1' };

  // Business States
  const [staff, setStaff] = useState<Staff[]>(DEFAULT_STAFF);
  const [clients, setClients] = useState<Client[]>(DEFAULT_CLIENTS);
  const [packages, setPackages] = useState<Package[]>(DEFAULT_PACKAGES);
  const [bookings, setBookings] = useState<Booking[]>(DEFAULT_BOOKINGS);
  const [payments, setPayments] = useState<Payment[]>(DEFAULT_PAYMENTS);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [lastExportDate, setLastExportDate] = useState<string | null>(() => {
    return localStorage.getItem('glance_last_export_date');
  });

  // Register service-layer function globally for access/utility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getTomorrowWhatsAppReminders = (customBookings?: Booking[]) => {
        return getTomorrowWhatsAppReminders(customBookings || bookings, business.name);
      };
    }
  }, [bookings, business.name]);

  // Undo Delete State
  const [lastDeletedBooking, setLastDeletedBooking] = useState<{
    booking: Booking;
    payments: Payment[];
    packages: Package[];
  } | null>(null);

  // Auto-clear undo toast after 12 seconds
  useEffect(() => {
    if (lastDeletedBooking) {
      const timer = setTimeout(() => {
        setLastDeletedBooking(null);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [lastDeletedBooking]);

  // Business Selector Dropdown states
  const [isBizDropdownOpen, setIsBizDropdownOpen] = useState(false);
  const [isMobileBizDropdownOpen, setIsMobileBizDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBizDropdownOpen(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target as Node)) {
        setIsMobileBizDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // WebSocket and Real-time Payment Tracking states
  const socketRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveFeed, setLiveFeed] = useState<Array<{
    id: string;
    timestamp: string;
    clientName: string;
    amount: number;
    method: string;
    type: string;
    businessId?: string;
  }>>(() => {
    try {
      const activeId = localStorage.getItem('glance_active_business_id') || 'biz-1';
      const savedFeed = localStorage.getItem(`glance_live_feed_${activeId}`);
      if (savedFeed) {
        const parsed = JSON.parse(savedFeed);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter(item => {
            if (!item || !item.id || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        }
      }
      return activeId === 'biz-1' ? DEFAULT_LIVE_FEED : [];
    } catch {
      return DEFAULT_LIVE_FEED;
    }
  });

  // WebSocket connection & recovery
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('Connected to Glance Real-time Sync Server');
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'SYNC_STATE') {
              if (data.payload.payments) {
                setPayments(data.payload.payments);
                localStorage.setItem(`glance_payments_${activeBusinessId}`, JSON.stringify(data.payload.payments));
              }
              if (data.payload.bookings) {
                setBookings(data.payload.bookings);
                localStorage.setItem(`glance_bookings_${activeBusinessId}`, JSON.stringify(data.payload.bookings));
              }
              if (data.payload.clients) {
                setClients(data.payload.clients);
                localStorage.setItem(`glance_clients_${activeBusinessId}`, JSON.stringify(data.payload.clients));
              }
              if (data.payload.packages) {
                setPackages(data.payload.packages);
                localStorage.setItem(`glance_packages_${activeBusinessId}`, JSON.stringify(data.payload.packages));
              }
              
              if (data.event) {
                if (!data.event.businessId || data.event.businessId === activeBusinessId) {
                  setLiveFeed(prev => {
                    if (prev.some(e => e.id === data.event.id)) return prev;
                    const nextFeed = [data.event, ...prev].slice(0, 50);
                    localStorage.setItem(`glance_live_feed_${activeBusinessId}`, JSON.stringify(nextFeed));
                    return nextFeed;
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error handling WebSocket message on client:', err);
          }
        };

        socket.onclose = () => {
          console.log('Glance Real-time Sync disconnected. Retrying...');
          setWsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
          console.warn('WebSocket connection state:', err);
          socket?.close();
        };

        socketRef.current = socket;
      } catch (err) {
        console.warn('WebSocket connection setup state:', err);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [activeBusinessId]);

  const sendSyncUpdate = (
    nextPayments: Payment[],
    nextBookings: Booking[],
    nextClients: Client[],
    nextPackages: Package[],
    eventInfo?: { clientName: string; amount: number; method: string; type: string }
  ) => {
    const eventObj = eventInfo ? {
      id: `feed-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      businessId: activeBusinessId,
      ...eventInfo
    } : undefined;

    if (eventObj) {
      setLiveFeed(prev => {
        if (prev.some(e => e.id === eventObj.id)) return prev;
        const nextFeed = [eventObj, ...prev].slice(0, 50);
        localStorage.setItem(`glance_live_feed_${activeBusinessId}`, JSON.stringify(nextFeed));
        return nextFeed;
      });
    }

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'SYNC_STATE',
        payload: {
          payments: nextPayments,
          bookings: nextBookings,
          clients: nextClients,
          packages: nextPackages
        },
        event: eventObj
      }));
    }
  };

  // Load and sync business-specific states whenever activeBusinessId changes
  useEffect(() => {
    if (!activeBusinessId) return;

    try {
      const savedStaff = localStorage.getItem(`glance_staff_${activeBusinessId}`);
      const savedClients = localStorage.getItem(`glance_clients_${activeBusinessId}`);
      const savedPackages = localStorage.getItem(`glance_packages_${activeBusinessId}`);
      const savedBookings = localStorage.getItem(`glance_bookings_${activeBusinessId}`);
      const savedPayments = localStorage.getItem(`glance_payments_${activeBusinessId}`);
      const savedServices = localStorage.getItem(`glance_services_${activeBusinessId}`);
      const savedLiveFeed = localStorage.getItem(`glance_live_feed_${activeBusinessId}`);

      // Helper to parse or fall back with migration checks
      const getInitialState = (saved: string | null, legacyKey: string, defaultVal: any) => {
        if (saved) return JSON.parse(saved);
        if (activeBusinessId === 'biz-1') {
          const legacy = localStorage.getItem(legacyKey);
          if (legacy) {
            localStorage.setItem(`${legacyKey}_biz-1`, legacy);
            return JSON.parse(legacy);
          }
        }
        return defaultVal;
      };

      setStaff(getInitialState(savedStaff, 'glance_staff', DEFAULT_STAFF));
      setClients(getInitialState(savedClients, 'glance_clients', DEFAULT_CLIENTS));
      setPackages(getInitialState(savedPackages, 'glance_packages', DEFAULT_PACKAGES));
      setBookings(getInitialState(savedBookings, 'glance_bookings', DEFAULT_BOOKINGS));
      setPayments(getInitialState(savedPayments, 'glance_payments', DEFAULT_PAYMENTS));
      setServices(getInitialState(savedServices, 'glance_services', DEFAULT_SERVICES));
      setLiveFeed(getInitialState(savedLiveFeed, 'glance_live_feed', activeBusinessId === 'biz-1' ? DEFAULT_LIVE_FEED : []));

    } catch (e) {
      console.error('Failed to load local storage state for business', activeBusinessId, e);
    }
  }, [activeBusinessId]);

  // Helper to save state & synchronize local storage
  const saveState = (key: string, value: any, setter: Function) => {
    setter(value);
    
    // Auto-scope standard state keys to the active business
    let storageKey = key;
    if (
      key === 'glance_staff' ||
      key === 'glance_clients' ||
      key === 'glance_packages' ||
      key === 'glance_bookings' ||
      key === 'glance_payments' ||
      key === 'glance_services' ||
      key === 'glance_live_feed'
    ) {
      storageKey = `${key}_${activeBusinessId}`;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(value));
  };

  // Helper for automated multi-table Supabase database synchronization
  const handleDatabaseAutoSync = async (payloadOverrides: Record<string, any> = {}, actionName = 'data update') => {
    if (!user) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const payload = {
        userId: user.id,
        activeBusinessId,
        businesses,
        staff,
        clients,
        packages,
        bookings,
        payments,
        services,
        ...payloadOverrides
      };

      const result = await performSupabaseSync(payload);

      if (result.success && result.data) {
        const { data } = result;
        
        let targetBizId = activeBusinessId;
        if (activeBusinessId === 'biz-1' && user) {
          const mappedId = `biz-1-${user.id}`;
          const hasMappedBiz = data.businesses?.some((b: any) => b.id === mappedId);
          if (hasMappedBiz) {
            targetBizId = mappedId;
            setActiveBusinessId(mappedId);
            localStorage.setItem('glance_active_business_id', mappedId);
          }
        }

        if (data.businesses?.length > 0) {
          setBusinesses(data.businesses);
          localStorage.setItem('glance_businesses', JSON.stringify(data.businesses));
        }

        // Filter and set for active business
        const filteredStaff = (data.staff || []).filter((s: any) => s.businessId === targetBizId);
        setStaff(filteredStaff);
        localStorage.setItem(`glance_staff_${targetBizId}`, JSON.stringify(filteredStaff));

        const filteredClients = (data.clients || []).filter((c: any) => c.businessId === targetBizId);
        setClients(filteredClients);
        localStorage.setItem(`glance_clients_${targetBizId}`, JSON.stringify(filteredClients));

        const filteredPkgs = (data.packages || []).filter((p: any) => p.businessId === targetBizId);
        setPackages(filteredPkgs);
        localStorage.setItem(`glance_packages_${targetBizId}`, JSON.stringify(filteredPkgs));

        const filteredBookings = (data.bookings || []).filter((b: any) => b.businessId === targetBizId);
        setBookings(filteredBookings);
        localStorage.setItem(`glance_bookings_${targetBizId}`, JSON.stringify(filteredBookings));

        const filteredPayments = (data.payments || []).filter((p: any) => p.businessId === targetBizId);
        setPayments(filteredPayments);
        localStorage.setItem(`glance_payments_${targetBizId}`, JSON.stringify(filteredPayments));

        if (data.services && !result.servicesTableMissing) {
          const filteredServices = (data.services || []).filter((s: any) => s.businessId === targetBizId);
          setServices(filteredServices);
          localStorage.setItem(`glance_services_${targetBizId}`, JSON.stringify(filteredServices));
        }

        // Group and save the rest of the businesses in localStorage
        data.businesses?.forEach((b: any) => {
          if (b.id === targetBizId) return;
          const bStaff = (data.staff || []).filter((s: any) => s.businessId === b.id);
          const bClients = (data.clients || []).filter((c: any) => c.businessId === b.id);
          const bPkgs = (data.packages || []).filter((p: any) => p.businessId === b.id);
          const bBookings = (data.bookings || []).filter((bk: any) => bk.businessId === b.id);
          const bPayments = (data.payments || []).filter((p: any) => p.businessId === b.id);

          localStorage.setItem(`glance_staff_${b.id}`, JSON.stringify(bStaff));
          localStorage.setItem(`glance_clients_${b.id}`, JSON.stringify(bClients));
          localStorage.setItem(`glance_packages_${b.id}`, JSON.stringify(bPkgs));
          localStorage.setItem(`glance_bookings_${b.id}`, JSON.stringify(bBookings));
          localStorage.setItem(`glance_payments_${b.id}`, JSON.stringify(bPayments));
        });

        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(`Auto-sync failed on ${actionName}:`, err);
      setSyncError(err.message || `Auto-synchronization failed on ${actionName}.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const formClientNameFallback = (phone: string) => {
    const found = clients.find(c => c.phone === phone);
    return found ? found.name : `Client (${phone})`;
  };

  // 1. Update Business Details
  const handleUpdateBusiness = async (updatedB: Business) => {
    const updatedBizs = businesses.map(b => b.id === activeBusinessId ? { ...updatedB, id: b.id } : b);
    setBusinesses(updatedBizs);
    localStorage.setItem('glance_businesses', JSON.stringify(updatedBizs));
    localStorage.setItem('glance_business', JSON.stringify(updatedB)); // legacy compatibility

    await handleDatabaseAutoSync({ businesses: updatedBizs }, 'business profile update');
  };

  // Switch Active Business
  const handleSwitchBusiness = (id: string) => {
    setActiveBusinessId(id);
    localStorage.setItem('glance_active_business_id', id);
  };

  // Manage Business Services
  const handleAddService = async (newService: Service) => {
    const updated = [...services, { ...newService, businessId: activeBusinessId } as any];
    saveState('glance_services', updated, setServices);

    await handleDatabaseAutoSync({ services: updated }, 'adding service');
  };

  const handleUpdateService = async (originalName: string, updatedService: Service) => {
    const updated = services.map(s => {
      if (s.name === originalName) {
        return { ...updatedService, businessId: (s as any).businessId || activeBusinessId } as any;
      }
      return s;
    });
    saveState('glance_services', updated, setServices);

    await handleDatabaseAutoSync({ services: updated }, 'updating service');
  };

  const handleDeleteService = async (serviceName: string) => {
    const updated = services.filter(s => s.name !== serviceName);
    saveState('glance_services', updated, setServices);

    await handleDatabaseAutoSync({ services: updated }, 'deleting service');
  };

  // Add a new business portal
  const handleAddBusiness = (newB: Omit<Business, 'id'>) => {
    const newId = `biz-${Date.now()}`;
    const freshBiz: Business = {
      ...newB,
      id: newId
    };
    const updated = [...businesses, freshBiz];
    setBusinesses(updated);
    localStorage.setItem('glance_businesses', JSON.stringify(updated));
    
    // Auto-switch to the new business portal
    setActiveBusinessId(newId);
    localStorage.setItem('glance_active_business_id', newId);
  };

  // Delete a business portal and its stored data
  const handleDeleteBusiness = (id: string) => {
    if (businesses.length <= 1) {
      alert("You must have at least one active business portal!");
      return;
    }

    const updated = businesses.filter(b => b.id !== id);
    setBusinesses(updated);
    localStorage.setItem('glance_businesses', JSON.stringify(updated));

    // Clear its business-specific localStorage keys
    localStorage.removeItem(`glance_staff_${id}`);
    localStorage.removeItem(`glance_clients_${id}`);
    localStorage.removeItem(`glance_packages_${id}`);
    localStorage.removeItem(`glance_bookings_${id}`);
    localStorage.removeItem(`glance_payments_${id}`);

    // If the active business was deleted, switch to the first remaining one
    if (activeBusinessId === id) {
      const nextId = updated[0].id;
      setActiveBusinessId(nextId);
      localStorage.setItem('glance_active_business_id', nextId);
    }
  };

  // 2. Manage Staff Columns
  const handleAddStaff = async (newS: Omit<Staff, 'id'>) => {
    const freshStaff: Staff = {
      ...newS,
      id: `staff-${Date.now()}`,
      businessId: activeBusinessId
    };
    const updated = [...staff, freshStaff];
    saveState('glance_staff', updated, setStaff);

    await handleDatabaseAutoSync({ staff: updated }, 'adding staff');
  };

  const handleDeleteStaff = async (staffId: string) => {
    const updated = staff.filter(s => s.id !== staffId);
    saveState('glance_staff', updated, setStaff);

    if (user) {
      const client = getSupabase();
      if (client) {
        try {
          await client.from('staff').delete().eq('id', staffId).eq('user_id', user.id);
        } catch (e) {
          console.warn('Direct staff delete warning:', e);
        }
      }
      await handleDatabaseAutoSync({ staff: updated }, 'deleting staff');
    }
  };

  // 3. Manage Clients
  const handleAddClient = async (newC: Omit<Client, 'id' | 'createdDate'>) => {
    const freshClient: Client = {
      ...newC,
      id: `client-${Date.now()}`,
      createdDate: new Date().toISOString().split('T')[0],
      businessId: activeBusinessId
    };
    const updated = [...clients, freshClient];
    saveState('glance_clients', updated, setClients);

    await handleDatabaseAutoSync({ clients: updated }, 'adding client');
  };

  const handleUpdateClientNotes = async (clientId: string, notes: string) => {
    const updated = clients.map(c => c.id === clientId ? { ...c, notes } : c);
    saveState('glance_clients', updated, setClients);

    await handleDatabaseAutoSync({ clients: updated }, 'updating client notes');
  };

  const handleUpdateClient = async (updatedC: Client) => {
    const originalClient = clients.find(c => c.id === updatedC.id);
    let nextClients = clients.map(c => c.id === updatedC.id ? updatedC : c);
    let nextBookings = bookings;
    let nextPackages = packages;
    let nextPayments = payments;

    if (originalClient && originalClient.phone !== updatedC.phone) {
      nextBookings = bookings.map(b => b.clientPhone === originalClient.phone ? { ...b, clientPhone: updatedC.phone, clientName: updatedC.name } : b);
      nextPackages = packages.map(p => p.clientPhone === originalClient.phone ? { ...p, clientPhone: updatedC.phone } : p);
      nextPayments = payments.map(p => p.clientPhone === originalClient.phone ? { ...p, clientPhone: updatedC.phone, clientName: updatedC.name } : p);

      saveState('glance_bookings', nextBookings, setBookings);
      saveState('glance_packages', nextPackages, setPackages);
      saveState('glance_payments', nextPayments, setPayments);
    } else if (originalClient && originalClient.name !== updatedC.name) {
      nextBookings = bookings.map(b => b.clientPhone === updatedC.phone ? { ...b, clientName: updatedC.name } : b);
      nextPayments = payments.map(p => p.clientPhone === updatedC.phone ? { ...p, clientName: updatedC.name } : p);

      saveState('glance_bookings', nextBookings, setBookings);
      saveState('glance_payments', nextPayments, setPayments);
    }

    saveState('glance_clients', nextClients, setClients);

    await handleDatabaseAutoSync({
      clients: nextClients,
      packages: nextPackages,
      bookings: nextBookings,
      payments: nextPayments
    }, 'updating client');
  };

  // 4. Booking creation & state orchestration
  const handleAddBooking = async (newB: Omit<Booking, 'id'>) => {
    const bookingId = `booking-${Date.now()}`;
    const freshBooking: Booking = {
      ...newB,
      id: bookingId,
      businessId: activeBusinessId
    };

    let nextClients = [...clients];
    const clientExists = clients.some(c => c.phone === newB.clientPhone);
    if (!clientExists) {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        name: newB.clientName,
        phone: newB.clientPhone,
        notes: "Auto-saved during calendar booking.",
        createdDate: new Date().toISOString().split('T')[0],
        businessId: activeBusinessId
      };
      nextClients = [...clients, newClient];
      saveState('glance_clients', nextClients, setClients);
    }

    let nextPackages = [...packages];
    if (newB.linkedPackageId) {
      nextPackages = packages.map(p => {
        if (p.id === newB.linkedPackageId) {
          return {
            ...p,
            sessionsRemaining: Math.max(0, p.sessionsRemaining - 1)
          };
        }
        return p;
      });
      saveState('glance_packages', nextPackages, setPackages);
    }

    const nextBookings = [...bookings, freshBooking];
    saveState('glance_bookings', nextBookings, setBookings);

    const paymentId = `pay-${Date.now()}`;
    const freshPayment: Payment = {
      id: paymentId,
      clientPhone: newB.clientPhone,
      clientName: newB.clientName,
      amount: newB.linkedPackageId ? 0 : newB.price,
      method: 'upi',
      date: newB.dateTime.split('T')[0],
      type: 'booking',
      linkedBookingId: bookingId,
      status: newB.linkedPackageId ? 'paid' : 'due',
      businessId: activeBusinessId
    };
    const nextPayments = [...payments, freshPayment];
    saveState('glance_payments', nextPayments, setPayments);

    sendSyncUpdate(nextPayments, nextBookings, nextClients, nextPackages, {
      clientName: newB.clientName,
      amount: newB.linkedPackageId ? 0 : newB.price,
      method: newB.linkedPackageId ? 'package' : 'upi',
      type: newB.linkedPackageId ? 'booking_created' : 'manual_recorded'
    });

    await handleDatabaseAutoSync({
      clients: nextClients,
      packages: nextPackages,
      bookings: nextBookings,
      payments: nextPayments
    }, 'creating booking');
  };

  // 5. Complete / Cancel Bookings
  const handleUpdateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    const previousBooking = bookings.find(b => b.id === bookingId);
    if (!previousBooking) return;

    const nextBookings = bookings.map(b => b.id === bookingId ? { ...b, status } : b);
    saveState('glance_bookings', nextBookings, setBookings);

    let nextPayments = [...payments];
    let nextPackages = [...packages];

    if (status === 'completed') {
      nextPayments = payments.map(p => {
        if (p.linkedBookingId === bookingId) {
          return { ...p, status: 'paid' as const };
        }
        return p;
      });
      saveState('glance_payments', nextPayments, setPayments);
    }

    if (status === 'cancelled') {
      if (previousBooking.linkedPackageId) {
        nextPackages = packages.map(p => {
          if (p.id === previousBooking.linkedPackageId) {
            return {
              ...p,
              sessionsRemaining: Math.min(p.totalSessions, p.sessionsRemaining + 1)
            };
          }
          return p;
        });
        saveState('glance_packages', nextPackages, setPackages);
      }

      nextPayments = payments.filter(p => p.linkedBookingId !== bookingId);
      saveState('glance_payments', nextPayments, setPayments);
    }

    sendSyncUpdate(nextPayments, nextBookings, clients, nextPackages, {
      clientName: previousBooking.clientName,
      amount: previousBooking.price,
      method: previousBooking.linkedPackageId ? 'package' : 'upi',
      type: status === 'completed' ? 'booking_completed' : status === 'cancelled' ? 'booking_cancelled' : 'booking_status_updated'
    });

    await handleDatabaseAutoSync({
      packages: nextPackages,
      bookings: nextBookings,
      payments: nextPayments
    }, 'updating booking status');
  };

  // 6. Delete Bookings
  const handleDeleteBooking = async (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    const associatedPayments = payments.filter(p => p.linkedBookingId === bookingId);
    const affectedPackages = target.linkedPackageId ? packages.filter(p => p.id === target.linkedPackageId) : [];
    
    setLastDeletedBooking({
      booking: target,
      payments: associatedPayments,
      packages: affectedPackages
    });

    let nextPackages = [...packages];
    if (target.linkedPackageId && target.status !== 'cancelled') {
      nextPackages = packages.map(p => {
        if (p.id === target.linkedPackageId) {
          return {
            ...p,
            sessionsRemaining: Math.min(p.totalSessions, p.sessionsRemaining + 1)
          };
        }
        return p;
      });
      saveState('glance_packages', nextPackages, setPackages);
    }

    const nextBookings = bookings.filter(b => b.id !== bookingId);
    saveState('glance_bookings', nextBookings, setBookings);

    const nextPayments = payments.filter(p => p.linkedBookingId !== bookingId);
    saveState('glance_payments', nextPayments, setPayments);

    sendSyncUpdate(nextPayments, nextBookings, clients, nextPackages, {
      clientName: target.clientName,
      amount: target.price,
      method: 'void',
      type: 'booking_deleted'
    });

    if (user) {
      const client = getSupabase();
      if (client) {
        try {
          await client.from('bookings').delete().eq('id', bookingId).eq('user_id', user.id);
          await client.from('payments').delete().eq('linked_booking_id', bookingId).eq('user_id', user.id);
        } catch (e) {
          console.warn('Direct booking delete warning:', e);
        }
      }

      await handleDatabaseAutoSync({
        packages: nextPackages,
        bookings: nextBookings,
        payments: nextPayments
      }, 'deleting booking');
    }
  };

  // 6.2. Reschedule Bookings (Drag and Drop)
  const handleRescheduleBooking = async (bookingId: string, staffId: string, dateTime: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    const nextBookings = bookings.map(b => b.id === bookingId ? { ...b, staffId, dateTime } : b);
    saveState('glance_bookings', nextBookings, setBookings);

    const nextPayments = payments.map(p => {
      if (p.linkedBookingId === bookingId) {
        return { ...p, date: dateTime.split('T')[0] };
      }
      return p;
    });
    saveState('glance_payments', nextPayments, setPayments);

    sendSyncUpdate(nextPayments, nextBookings, clients, packages, {
      clientName: target.clientName,
      amount: target.price,
      method: target.linkedPackageId ? 'package' : 'upi',
      type: 'booking_rescheduled'
    });

    if (user) {
      const client = getSupabase();
      if (client) {
        try {
          await client.from('bookings').update({ staff_id: staffId, date_time: dateTime }).eq('id', bookingId).eq('user_id', user.id);
          await client.from('payments').update({ date: dateTime.split('T')[0] }).eq('linked_booking_id', bookingId).eq('user_id', user.id);
        } catch (e) {
          console.warn('Direct booking reschedule warning:', e);
        }
      }

      await handleDatabaseAutoSync({
        bookings: nextBookings,
        payments: nextPayments
      }, 'rescheduling booking');
    }
  };

  // 6.5. Undo Booking Deletion
  const handleUndoDelete = async () => {
    if (!lastDeletedBooking) return;
    const { booking, payments: deletedPayments, packages: deletedPackages } = lastDeletedBooking;

    const nextBookings = [...bookings, booking];
    saveState('glance_bookings', nextBookings, setBookings);

    const nextPayments = [...payments, ...deletedPayments];
    saveState('glance_payments', nextPayments, setPayments);

    const nextPackages = packages.map(p => {
      const deletedP = deletedPackages.find(dp => dp.id === p.id);
      return deletedP ? deletedP : p;
    });
    saveState('glance_packages', nextPackages, setPackages);

    setLastDeletedBooking(null);

    sendSyncUpdate(nextPayments, nextBookings, clients, nextPackages, {
      clientName: booking.clientName,
      amount: booking.price,
      method: booking.linkedPackageId ? 'package' : 'upi',
      type: 'booking_restored'
    });

    await handleDatabaseAutoSync({
      packages: nextPackages,
      bookings: nextBookings,
      payments: nextPayments
    }, 'restoring booking');
  };

  // 7. Sell package with upfront payment register
  const handleSellPackage = async (pkg: Omit<Package, 'id' | 'createdDate'>, paymentMethod: 'cash' | 'upi' | 'card') => {
    const pkgId = `pkg-${Date.now()}`;
    const freshPkg: Package = {
      ...pkg,
      id: pkgId,
      createdDate: new Date().toISOString().split('T')[0],
      businessId: activeBusinessId
    };

    let nextClients = [...clients];
    const clientExists = clients.some(c => c.phone === pkg.clientPhone);
    if (!clientExists) {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        name: formClientNameFallback(pkg.clientPhone),
        phone: pkg.clientPhone,
        notes: "Auto-saved during package subscription.",
        createdDate: new Date().toISOString().split('T')[0],
        businessId: activeBusinessId
      };
      nextClients = [...clients, newClient];
      saveState('glance_clients', nextClients, setClients);
    }

    const nextPackages = [...packages, freshPkg];
    saveState('glance_packages', nextPackages, setPackages);

    const paymentId = `pay-${Date.now()}`;
    const freshPayment: Payment = {
      id: paymentId,
      clientPhone: pkg.clientPhone,
      clientName: formClientNameFallback(pkg.clientPhone),
      amount: pkg.price,
      method: paymentMethod,
      date: new Date().toISOString().split('T')[0],
      type: 'package_purchase',
      linkedPackageId: pkgId,
      status: 'paid',
      businessId: activeBusinessId
    };
    const nextPayments = [...payments, freshPayment];
    saveState('glance_payments', nextPayments, setPayments);

    sendSyncUpdate(nextPayments, bookings, nextClients, nextPackages, {
      clientName: formClientNameFallback(pkg.clientPhone),
      amount: pkg.price,
      method: paymentMethod,
      type: 'package_purchase'
    });

    await handleDatabaseAutoSync({
      clients: nextClients,
      packages: nextPackages,
      payments: nextPayments
    }, 'selling package');
  };

  // 8. Settle Dues
  const handleSettleDues = (clientPhone: string, amount: number, method: 'cash' | 'upi' | 'card') => {
    // Find due payments for this client
    let remainingSettleAmount = amount;
    const updatedPayments = payments.map(p => {
      if (p.clientPhone === clientPhone && p.status === 'due' && remainingSettleAmount > 0) {
        if (p.amount <= remainingSettleAmount) {
          remainingSettleAmount -= p.amount;
          return { ...p, status: 'paid' as const, method };
        } else {
          // Partial settlement logic or keep standard due
          p.amount -= remainingSettleAmount;
          remainingSettleAmount = 0;
          return p;
        }
      }
      return p;
    });

    let finalPayments = updatedPayments;
    // Create a standalone settlement logged record if any leftover
    if (amount - remainingSettleAmount > 0) {
      const freshPayment: Payment = {
        id: `pay-${Date.now()}`,
        clientPhone,
        clientName: formClientNameFallback(clientPhone),
        amount: amount - remainingSettleAmount,
        method,
        date: new Date().toISOString().split('T')[0],
        type: 'manual_settlement',
        status: 'paid',
        businessId: activeBusinessId
      };
      finalPayments = [...updatedPayments, freshPayment];
      saveState('glance_payments', finalPayments, setPayments);
    } else {
      saveState('glance_payments', finalPayments, setPayments);
    }

    sendSyncUpdate(finalPayments, bookings, clients, packages, {
      clientName: formClientNameFallback(clientPhone),
      amount: amount,
      method,
      type: 'manual_settlement'
    });
  };

  // 9. Mark Payment directly as Paid
  const handleMarkPaymentAsPaid = (paymentId: string, method?: 'cash' | 'upi' | 'card') => {
    const target = payments.find(p => p.id === paymentId);
    const finalMethod = method || target?.method || 'upi';
    const updated = payments.map(p => p.id === paymentId ? { ...p, status: 'paid' as const, method: finalMethod } : p);
    saveState('glance_payments', updated, setPayments);

    if (target) {
      sendSyncUpdate(updated, bookings, clients, packages, {
        clientName: target.clientName,
        amount: target.amount,
        method: finalMethod,
        type: finalMethod === 'upi' ? 'upi_payment_received' : 'manual_settlement'
      });
    } else {
      sendSyncUpdate(updated, bookings, clients, packages);
    }
  };

  // 10. Manual Custom standalone Payment Log
  const handleAddManualPayment = (payment: Omit<Payment, 'id' | 'date'>) => {
    const freshPayment: Payment = {
      ...payment,
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [...payments, freshPayment];
    saveState('glance_payments', updated, setPayments);

    sendSyncUpdate(updated, bookings, clients, packages, {
      clientName: payment.clientName,
      amount: payment.amount,
      method: payment.method,
      type: 'manual_recorded'
    });
  };

  // Export Storage database
  const handleExportData = () => {
    const database = {
      business,
      staff,
      clients,
      packages,
      bookings,
      payments,
      services
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(database, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `glance_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    const nowStr = new Date().toISOString();
    localStorage.setItem('glance_last_export_date', nowStr);
    setLastExportDate(nowStr);
  };

  // Import Storage database
  const handleImportData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.business && parsed.staff && parsed.clients && parsed.bookings && parsed.payments) {
        localStorage.setItem('glance_business', JSON.stringify(parsed.business));
        localStorage.setItem('glance_staff', JSON.stringify(parsed.staff));
        localStorage.setItem('glance_clients', JSON.stringify(parsed.clients));
        localStorage.setItem('glance_packages', JSON.stringify(parsed.packages || []));
        localStorage.setItem('glance_bookings', JSON.stringify(parsed.bookings));
        localStorage.setItem('glance_payments', JSON.stringify(parsed.payments));
        if (parsed.services) {
          localStorage.setItem('glance_services', JSON.stringify(parsed.services));
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Clear offline & Reset defaults
  const handleResetToDemo = () => {
    localStorage.clear();
  };

  // Helper to pre-open adding sheet from Dashboard quick button
  const [triggerCalendarSheet, setTriggerCalendarSheet] = useState(false);
  const [dashboardSelectedBookingId, setDashboardSelectedBookingId] = useState<string | null>(null);

  // Tabs layout mappings
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            bookings={bookings}
            payments={payments}
            packages={packages}
            staff={staff}
            clients={clients}
            onAddBookingClick={() => {
              setActiveTab('calendar');
              setTriggerCalendarSheet(true);
            }}
            onViewBooking={(b) => {
              setDashboardSelectedBookingId(b.id);
              setActiveTab('calendar');
            }}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onNavigateToTab={(tab) => {
              setActiveTab(tab);
            }}
            wsConnected={wsConnected}
            liveFeed={liveFeed}
            business={business}
          />
        );
      case 'calendar':
        return (
          <CalendarView 
            bookings={bookings}
            staff={staff}
            clients={clients}
            services={services}
            packages={packages}
            onAddBooking={handleAddBooking}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onDeleteBooking={handleDeleteBooking}
            onRescheduleBooking={handleRescheduleBooking}
            business={business}
            payments={payments}
            initialOpenNewBooking={triggerCalendarSheet}
            onInitialOpenNewBookingHandled={() => setTriggerCalendarSheet(false)}
            initialSelectedBookingId={dashboardSelectedBookingId || undefined}
            onInitialSelectedBookingIdHandled={() => setDashboardSelectedBookingId(null)}
          />
        );
      case 'clients':
        return (
          <ClientProfiles 
            clients={clients}
            bookings={bookings}
            packages={packages}
            payments={payments}
            onAddClient={handleAddClient}
            onUpdateClientNotes={handleUpdateClientNotes}
            onUpdateClient={handleUpdateClient}
            onSettleDues={handleSettleDues}
            business={business}
            isSyncing={isSyncing}
          />
        );
      case 'packages':
        return (
          <PackagesTracker 
            packages={packages}
            clients={clients}
            onSellPackage={handleSellPackage}
            business={business}
          />
        );
      case 'payments':
        return (
          <PaymentsLedger 
            payments={payments}
            clients={clients}
            bookings={bookings}
            onMarkAsPaid={handleMarkPaymentAsPaid}
            onAddManualPayment={handleAddManualPayment}
            wsConnected={wsConnected}
            liveFeed={liveFeed}
            business={business}
          />
        );
      case 'settings':
        return (
          <SettingsConfig 
            business={business}
            staff={staff}
            onUpdateBusiness={handleUpdateBusiness}
            onAddStaff={handleAddStaff}
            onDeleteStaff={handleDeleteStaff}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetToDemo={handleResetToDemo}
            lastExportDate={lastExportDate}
            businesses={businesses}
            activeBusinessId={activeBusinessId}
            onSwitchBusiness={handleSwitchBusiness}
            onAddBusiness={handleAddBusiness}
            onDeleteBusiness={handleDeleteBusiness}
            supabaseStatus={supabaseStatus}
            isSyncing={isSyncing}
            onSync={handleSyncWithSupabase}
            syncError={syncError}
            syncSuccess={syncSuccess}
            services={services}
            onAddService={handleAddService}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
          />
        );
      default:
        return null;
    }
  };

  // Calculate overdue payments and today's upcoming appointments
  const todayStrForBadges = new Date().toISOString().split('T')[0];
  const todayUpcomingBookingsCount = bookings.filter(b => b.dateTime.startsWith(todayStrForBadges) && b.status === 'confirmed').length;
  const overduePaymentsCount = payments.filter(p => p.status === 'due').length;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <img 
            src="src/assets/images/booking_setter_logo_1784639936453.jpg" 
            alt="Book App Logo" 
            className="h-20 w-20 rounded-3xl object-cover shadow-xl shadow-indigo-150/10 border border-slate-200/40 animate-pulse"
            referrerPolicy="no-referrer"
          />
          <div className="flex items-center space-y-1 flex-col">
            <p className="text-xs font-black text-slate-800 uppercase tracking-widest font-display">Book App Portal</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verifying Portal Integrity...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isBypassed) {
    return (
      <Login 
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
        }}
        onBypass={() => {
          setIsBypassed(true);
          localStorage.setItem('glance_auth_bypassed', 'true');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col md:flex-row font-sans" id="applet-main-container">
      
      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/50 p-5 shrink-0 justify-between">
        
        <div className="space-y-6">
          {/* Main App Logo Header */}
          <div className="flex items-center gap-3 px-1.5 py-1">
            <img 
              src="src/assets/images/booking_setter_logo_1784639936453.jpg" 
              alt="Book App Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-sm border border-slate-200/40"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="text-xs font-black text-slate-900 tracking-tight block font-display">BOOK APP</span>
              <span className="text-[9px] text-slate-400 font-extrabold tracking-wider uppercase block mt-0.5">Automated Booking</span>
            </div>
          </div>

          {/* Logo & Brand Dropdown Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsBizDropdownOpen(!isBizDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 transition-all cursor-pointer text-left"
              id="sidebar-business-selector-btn"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="min-w-0">
                  <h1 className="text-xs font-black text-slate-900 tracking-tight truncate max-w-[110px] font-display">
                    {business.name}
                  </h1>
                  <span className="text-[8px] text-indigo-600 font-extrabold uppercase tracking-widest block mt-0.5 truncate">
                    {business.type} Portal
                  </span>
                </div>
              </div>
              <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-205 shrink-0 ${isBizDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isBizDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 py-2 px-1.5 space-y-1 animate-fade-in max-h-[300px] overflow-y-auto">
                <div className="px-2 pb-1.5 border-b border-slate-100 mb-1">
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">
                    Switch Business Portal
                  </span>
                </div>
                {businesses.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      handleSwitchBusiness(b.id);
                      setIsBizDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs transition-all text-left cursor-pointer ${
                      b.id === activeBusinessId 
                        ? 'bg-indigo-50/60 text-indigo-900 font-bold border border-indigo-100/30' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold truncate max-w-[150px]">{b.name}</p>
                      <p className="text-[9px] text-slate-400 capitalize font-semibold mt-0.5">
                        {getBusinessEmoji(b.type)} {b.type}
                      </p>
                    </div>
                    {b.id === activeBusinessId && (
                      <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full shrink-0" />
                    )}
                  </button>
                ))}
                <div className="pt-1 border-t border-slate-100 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('settings');
                      setIsBizDropdownOpen(false);
                      setTimeout(() => {
                        document.getElementById('settings-multi-business-manager')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 hover:bg-indigo-50/50 rounded-xl text-[10px] text-indigo-600 font-extrabold transition-all cursor-pointer border border-transparent"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Manage Portals</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Nav Items */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'calendar', label: 'Appointments Calendar', icon: CalendarIcon },
              { id: 'clients', label: 'Client Directory', icon: Users },
              { id: 'packages', label: 'Prepaid Packages', icon: Ticket },
              { id: 'payments', label: 'Payments Ledger', icon: CreditCard },
              { id: 'settings', label: 'Business Settings', icon: SettingsIcon }
            ].map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              const hasCalendarBadge = item.id === 'calendar' && todayUpcomingBookingsCount > 0;
              const hasPaymentsBadge = item.id === 'payments' && overduePaymentsCount > 0;

              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer relative ${
                    isSelected 
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  
                  {/* Overdue/Today indicator Badges */}
                  {hasCalendarBadge && (
                    <span className={`ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all shrink-0 ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                    }`}>
                      {todayUpcomingBookingsCount}
                    </span>
                  )}
                  {hasPaymentsBadge && (
                    <span className={`ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all shrink-0 ${
                      isSelected ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600 border border-rose-100/50'
                    }`}>
                      {overduePaymentsCount}
                    </span>
                  )}

                  {isSelected && !hasCalendarBadge && !hasPaymentsBadge && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Database Sync Center Widget */}
        <div className="bg-gradient-to-br from-indigo-50/60 to-violet-50/50 border border-indigo-100/50 rounded-2xl p-3.5 space-y-2.5 shadow-xs my-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl text-white shrink-0 ${user ? 'bg-indigo-600' : 'bg-amber-500'}`}>
              <Database className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-850">
                Database Sync Center
              </h3>
              <p className="text-[8px] text-slate-450 font-bold truncate">
                {user ? `Connected: ${user.email}` : 'Local Sandboxed memory'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {user ? (
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncWithSupabase}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-extrabold tracking-wide uppercase transition-all shadow-xs cursor-pointer ${
                  syncSuccess
                    ? 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 hover:scale-[1.01]'
                }`}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : syncSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-3.5 w-3.5" />
                    <span>Save to DB</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-extrabold tracking-wide uppercase transition-all shadow-xs hover:scale-[1.01] cursor-pointer"
              >
                <CloudUpload className="h-3.5 w-3.5" />
                <span>Save to DB</span>
              </button>
            )}

            {syncError && (
              <p className="text-[8px] font-bold text-rose-600 leading-tight bg-rose-50/60 p-1.5 rounded-lg border border-rose-100 animate-fade-in text-center">
                ⚠️ {syncError}
              </p>
            )}
            {syncSuccess && (
              <p className="text-[8px] font-bold text-emerald-700 leading-tight bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100 animate-fade-in text-center">
                ✨ Saved all database records!
              </p>
            )}
          </div>
        </div>

        {/* Desktop Footer */}
        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200/40 rounded-2xl">
          {user ? (
            <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-200/40">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-800 truncate" title={user.email}>
                    {user.email}
                  </p>
                  <p className="text-[8px] text-indigo-600 font-extrabold uppercase tracking-wider">
                    Cloud Connected
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-200/40">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-700">
                  <UserIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span>LOCAL DEMO MODE</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('glance_auth_bypassed');
                    setIsBypassed(false);
                    setUser(null);
                  }}
                  className="text-[8px] font-black uppercase text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Connect DB
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 justify-center">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            <span>Fully Offline Secured</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-extrabold justify-center border-t border-slate-200/30 pt-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
            <span className={wsConnected ? 'text-emerald-700 uppercase tracking-widest' : 'text-amber-700 uppercase tracking-widest'}>
              {wsConnected ? 'Live Sync Active' : 'Sync Connecting...'}
            </span>
          </div>
        </div>

      </aside>

      {/* MOBILE HEADER TOP BAR */}
      <header className="md:hidden bg-white border-b border-slate-150 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="relative" ref={mobileDropdownRef}>
          <button
            type="button"
            onClick={() => setIsMobileBizDropdownOpen(!isMobileBizDropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-150 transition-all cursor-pointer text-left"
            id="mobile-business-selector-btn"
          >
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{business.name}</h1>
                <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="text-[9px] text-indigo-600 font-semibold uppercase tracking-wider block capitalize">{business.type} Portal</span>
            </div>
          </button>

          {/* Mobile Dropdown Menu */}
          {isMobileBizDropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 px-1.5 space-y-1 animate-fade-in max-h-[250px] overflow-y-auto">
              <div className="px-2 pb-1 border-b border-slate-100 mb-1">
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest block">
                  Switch Business Portal
                </span>
              </div>
              {businesses.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    handleSwitchBusiness(b.id);
                    setIsMobileBizDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left cursor-pointer ${
                    b.id === activeBusinessId 
                      ? 'bg-indigo-50/60 text-indigo-900 font-bold border border-indigo-100/30' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate max-w-[140px]">{b.name}</p>
                    <p className="text-[9px] text-slate-400 capitalize font-medium">
                      {getBusinessEmoji(b.type)} {b.type}
                    </p>
                  </div>
                  {b.id === activeBusinessId && (
                    <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full" />
                  )}
                </button>
              ))}
              <div className="pt-1 border-t border-slate-100 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setIsMobileBizDropdownOpen(false);
                    setTimeout(() => {
                      document.getElementById('settings-multi-business-manager')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 hover:bg-indigo-50/50 rounded-xl text-[10px] text-indigo-600 font-bold transition-all cursor-pointer border border-transparent"
                >
                  <Plus className="h-3 w-3" />
                  <span>Manage Portals</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Header Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100/30 px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-800">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="truncate max-w-[80px]">{user.email?.split('@')[0]}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer pl-1"
                title="Sign Out"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('glance_auth_bypassed');
                setIsBypassed(false);
                setUser(null);
              }}
              className="px-2 py-1 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-xl text-[9px] font-black text-amber-800 uppercase tracking-wider transition-all cursor-pointer"
            >
              Connect DB
            </button>
          )}

          {/* Quick-save mobile database trigger */}
          <button
            type="button"
            onClick={user ? handleSyncWithSupabase : () => setIsSaveModalOpen(true)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              syncSuccess
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100'
            }`}
            title="Save all data to Database"
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            ) : syncSuccess ? (
              <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
          </button>

          {/* Quick-add floating trigger shortcut */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('calendar');
              setTriggerCalendarSheet(true);
            }}
            className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer border border-indigo-100"
            title="New Appointment"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* PRIMARY CENTRAL STAGE / ROUTE */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            id="viewport-transition-wrapper"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-150 px-3 py-2 flex justify-around items-center z-45 shadow-lg">
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
          { id: 'clients', label: 'Clients', icon: Users },
          { id: 'packages', label: 'Packages', icon: Ticket },
          { id: 'payments', label: 'Ledger', icon: CreditCard },
          { id: 'settings', label: 'Settings', icon: SettingsIcon }
        ].map(item => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          const hasCalendarBadge = item.id === 'calendar' && todayUpcomingBookingsCount > 0;
          const hasPaymentsBadge = item.id === 'payments' && overduePaymentsCount > 0;

          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center space-y-0.5 cursor-pointer"
            >
              <div className={`p-1.5 rounded-xl transition-all relative ${
                isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
              }`}>
                <Icon className="h-4 w-4" />

                {/* Mobile Notification Badges */}
                {hasCalendarBadge && (
                  <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black ring-2 ring-white animate-pulse ${
                    isSelected ? 'bg-pink-500 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    {todayUpcomingBookingsCount}
                  </span>
                )}
                {hasPaymentsBadge && (
                  <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black ring-2 ring-white animate-pulse ${
                    isSelected ? 'bg-amber-500 text-slate-950' : 'bg-rose-600 text-white'
                  }`}>
                    {overduePaymentsCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-bold ${
                isSelected ? 'text-indigo-600 font-extrabold' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Database Save/Sync Modal Dialog */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="database-save-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-md w-full p-6 relative overflow-hidden"
            >
              {/* Background gradient border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-600" />
              
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-500 shrink-0">
                  <AlertTriangle className="h-6 w-6 animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Save to Cloud Database
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    You are currently running in <span className="font-bold text-amber-700 bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100/50">Local Sandbox Mode</span>. 
                    Your bookings, clients, packages, and payments are stored in this browser session only and could be lost if you clear your browser cache.
                  </p>
                </div>

                <div className="w-full space-y-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSaveModalOpen(false);
                      localStorage.removeItem('glance_auth_bypassed');
                      setIsBypassed(false);
                      setUser(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl transition-all hover:scale-[1.01] cursor-pointer shadow-lg shadow-indigo-100"
                  >
                    <CloudUpload className="h-4 w-4" />
                    <span>Connect & Save to Cloud Database</span>
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-black uppercase tracking-wider">or save offline</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportData();
                      setIsSaveModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-slate-500" />
                    <span>Download Offline JSON Backup</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Stay offline, I will save later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING UNDO DELETE TOAST */}
      <AnimatePresence>
        {lastDeletedBooking && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 z-50 flex items-center justify-between gap-3"
            id="floating-undo-toast"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-slate-800 rounded-xl text-rose-400 shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Appointment deleted
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {lastDeletedBooking.booking.clientName} ({lastDeletedBooking.booking.serviceName})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleUndoDelete}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Undo</span>
              </button>
              <button
                onClick={() => setLastDeletedBooking(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatBot />
    </div>
  );
}
