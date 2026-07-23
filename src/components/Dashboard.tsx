import React from 'react';
import { motion } from 'motion/react';
import { Booking, Payment, Package, Staff, Client, Business } from '../types';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  Plus,
  MessageSquare,
  QrCode,
  Cake,
  Sparkles,
  RefreshCw,
  Quote
} from 'lucide-react';

interface DashboardProps {
  bookings: Booking[];
  payments: Payment[];
  packages: Package[];
  staff: Staff[];
  clients: Client[];
  onAddBookingClick: () => void;
  onViewBooking: (booking: Booking) => void;
  onUpdateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  onNavigateToTab: (tab: string) => void;
  wsConnected?: boolean;
  liveFeed?: Array<{
    id: string;
    timestamp: string;
    clientName: string;
    amount: number;
    method: string;
    type: string;
  }>;
  business?: Business;
}

export default function Dashboard({
  bookings,
  payments,
  packages,
  staff,
  clients,
  onAddBookingClick,
  onViewBooking,
  onUpdateBookingStatus,
  onNavigateToTab,
  wsConnected = false,
  liveFeed = [],
  business = { id: "biz-1", name: "Book App", type: "salon", ownerName: "Owner", phone: "9876543210" }
}: DashboardProps) {
  
  // Deduplicate liveFeed items to prevent key conflicts
  const uniqueLiveFeed = liveFeed.reduce((acc, current) => {
    if (!current || !current.id) return acc;
    if (!acc.some(item => item.id === current.id)) {
      acc.push(current);
    }
    return acc;
  }, [] as typeof liveFeed);

  // Get current date bounds for computations
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  
  // Start of this week
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Start of this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Filter today's bookings
  const todaysBookings = bookings.filter(b => {
    return b.dateTime.startsWith(todayStr);
  }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  // Compute Revenue / Collections
  const computeCollections = (sinceDate: Date) => {
    return payments
      .filter(p => new Date(p.date) >= sinceDate && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const weeklyRevenue = computeCollections(startOfWeek);
  const monthlyRevenue = computeCollections(startOfMonth);

  // Today's pending collection or dues
  const totalDues = payments
    .filter(p => p.status === 'due')
    .reduce((sum, p) => sum + p.amount, 0);

  // Expiring/Exhausted packages warning count
  const expiringSoonPackages = packages.filter(pkg => {
    const expDate = new Date(pkg.expiryDate);
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return (pkg.sessionsRemaining <= 1 || (diffDays >= 0 && diffDays <= 7)) && pkg.sessionsRemaining > -1;
  });

  // Find clients with birthdays today or this week (within the next 7 days)
  const getBirthdayStatus = (birthdayStr: string | undefined) => {
    if (!birthdayStr) return null;
    try {
      const birthdayDate = new Date(birthdayStr);
      if (isNaN(birthdayDate.getTime())) return null;

      const today = new Date();
      const tYear = today.getFullYear();
      
      const bMonth = birthdayDate.getMonth(); // 0-11
      const bDate = birthdayDate.getDate();   // 1-31

      // Create a birthday date for the current year
      const bdayThisYear = new Date(tYear, bMonth, bDate);
      const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const bdayTime = bdayThisYear.getTime();

      let diffDays = Math.ceil((bdayTime - todayTime) / (1000 * 60 * 60 * 24));
      
      const isToday = today.getMonth() === bMonth && today.getDate() === bDate;
      
      if (isToday) {
        return { isToday: true, isThisWeek: false, daysAway: 0 };
      } else if (diffDays > 0 && diffDays <= 7) {
        return { isToday: false, isThisWeek: true, daysAway: diffDays };
      }
      
      // Year transition fallback
      const bdayNextYear = new Date(tYear + 1, bMonth, bDate);
      const diffDaysNextYear = Math.ceil((bdayNextYear.getTime() - todayTime) / (1000 * 60 * 60 * 24));
      if (diffDaysNextYear > 0 && diffDaysNextYear <= 7) {
        return { isToday: false, isThisWeek: true, daysAway: diffDaysNextYear };
      }
    } catch {
      return null;
    }
    return null;
  };

  const birthdayClients = clients.map(c => {
    const status = getBirthdayStatus(c.birthday);
    return status ? { client: c, ...status } : null;
  }).filter((x): x is { client: Client; isToday: boolean; isThisWeek: boolean; daysAway: number } => x !== null);

  // Today's booking stats
  const completedToday = todaysBookings.filter(b => b.status === 'completed').length;
  const pendingToday = todaysBookings.filter(b => b.status === 'confirmed').length;

  // Collections by method (UPI, cash, card) this month
  const paymentsThisMonth = payments.filter(p => new Date(p.date) >= startOfMonth && p.status === 'paid');
  const upiTotal = paymentsThisMonth.filter(p => p.method === 'upi').reduce((sum, p) => sum + p.amount, 0);
  const cashTotal = paymentsThisMonth.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const cardTotal = paymentsThisMonth.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0);

  // Format time for human readable view
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  const [aiQuote, setAiQuote] = React.useState<{ quote: string; author: string; generatedBy?: string }>({
    quote: "Focus on delivering excellence today, and today's revenue will naturally flow.",
    author: "Daily Wealth AI",
    generatedBy: "Gemini AI"
  });
  const [isLoadingQuote, setIsLoadingQuote] = React.useState(false);

  const fetchAiQuote = React.useCallback(async () => {
    setIsLoadingQuote(true);
    try {
      const sector = business?.type || 'business';
      const res = await fetch(`/api/ai/quote?sector=${encodeURIComponent(sector)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.quote) {
          setAiQuote({
            quote: data.quote,
            author: data.author || "Daily Wealth AI",
            generatedBy: data.generatedBy || "AI Engine"
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch AI quote:", e);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [business?.type]);

  React.useEffect(() => {
    fetchAiQuote();
  }, [fetchAiQuote]);

  const kpiContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const kpiCardVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <div className="space-y-6 pb-20" id="owner-dashboard-root">
      
      {/* Top Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hello! 👋</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-sm text-slate-700 bg-gradient-to-r from-amber-50/90 via-emerald-50/60 to-amber-50/90 border border-amber-200/80 rounded-xl px-3.5 py-2 max-w-2xl shadow-xs">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-amber-950 italic flex-1">
              "{aiQuote.quote}"
            </p>
            <span className="text-[11px] text-amber-800/90 font-bold whitespace-nowrap">
              — {aiQuote.author}
            </span>
            <button
              onClick={fetchAiQuote}
              disabled={isLoadingQuote}
              title="Generate fresh AI daily earning quote"
              className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-semibold px-2 py-1 bg-amber-100/90 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-2xs shrink-0"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingQuote ? 'animate-spin text-amber-600' : ''}`} />
              <span>Generate Quote</span>
            </button>
          </div>
        </div>
        <button
          id="btn-quick-booking"
          onClick={onAddBookingClick}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer self-start md:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Booking</span>
        </button>
      </div>

      {/* Primary KPI Cards with Staggered Fade-In */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4"
        variants={kpiContainerVariants}
        initial="hidden"
        animate="show"
      >
        
        {/* Collection / Revenue card */}
        <motion.div 
          id="kpi-monthly-collection"
          variants={kpiCardVariants}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="premium-card p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collections (Month)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-display">₹{monthlyRevenue.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-emerald-400"></span>
              ₹{weeklyRevenue.toLocaleString('en-IN')} this week
            </p>
          </div>
        </motion.div>

        {/* Today's Bookings card */}
        <motion.div 
          id="kpi-today-bookings"
          variants={kpiCardVariants}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab('calendar')}
          className="premium-card p-5 flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bookings Today</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-display">{todaysBookings.length} Bookings</h3>
            <p className="text-[10px] text-indigo-600 font-extrabold mt-1 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              {completedToday} done • {pendingToday} left
            </p>
          </div>
        </motion.div>

        {/* Total Clients card */}
        <motion.div 
          id="kpi-total-clients"
          variants={kpiCardVariants}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab('clients')}
          className="premium-card p-5 flex flex-col justify-between cursor-pointer hover:border-purple-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-display">{clients.length} Clients</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-purple-400"></span>
              {clients.length > 0 ? `${clients.length} registered customer${clients.length > 1 ? 's' : ''}` : 'No registered clients'}
            </p>
          </div>
        </motion.div>

        {/* Outstanding Dues card */}
        <motion.div 
          id="kpi-total-dues"
          variants={kpiCardVariants}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab('payments')}
          className="premium-card p-5 flex flex-col justify-between cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Dues</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-extrabold text-rose-600 tracking-tight font-display">₹{totalDues.toLocaleString('en-IN')}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-rose-400"></span>
              Pending payments
            </p>
          </div>
        </motion.div>

        {/* Expiring packages card */}
        <motion.div 
          id="kpi-expiring-packages"
          variants={kpiCardVariants}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab('packages')}
          className={`premium-card p-5 flex flex-col justify-between cursor-pointer transition-colors ${
            expiringSoonPackages.length > 0 
              ? 'bg-amber-50/40 border-amber-200/60 hover:border-amber-300' 
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alerts (Packages)</span>
            <div className={`p-2 rounded-xl ${expiringSoonPackages.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-display">{expiringSoonPackages.length} Alerts</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${expiringSoonPackages.length > 0 ? 'bg-amber-400' : 'bg-slate-300'}`}></span>
              Nearly empty or expired
            </p>
          </div>
        </motion.div>

      </motion.div>

      {/* Package & Payment Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Today's Timeline / Bookings List */}
        <div id="section-todays-timeline" className="md:col-span-2 premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Today's Appointments ({todaysBookings.length})</span>
            </h2>
            <button 
              onClick={() => onNavigateToTab('calendar')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View Full Calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {todaysBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-150">
              <Calendar className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-600">No appointments scheduled for today</p>
              <button 
                onClick={onAddBookingClick}
                className="text-xs text-indigo-600 font-semibold mt-2 hover:underline"
              >
                Book your first client now
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {todaysBookings.map((b) => {
                const assignedStaff = staff.find(s => s.id === b.staffId);
                return (
                  <div 
                    key={b.id}
                    id={`today-booking-card-${b.id}`}
                    className={`p-3 rounded-xl border transition-all ${
                      b.status === 'completed' 
                        ? 'bg-slate-50 border-slate-150 opacity-80' 
                        : b.status === 'cancelled'
                        ? 'bg-red-50/20 border-red-100 opacity-60'
                        : 'bg-white border-slate-100 shadow-xs hover:border-indigo-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 cursor-pointer" onClick={() => onViewBooking(b)}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {formatTime(b.dateTime)}
                          </span>
                          <span className="text-xs text-slate-400">({b.durationMinutes} min)</span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900">{b.clientName}</h4>
                        <p className="text-xs text-slate-600 font-medium">
                          {b.serviceName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {assignedStaff && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-150 text-slate-600 bg-slate-50">
                              Stylist: {assignedStaff.name}
                            </span>
                          )}
                          {b.linkedPackageId && (
                            <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                              Pkg Session
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Immediate Status Actions for One-Handed mobile use */}
                      <div className="flex flex-col items-end justify-between h-full space-y-2">
                        <span className="text-xs font-bold text-slate-900">₹{b.price}</span>
                        
                        {b.status === 'confirmed' ? (
                          <div className="flex items-center gap-1">
                            <button
                              title="Mark Completed"
                              onClick={() => onUpdateBookingStatus(b.id, 'completed')}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100 bg-emerald-50/30 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              title="Cancel Booking"
                              onClick={() => onUpdateBookingStatus(b.id, 'cancelled')}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg border border-red-150 bg-red-50/20 cursor-pointer"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            b.status === 'completed' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : b.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {b.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collections Breakdown & Expiring Packages */}
        <div className="space-y-6">
          
          {/* Real-time Sync Monitor */}
          <div className="premium-card p-6 border-emerald-100 bg-emerald-50/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
            </div>
            
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>Live Payments Monitor</span>
            </h2>

            {uniqueLiveFeed.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">
                <div className="animate-pulse mb-1 text-emerald-600">Sync is connected and online</div>
                Waiting for transaction updates... 💳
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {uniqueLiveFeed.map((feedItem) => {
                  const itemTime = new Date(feedItem.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  let actionLabel = "Updated Ledger";
                  let bgClass = "bg-slate-100 text-slate-700";
                  if (feedItem.type === 'booking_created') {
                    actionLabel = "Prepaid Booking";
                    bgClass = "bg-indigo-50 text-indigo-700 border-indigo-100/50 border";
                  } else if (feedItem.type === 'booking_completed') {
                    actionLabel = "Service Completed";
                    bgClass = "bg-emerald-50 text-emerald-700 border-emerald-100/50 border";
                  } else if (feedItem.type === 'booking_cancelled') {
                    actionLabel = "Booking Cancelled (Refunded)";
                    bgClass = "bg-rose-50 text-rose-700 border-rose-100/50 border";
                  } else if (feedItem.type === 'package_purchase') {
                    actionLabel = "Package Purchase";
                    bgClass = "bg-violet-50 text-violet-700 border-violet-100/50 border";
                  } else if (feedItem.type === 'manual_settlement') {
                    actionLabel = "Dues Settled";
                    bgClass = "bg-emerald-50 text-emerald-700 border-emerald-100/50 border";
                  } else if (feedItem.type === 'manual_recorded') {
                    actionLabel = "Custom Bill Logged";
                    bgClass = "bg-amber-50 text-amber-700 border-amber-100/50 border";
                  } else if (feedItem.type === 'upi_payment_received') {
                    actionLabel = "UPI Payment Received";
                    bgClass = "bg-indigo-500 text-white border-indigo-600 border";
                  }

                  return (
                    <div 
                      key={feedItem.id} 
                      className="p-2.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between gap-3 text-xs transition-all hover:bg-slate-50"
                    >
                      <div className="space-y-0.5 truncate flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-800 truncate">
                            {feedItem.clientName}
                          </span>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${bgClass}`}>
                            {actionLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                          <span>{itemTime}</span>
                          <span>•</span>
                          <span className="uppercase">{feedItem.method}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-900 block text-xs">
                          ₹{feedItem.amount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Monthly Collections Breakdown */}
          <div id="section-revenue-breakdown" className="premium-card p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-slate-400" />
              <span>Collections This Month</span>
            </h2>
            
            <div className="space-y-3">
              {/* UPI */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    UPI / QR Code
                  </span>
                  <span>₹{upiTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full" 
                    style={{ width: `${monthlyRevenue > 0 ? (upiTotal / monthlyRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Cash */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Cash
                  </span>
                  <span>₹{cashTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${monthlyRevenue > 0 ? (cashTotal / monthlyRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Card */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    Card Terminal
                  </span>
                  <span>₹{cardTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full" 
                    style={{ width: `${monthlyRevenue > 0 ? (cardTotal / monthlyRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-semibold text-slate-900">
                <span>Total Collected</span>
                <span>₹{monthlyRevenue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Action Alerts: Birthdays */}
          <div id="section-birthday-alerts" className="premium-card p-6 border-indigo-100 bg-indigo-50/10">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Cake className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
              <span>Celebrations This Week</span>
            </h2>

            {birthdayClients.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">
                No client birthdays today or this week. 🎂
              </div>
            ) : (
              <div className="space-y-2.5">
                {birthdayClients.map(({ client, isToday, daysAway }) => {
                  const bdayText = isToday 
                    ? `Happy Birthday, ${client.name}! 🎂 Sending you warmest wishes from ${business.name}! Enjoy a complimentary 10% discount on any service today!` 
                    : `Hi ${client.name}, wishing you a happy early birthday in ${daysAway} days! 🎈 Book your slot ahead at ${business.name} to celebrate!`;
                  
                  let cleanPhone = client.phone.replace(/\D/g, '');
                  if (cleanPhone.length === 10) {
                    cleanPhone = '91' + cleanPhone;
                  }
                  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(bdayText)}`;

                  return (
                    <div 
                      key={client.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                        isToday 
                          ? 'bg-gradient-to-br from-pink-50/40 to-indigo-50/40 border-pink-100/60 shadow-sm' 
                          : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isToday ? 'bg-pink-100 text-pink-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            <Cake className="h-4 w-4" />
                          </div>
                          <div className="truncate max-w-[130px]">
                            <span className="text-xs font-extrabold text-slate-850 block truncate">
                              {client.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold block truncate">
                              +91 {client.phone}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          isToday 
                            ? 'bg-pink-100 text-pink-700 animate-pulse' 
                            : 'bg-indigo-100/80 text-indigo-700'
                        }`}>
                          {isToday ? '🎉 Today!' : `in ${daysAway} d`}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/60">
                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                          {client.birthday ? new Date(client.birthday).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                        <a 
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{isToday ? 'Wish Client' : 'Book Gift Slot'}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Alerts: Expiring Packages */}
          <div id="section-action-alerts" className="premium-card p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Package Reminders</span>
            </h2>

            {expiringSoonPackages.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                All client packages are in good shape! 👍
              </div>
            ) : (
              <div className="space-y-2.5">
                {expiringSoonPackages.slice(0, 3).map(pkg => {
                  const client = clients.find(c => c.phone === pkg.clientPhone);
                  const isExhausted = pkg.sessionsRemaining === 0;
                  
                  // Compute WhatsApp text
                  const waText = `Hi ${client ? client.name : 'Client'}, your package "${pkg.name}" is ${isExhausted ? 'exhausted' : `almost done (${pkg.sessionsRemaining} left)`}. Let us know when you would like to renew! - ${business.name}`;
                  
                  let cleanPhone = pkg.clientPhone.replace(/\D/g, '');
                  if (cleanPhone.length === 10) {
                    cleanPhone = '91' + cleanPhone;
                  }
                  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

                  return (
                    <div 
                      key={pkg.id}
                      className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/20 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block truncate max-w-[150px]">
                            {client ? client.name : pkg.clientPhone}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                            {pkg.name}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isExhausted ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isExhausted ? 'Exhausted' : `${pkg.sessionsRemaining} Left`}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-amber-100/50">
                        <span className="text-[10px] text-slate-400">
                          Exp: {new Date(pkg.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        <a 
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-1 rounded-lg"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>WhatsApp Nudge</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
                {expiringSoonPackages.length > 3 && (
                  <button 
                    onClick={() => onNavigateToTab('packages')}
                    className="text-xs text-indigo-600 font-semibold w-full text-center hover:underline pt-1"
                  >
                    View remaining {expiringSoonPackages.length - 3} alerts
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
