import React, { useState, useEffect } from 'react';
import { Booking, Staff, Client, Service, Package, Business, Payment } from '../types';
import { detectConflict } from '../utils/conflictDetector';
import PhoneInput from './PhoneInput';
import { formatCurrency, formatDisplayPhone, buildWhatsAppLink, calculateUaeVat } from '../utils/countryUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  User,
  Clock,
  Tag,
  Trash2,
  CheckCircle,
  MessageSquare,
  XCircle,
  Printer,
  Bell
} from 'lucide-react';

interface CalendarViewProps {
  bookings: Booking[];
  staff: Staff[];
  clients: Client[];
  services: Service[];
  packages: Package[];
  onAddBooking: (booking: Omit<Booking, 'id'>) => void;
  onUpdateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  onDeleteBooking: (bookingId: string) => void;
  onRescheduleBooking?: (bookingId: string, staffId: string, dateTime: string) => void;
  business?: Business;
  payments?: Payment[];
  initialOpenNewBooking?: boolean;
  onInitialOpenNewBookingHandled?: () => void;
  initialSelectedBookingId?: string;
  onInitialSelectedBookingIdHandled?: () => void;
}

export default function CalendarView({
  bookings,
  staff,
  clients,
  services,
  packages,
  onAddBooking,
  onUpdateBookingStatus,
  onDeleteBooking,
  onRescheduleBooking,
  business = { id: "biz-1", name: "Book App", type: "salon" as const, ownerName: "Owner", phone: "9876543210" },
  payments = [],
  initialOpenNewBooking = false,
  onInitialOpenNewBookingHandled,
  initialSelectedBookingId,
  onInitialSelectedBookingIdHandled
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');

  // Custom states for Month View and Formal Receipts
  const [viewType, setViewType] = useState<'timeline' | 'month'>('timeline');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [receiptStyle, setReceiptStyle] = useState<'formal' | 'thermal'>('formal');

  // Dialog states
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);
  const [isTomorrowPanelOpen, setIsTomorrowPanelOpen] = useState(true);

  // New booking form states
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientCountryCode, setFormClientCountryCode] = useState(business?.phoneCountryCode || '+971');
  const [formClientName, setFormClientName] = useState('');
  const [formStaffId, setFormStaffId] = useState(staff[0]?.id || '');
  const [formServiceName, setFormServiceName] = useState(services[0]?.name || '');
  const [formTime, setFormTime] = useState('10:00');
  const [formDuration, setFormDuration] = useState(30);
  const [formNotes, setFormNotes] = useState('');
  const [formUsePackageId, setFormUsePackageId] = useState('');

  // Conflict warning state for live checking
  const [liveConflictMessage, setLiveConflictMessage] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Custom conflict warning overlay dialog state
  const [conflictOverlay, setConflictOverlay] = useState<{
    message: string;
    onProceed: () => void;
  } | null>(null);

  // Handle initial trigger state from external navigation (e.g. Dashboard)
  useEffect(() => {
    if (initialOpenNewBooking) {
      setIsNewBookingOpen(true);
      if (onInitialOpenNewBookingHandled) {
        onInitialOpenNewBookingHandled();
      }
    }
  }, [initialOpenNewBooking]);

  useEffect(() => {
    if (initialSelectedBookingId) {
      const b = bookings.find(booking => booking.id === initialSelectedBookingId);
      if (b) {
        setSelectedBooking(b);
        const bDate = b.dateTime.split('T')[0];
        setSelectedDate(bDate);
      }
      if (onInitialSelectedBookingIdHandled) {
        onInitialSelectedBookingIdHandled();
      }
    }
  }, [initialSelectedBookingId, bookings]);

  // Synchronous/Automated conflict checks inside New Booking Modal
  useEffect(() => {
    if (isNewBookingOpen && formStaffId && formTime && formDuration > 0) {
      const combinedDateTime = `${selectedDate}T${formTime}`;
      const res = detectConflict(
        {
          clientPhone: formClientPhone,
          staffId: formStaffId,
          dateTime: combinedDateTime,
          durationMinutes: formDuration
        },
        bookings,
        selectedBooking?.id
      );
      if (res.hasConflict) {
        setLiveConflictMessage(res.message);
      } else {
        setLiveConflictMessage('');
      }
    } else {
      setLiveConflictMessage('');
    }
  }, [formClientPhone, formStaffId, formTime, formDuration, selectedDate, isNewBookingOpen, bookings, selectedBooking]);

  // Dynamic toast alerts when conflict state newly changes
  const [lastConflictMsg, setLastConflictMsg] = useState('');
  useEffect(() => {
    if (liveConflictMessage && liveConflictMessage !== lastConflictMsg) {
      showToast('Stylist schedule conflict detected!', 'warning');
      setLastConflictMsg(liveConflictMessage);
    } else if (!liveConflictMessage) {
      setLastConflictMsg('');
    }
  }, [liveConflictMessage]);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  // Drag and drop states
  const [draggingBookingId, setDraggingBookingId] = useState<string | null>(null);
  const [activeDragSlot, setActiveDragSlot] = useState<{ staffId: string; hour: number } | null>(null);

  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    e.dataTransfer.setData('text/plain', booking.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingBookingId(booking.id);
  };

  const handleDragEnd = () => {
    setDraggingBookingId(null);
    setActiveDragSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, staffId: string, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!activeDragSlot || activeDragSlot.staffId !== staffId || activeDragSlot.hour !== hour) {
      setActiveDragSlot({ staffId, hour });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDragSlot(null);
  };

  const handleDrop = (e: React.DragEvent, targetStaffId: string, hour: number) => {
    e.preventDefault();
    setActiveDragSlot(null);
    setDraggingBookingId(null);

    const bookingId = e.dataTransfer.getData('text/plain');
    if (!bookingId) return;

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const formattedHour = hour.toString().padStart(2, '0');
    const originalMinutes = booking.dateTime.split('T')[1]?.split(':')[1] || '00';
    const newDateTime = `${selectedDate}T${formattedHour}:${originalMinutes}`;

    if (booking.staffId === targetStaffId && booking.dateTime === newDateTime) return;

    const conflictRes = detectConflict(
      {
        clientPhone: booking.clientPhone,
        staffId: targetStaffId,
        dateTime: newDateTime,
        durationMinutes: booking.durationMinutes
      },
      bookings,
      booking.id
    );

    const proceedWithReschedule = () => {
      if (onRescheduleBooking) {
        onRescheduleBooking(booking.id, targetStaffId, newDateTime);
        showToast('Appointment successfully rescheduled!');
      }
      setConflictOverlay(null);
    };

    if (conflictRes.hasConflict) {
      showToast('Schedule conflict detected for this slot!', 'warning');
      setConflictOverlay({
        message: conflictRes.message,
        onProceed: proceedWithReschedule
      });
    } else {
      proceedWithReschedule();
    }
  };

  const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 AM to 9:00 PM

  const handleWhatsAppShare = () => {
    if (!receiptBooking) return;

    const receiptNo = `REC-${receiptBooking.id.toUpperCase().split('-')[1] || receiptBooking.id.toUpperCase()}`;
    const dateStr = new Date(receiptBooking.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = new Date(receiptBooking.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const stylistName = staff.find(s => s.id === receiptBooking.staffId)?.name || 'Store Stylist';
    const matchedPay = payments.find(p => p.linkedBookingId === receiptBooking.id);
    const paymentMethod = matchedPay?.method?.toUpperCase() || 'CARD';
    const totalCharged = receiptBooking.linkedPackageId ? '0.00 (Prepaid via Package)' : formatCurrency(receiptBooking.price, business.currency || 'AED');

    const text = `*RECEIPT FROM ${business.name.toUpperCase()}* 🧾\n\n` +
      `*Receipt No:* ${receiptNo}\n` +
      `*Date:* ${dateStr} at ${timeStr}\n` +
      `*Client:* ${receiptBooking.clientName}\n` +
      `*Stylist:* ${stylistName}\n` +
      `---------------------------\n` +
      `*Service:* ${receiptBooking.serviceName}\n` +
      `*Duration:* ${receiptBooking.durationMinutes} mins\n` +
      `*Amount Paid:* ${totalCharged}\n` +
      `*Payment Status:* PAID & SETTLED (${paymentMethod})\n` +
      `---------------------------\n` +
      `Thank you for visiting ${business.name}! Please visit us again. ✨`;

    const url = buildWhatsAppLink(receiptBooking.clientPhone, text, business.phoneCountryCode || '971');
    window.open(url, '_blank');
  };

  const getFormattedDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  };

  const shiftDate = (amount: number) => {
    if (viewType === 'month') {
      let newMonth = currentMonth + amount;
      let newYear = currentYear;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);

      const today = new Date();
      if (today.getMonth() === newMonth && today.getFullYear() === newYear) {
        setSelectedDate(today.toISOString().split('T')[0]);
      } else {
        const firstDay = `${newYear}-${(newMonth + 1).toString().padStart(2, '0')}-01`;
        setSelectedDate(firstDay);
      }
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + amount);
      const nextDateStr = d.toISOString().split('T')[0];
      setSelectedDate(nextDateStr);

      const nextDate = new Date(nextDateStr);
      setCurrentMonth(nextDate.getMonth());
      setCurrentYear(nextDate.getFullYear());
    }
  };

  const handleClientPhoneChange = (phoneInput: string) => {
    setFormClientPhone(phoneInput);
    const matchedClient = clients.find(c => c.phone === phoneInput);
    if (matchedClient) {
      setFormClientName(matchedClient.name);
      const clientPkgs = packages.filter(p => p.clientPhone === phoneInput && p.sessionsRemaining > 0);
      if (clientPkgs.length > 0) {
        setFormUsePackageId(clientPkgs[0].id);
      } else {
        setFormUsePackageId('');
      }
    } else {
      setFormUsePackageId('');
    }
  };

  const handleServiceChange = (sName: string) => {
    setFormServiceName(sName);
    const service = services.find(s => s.name === sName);
    if (service) {
      setFormDuration(service.durationMinutes);
    }
  };

  const openCreateDialog = (staffId?: string, hour?: number) => {
    setSelectedBooking(null);
    setFormClientPhone('');
    setFormClientName('');
    if (staffId) setFormStaffId(staffId);

    const defaultService = services[0];
    if (defaultService) {
      setFormServiceName(defaultService.name);
      setFormDuration(defaultService.durationMinutes);
    }

    if (hour !== undefined) {
      const formattedHour = hour.toString().padStart(2, '0');
      setFormTime(`${formattedHour}:00`);
    } else {
      setFormTime('10:00');
    }
    setFormNotes('');
    setFormUsePackageId('');
    setLiveConflictMessage('');
    setIsNewBookingOpen(true);
  };

  const handleSaveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientPhone || !formClientName || !formStaffId || !formServiceName || !formTime) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    const bookingDateTime = `${selectedDate}T${formTime}`;

    const conflictRes = detectConflict(
      {
        clientPhone: formClientPhone,
        staffId: formStaffId,
        dateTime: bookingDateTime,
        durationMinutes: formDuration
      },
      bookings
    );

    const proceedWithSave = () => {
      const servicePrice = services.find(s => s.name === formServiceName)?.price || 0;

      onAddBooking({
        clientPhone: formClientPhone,
        clientName: formClientName,
        staffId: formStaffId,
        serviceName: formServiceName,
        dateTime: bookingDateTime,
        durationMinutes: formDuration,
        status: 'confirmed',
        notes: formNotes,
        linkedPackageId: formUsePackageId || undefined,
        price: formUsePackageId ? 0 : servicePrice
      });

      setIsNewBookingOpen(false);
      setConflictOverlay(null);
      showToast('Appointment booked successfully!', 'success');
    };

    if (conflictRes.hasConflict) {
      showToast('Schedule conflict detected for this stylist!', 'warning');
      setConflictOverlay({
        message: conflictRes.message,
        onProceed: proceedWithSave
      });
      return;
    }

    proceedWithSave();
  };

  const generateWhatsAppReceipt = (b: Booking) => {
    const formattedDate = new Date(b.dateTime).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const formattedTime = new Date(b.dateTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const receiptText = `*Booking Confirmed at ${business.name}* 🌟\n\n` +
      `👤 *Client:* ${b.clientName}\n` +
      `📅 *Date:* ${formattedDate}\n` +
      `⏰ *Time:* ${formattedTime}\n` +
      `💇 *Service:* ${b.serviceName}\n` +
      `⌛ *Duration:* ${b.durationMinutes} mins\n` +
      `💵 *Amount:* ${b.linkedPackageId ? 'Prepaid (Package Session)' : formatCurrency(b.price, business.currency || 'AED')}\n\n` +
      `Thank you for booking with us! See you soon.`;

    return buildWhatsAppLink(b.clientPhone, receiptText, business.phoneCountryCode || '971');
  };

  const handleSendReminder = (b: Booking) => {
    const bookingDate = new Date(b.dateTime);
    const dateStr = bookingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = bookingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const stylistName = staff.find(s => s.id === b.staffId)?.name || 'Store Stylist';

    const today = new Date();
    const isToday = bookingDate.toDateString() === today.toDateString();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = bookingDate.toDateString() === tomorrow.toDateString();

    let dayLabel = '';
    let bodyRel = 'upcoming booking';
    if (isToday) {
      dayLabel = ' (Today)';
      bodyRel = 'booking today';
    } else if (isTomorrow) {
      dayLabel = ' (Tomorrow)';
      bodyRel = 'booking tomorrow';
    } else {
      dayLabel = '';
      bodyRel = `booking on ${dateStr}`;
    }

    const text = `*APPOINTMENT REMINDER - ${business.name.toUpperCase()}* 🔔\n\n` +
      `Dear *${b.clientName}*,\n` +
      `This is a friendly reminder of your upcoming ${bodyRel}:\n\n` +
      `📅 *Date:* ${dateStr}${dayLabel}\n` +
      `⏰ *Time:* ${timeStr}\n` +
      `💇 *Service:* ${b.serviceName}\n` +
      `⌛ *Duration:* ${b.durationMinutes} mins\n` +
      `👤 *Assigned Stylist:* ${stylistName}\n` +
      `💵 *Amount:* ${b.linkedPackageId ? 'Prepaid (Package Session)' : formatCurrency(b.price, business.currency || 'AED')}\n\n` +
      `Please let us know if you need to reschedule or have any special requests. We look forward to welcoming you! ✨`;

    const url = buildWhatsAppLink(b.clientPhone, text, business.phoneCountryCode || '971');
    window.open(url, '_blank');
  };

  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  })();

  const tomorrowBookings = bookings.filter(b =>
    b.dateTime.startsWith(tomorrowStr) &&
    b.status !== 'cancelled'
  );

  const visibleStaff = selectedStaffFilter === 'all'
    ? staff
    : staff.filter(s => s.id === selectedStaffFilter);

  return (
    <div className="space-y-4 pb-20" id="calendar-view-root">

      {/* Calendar Header with Navigation */}
      <div className="premium-card p-6 space-y-4">

        {/* Row 1: View switcher & Quick Jump */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-72">
            <button
              onClick={() => setViewType('timeline')}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewType === 'timeline'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              🗓️ Day Timeline
            </button>
            <button
              onClick={() => setViewType('month')}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewType === 'month'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              📅 Month Calendar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                handleDateChange(todayStr);
              }}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Today
            </button>

            <button
              onClick={() => openCreateDialog()}
              className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Booking</span>
            </button>
          </div>
        </div>

        {/* Row 2: Date toggle and quick select */}
        <div className="flex justify-center items-center w-full gap-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <h2 className="text-sm font-bold text-slate-800 min-w-[155px] text-center font-display">
              {viewType === 'month'
                ? `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentMonth]} ${currentYear}`
                : getFormattedDateLabel(selectedDate)
              }
            </h2>
            <button
              onClick={() => shiftDate(1)}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="p-1 border border-slate-200 rounded-lg text-xs cursor-pointer focus:outline-indigo-500 font-medium text-slate-700"
            />
          </div>
        </div>

        {/* Row 3: Staff filter bubble bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">Staff:</span>
          <button
            onClick={() => setSelectedStaffFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 cursor-pointer ${selectedStaffFilter === 'all'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
              : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'
              }`}
          >
            All Staff
          </button>
          {staff.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStaffFilter(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 cursor-pointer ${selectedStaffFilter === s.id
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'
                }`}
            >
              {s.name}
            </button>
          ))}
        </div>

      </div>

      {/* Tomorrow's Reminders Panel */}
      {tomorrowBookings.length > 0 && (
        <div className="premium-card p-5 bg-gradient-to-r from-emerald-50/40 to-teal-50/20 border border-emerald-100 rounded-3xl space-y-3" id="calendar-tomorrow-reminders-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs shrink-0">
                <Bell className="h-4 w-4 animate-bounce" />
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-800 font-display flex items-center gap-1.5 leading-none">
                  <span>Tomorrow's Appointment Reminders</span>
                  <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black font-sans leading-none">
                    {tomorrowBookings.length} Active
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1">
                  Click 'Send Reminder' to instantly open pre-filled WhatsApp reminders for tomorrow ({new Date(tomorrowStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTomorrowPanelOpen(!isTomorrowPanelOpen)}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/60 px-3 py-1.5 rounded-xl border border-slate-200/40 bg-white transition-all cursor-pointer shadow-xs shrink-0"
            >
              {isTomorrowPanelOpen ? "Hide Details" : "Show Details"}
            </button>
          </div>

          {isTomorrowPanelOpen && (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent pb-2">
              <div className="flex gap-3 pt-1 animate-fade-in min-w-max">
                {tomorrowBookings.map((b) => {
                  const bookingTime = new Date(b.dateTime);
                  const timeStr = bookingTime.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });

                  const staffName =
                    staff.find((s) => s.id === b.staffId)?.name || "Stylist";

                  return (
                    <div
                      key={b.id}
                      className="w-[280px] shrink-0 p-3.5 bg-white border border-slate-200/50 rounded-2xl flex flex-col justify-between space-y-3 hover:border-emerald-200 hover:shadow-xs transition-all duration-200"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-black text-slate-800 font-display truncate max-w-[120px]">
                            {b.clientName}
                          </span>

                          <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            <span>{timeStr}</span>
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 font-bold leading-tight">
                          ✂️ {b.serviceName}
                        </div>

                        <div className="text-[9px] text-indigo-500 font-extrabold uppercase tracking-wide">
                          👤 Stylist: {staffName}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendReminder(b)}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold py-2 rounded-xl cursor-pointer transition-all shadow-xs hover:scale-101 active:scale-98"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Send Reminder</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Staff Columns / Month Calendar View */}
      {viewType === 'timeline' ? (
        <div className="premium-card p-0 bg-white border border-slate-200/45 overflow-hidden">
          {/* ONE horizontal scroll container that wraps both Staff names (header) and Time slots & bookings (body) */}
          <div className="overflow-x-auto scrollbar-thin">
            <div
              className="min-w-max"
              style={{
                width: `${64 + visibleStaff.length * 180}px`,
              }}
            >
              {/* Header row (Staff names) */}
              <div
                className="grid border-b border-slate-100 bg-slate-50/90 sticky top-0 z-20 shadow-xs"
                style={{
                  gridTemplateColumns: `64px repeat(${visibleStaff.length}, 180px)`,
                }}
              >
                {/* Time Header */}
                <div className="p-3.5 flex items-center justify-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-r border-slate-100 bg-slate-50">
                  Time
                </div>

                {/* Staff Headers */}
                {visibleStaff.map((s, idx) => {
                  const initials = s.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={s.id}
                      className={`p-3 flex flex-col items-center justify-center bg-slate-50 ${idx < visibleStaff.length - 1
                        ? "border-r border-slate-100"
                        : ""
                        }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 mb-1">
                        {initials}
                      </div>

                      <div className="text-xs font-bold text-slate-800 text-center whitespace-nowrap">
                        {s.name}
                      </div>

                      <div className="text-[9px] font-bold text-indigo-600 uppercase mt-0.5">
                        {s.role}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable time matrix body */}
              <div className="max-h-[550px] overflow-y-auto scrollbar-thin">
                <div
                  className="grid relative"
                  style={{
                    gridTemplateColumns: `64px repeat(${visibleStaff.length}, 180px)`,
                  }}
                >
                  {/* Vertical Time markers column */}
                  <div className="border-r border-slate-100 bg-slate-50/20 select-none">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="h-16 border-b border-slate-100/65 p-2 flex flex-col items-center justify-center text-center text-[9px] font-extrabold uppercase tracking-widest text-slate-400/90 font-mono"
                      >
                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                      </div>
                    ))}
                  </div>

                  {/* Main Interactive Staff columns */}
                  {visibleStaff.map((s, colIdx) => {
                    const staffBookings = bookings.filter(
                      (b) =>
                        b.staffId === s.id &&
                        b.dateTime.startsWith(selectedDate) &&
                        b.status !== 'cancelled'
                    );

                    return (
                      <div
                        key={s.id}
                        className={`relative h-full min-h-[896px] ${colIdx < visibleStaff.length - 1
                          ? 'border-r border-slate-100'
                          : ''
                          }`}
                      >
                        {/* Background hour grid slot helpers (Click to Add) */}
                        {HOURS.map((hour) => {
                          const isDragOver =
                            activeDragSlot?.staffId === s.id && activeDragSlot?.hour === hour;
                          return (
                            <div
                              key={hour}
                              onClick={() => openCreateDialog(s.id, hour)}
                              onDragOver={(e) => handleDragOver(e, s.id, hour)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, s.id, hour)}
                              className={`h-16 border-b border-slate-100 cursor-pointer transition-all relative group ${isDragOver
                                ? 'bg-indigo-100/40 border-y-indigo-300'
                                : 'hover:bg-indigo-50/10'
                                }`}
                            >
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-indigo-50/20">
                                <Plus className="h-4 w-4 text-indigo-500" />
                              </div>
                            </div>
                          );
                        })}

                        {/* Absolutely positioned Booking Block overlays */}
                        {staffBookings.map((b) => {
                          const bookingTime = new Date(b.dateTime);
                          const bookingHour = bookingTime.getHours();
                          const bookingMinute = bookingTime.getMinutes();

                          if (bookingHour < 8 || bookingHour >= 22) return null;

                          const startMinutesOffset = (bookingHour - 8) * 60 + bookingMinute;
                          const topPx = (startMinutesOffset / 60) * 64;
                          const heightPx = (b.durationMinutes / 60) * 64;

                          const isCurrentlyDraggingThis = draggingBookingId === b.id;

                          return (
                            <div
                              key={b.id}
                              id={`booking-grid-item-${b.id}`}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, b)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(b);
                              }}
                              className={`absolute left-1 right-1 p-2 rounded-xl border-l-3 text-left cursor-grab select-none overflow-hidden transition-all shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:cursor-grabbing ${isCurrentlyDraggingThis ? 'opacity-40 scale-95 ring-2 ring-indigo-500' : ''
                                } ${b.status === 'completed'
                                  ? 'bg-emerald-50/80 border-y-emerald-100 border-r-emerald-100 border-l-emerald-500 text-emerald-950 opacity-95'
                                  : b.status === 'no-show'
                                    ? 'bg-stone-100 border-y-stone-200 border-r-stone-200 border-l-stone-400 text-stone-500 line-through opacity-80'
                                    : 'bg-white border-y-indigo-100/80 border-r-indigo-100/80 border-l-indigo-600 text-slate-900 shadow-indigo-100/5'
                                }`}
                              style={{
                                top: `${topPx + 2}px`,
                                height: `${heightPx - 4}px`,
                                minHeight: '38px',
                                zIndex: 10,
                              }}
                            >
                              <div className="text-[9px] font-extrabold tracking-wider uppercase opacity-80 flex items-center justify-between">
                                <span>
                                  {bookingTime.toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </span>
                                <div className="flex items-center gap-1">
                                  {b.dateTime.startsWith(tomorrowStr) && (
                                    <span className="bg-emerald-500 text-white text-[7px] px-1 py-0.5 rounded-sm font-black animate-pulse uppercase tracking-normal">
                                      REMINDER
                                    </span>
                                  )}
                                  {b.linkedPackageId && (
                                    <span className="bg-indigo-100 text-indigo-700 text-[8px] px-1 rounded-md font-extrabold uppercase">
                                      PKG
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs font-bold text-slate-800 truncate leading-snug mt-0.5 font-display">
                                {b.clientName}
                              </div>
                              <div className="text-[10px] font-semibold text-slate-500 truncate leading-none mt-0.5">
                                {b.serviceName}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MONTH CALENDAR VIEW GRID */
        <div className="premium-card p-6 bg-white border border-slate-200/45 shadow-sm space-y-4">
          {/* Calendar Day Headers */}
          <div className="grid grid-cols-7 gap-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <div key={dayName} className="text-xs font-bold text-slate-400 py-2.5 bg-slate-50 border border-slate-100 uppercase tracking-wider rounded-xl font-sans">
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Cells Grid */}
          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
              const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

              const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
              const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

              const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
              const prevYearIdx = currentMonth === 0 ? currentYear - 1 : currentYear;
              const daysInPrevMonth = getDaysInMonth(prevYearIdx, prevMonthIdx);

              const prevMonthDays = Array.from(
                { length: firstDayIndex },
                (_, i) => daysInPrevMonth - firstDayIndex + i + 1
              );

              const currentMonthDays = Array.from(
                { length: daysInCurrentMonth },
                (_, i) => i + 1
              );

              const totalCells = 42;
              const nextMonthDaysCount = totalCells - (prevMonthDays.length + currentMonthDays.length);
              const nextMonthDays = Array.from(
                { length: nextMonthDaysCount },
                (_, i) => i + 1
              );

              const allDaysCells: Array<{ dayNum: number; type: 'prev' | 'current' | 'next'; dateStr: string }> = [];

              prevMonthDays.forEach(day => {
                const dayStr = `${prevYearIdx}-${(prevMonthIdx + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                allDaysCells.push({ dayNum: day, type: 'prev', dateStr: dayStr });
              });

              currentMonthDays.forEach(day => {
                const dayStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                allDaysCells.push({ dayNum: day, type: 'current', dateStr: dayStr });
              });

              nextMonthDays.forEach(day => {
                const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
                const nextYearIdx = currentMonth === 11 ? currentYear + 1 : currentYear;
                const dayStr = `${nextYearIdx}-${(nextMonthIdx + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                allDaysCells.push({ dayNum: day, type: 'next', dateStr: dayStr });
              });

              const todayStr = new Date().toISOString().split('T')[0];

              return allDaysCells.map((cell, idx) => {
                const cellBookings = bookings.filter(b => {
                  const isSameDay = b.dateTime.startsWith(cell.dateStr);
                  const isStaffMatched = selectedStaffFilter === 'all' || b.staffId === selectedStaffFilter;
                  return isSameDay && isStaffMatched && b.status !== 'cancelled';
                });

                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDate;

                return (
                  <div
                    key={`${cell.type}-${cell.dayNum}-${idx}`}
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                    }}
                    onDoubleClick={() => {
                      setSelectedDate(cell.dateStr);
                      openCreateDialog(undefined, 10);
                    }}
                    className={`min-h-[110px] p-2.5 rounded-2xl border transition-all relative flex flex-col justify-between group cursor-pointer ${cell.type === 'current'
                      ? 'bg-white border-slate-200/50 hover:border-indigo-300 hover:shadow-xs'
                      : 'bg-slate-50/40 border-slate-100/50 opacity-40 hover:opacity-75'
                      } ${isSelected
                        ? 'ring-2 ring-indigo-600 border-transparent bg-indigo-50/5'
                        : ''
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-extrabold flex items-center justify-center h-5 w-5 rounded-full ${isToday
                        ? 'bg-indigo-600 text-white font-black shadow-sm shadow-indigo-100'
                        : cell.type === 'current'
                          ? 'text-slate-800'
                          : 'text-slate-400'
                        }`}>
                        {cell.dayNum}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(cell.dateStr);
                          openCreateDialog(undefined, 10);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all cursor-pointer text-[10px]"
                        title="Book Appointment"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[70px] scrollbar-none flex-1 mt-1">
                      {cellBookings.slice(0, 2).map((b) => {
                        const bookingTime = new Date(b.dateTime);
                        const hour = bookingTime.getHours();
                        const min = bookingTime.getMinutes().toString().padStart(2, '0');
                        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                        const timeStr = `${displayHour}:${min}`;

                        let statusColor = "bg-indigo-50/60 text-indigo-800 border-indigo-100/60";
                        if (b.status === 'completed') {
                          statusColor = "bg-emerald-50/60 text-emerald-800 border-emerald-100/60";
                        } else if (b.status === 'no-show') {
                          statusColor = "bg-stone-50 text-stone-500 border-stone-200/50 line-through";
                        }

                        return (
                          <div
                            key={b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(b);
                            }}
                            className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold flex items-center justify-between gap-1 border truncate transition-all hover:scale-[1.02] cursor-pointer ${statusColor}`}
                            title={`${timeStr} - ${b.clientName} (${b.serviceName})`}
                          >
                            <span className="truncate flex-1 font-sans">
                              {b.clientName}
                            </span>
                            <span className="shrink-0 text-[7px] opacity-75 font-mono">
                              {displayHour}:{min}
                            </span>
                          </div>
                        );
                      })}

                      {cellBookings.length > 2 && (
                        <div className="text-[7px] font-extrabold text-slate-400 text-center bg-slate-50 py-0.5 rounded-md border border-slate-100 uppercase tracking-wider animate-pulse">
                          + {cellBookings.length - 2} More
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Info Legend */}
      <div className="flex items-center gap-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-white border border-indigo-100 border-l-3 border-l-indigo-600 rounded-sm"></span>
          Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-emerald-50 border border-emerald-100 border-l-3 border-l-emerald-500 rounded-sm"></span>
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-stone-100 border border-stone-200 border-l-3 border-l-stone-400 rounded-sm"></span>
          No-Show
        </span>
      </div>

      {/* MODAL 1: ADD NEW BOOKING */}
      {isNewBookingOpen && (
        <div id="modal-add-booking" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Add New Appointment</h3>
                <p className="text-[11px] text-slate-500">Scheduled on {getFormattedDateLabel(selectedDate)}</p>
              </div>
              <button
                onClick={() => setIsNewBookingOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="p-4 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <PhoneInput
                  id="booking-client-phone"
                  label="Client Mobile Number"
                  value={formClientPhone}
                  onChange={(val) => handleClientPhoneChange(val.replace(/\D/g, ''))}
                  countryCode={formClientCountryCode}
                  onCountryCodeChange={setFormClientCountryCode}
                  placeholder="50 123 4567"
                  required
                />
                {formClientPhone.length >= 7 && !clients.some(c => c.phone === formClientPhone) && (
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1">✨ New Client! Name will be saved into your directory.</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Client Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formClientName}
                  onChange={(e) => setFormClientName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Assign Staff / Stylist</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500 focus:border-indigo-500"
                  required
                >
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Select Service</label>
                <select
                  value={formServiceName}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500 focus:border-indigo-500"
                  required
                >
                  {services.map(s => (
                    <option key={s.name} value={s.name}>{s.name} — {formatCurrency(s.price, business.currency || 'AED')} ({s.durationMinutes} min)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Start Time</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Duration (Min)</label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                    required
                  />
                </div>
              </div>

              {packages.filter(p => p.clientPhone === formClientPhone && p.sessionsRemaining > 0).length > 0 && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <span className="text-[10px] font-bold text-indigo-700 block mb-1">🎟️ Client has an active prepaid package:</span>
                  <select
                    value={formUsePackageId}
                    onChange={(e) => setFormUsePackageId(e.target.value)}
                    className="w-full p-1 bg-white border border-indigo-200 rounded text-[11px] font-semibold text-indigo-900 focus:outline-indigo-500"
                  >
                    <option value="">Do not use package (charge regular rate)</option>
                    {packages
                      .filter(p => p.clientPhone === formClientPhone && p.sessionsRemaining > 0)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sessionsRemaining} sessions left)
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Additional Instructions (Optional)</label>
                <textarea
                  placeholder="e.g. Needs extra conditioner, wants tea..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  rows={2}
                />
              </div>

              {liveConflictMessage && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-pulse">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <span className="font-bold block">Double-Booking Conflict!</span>
                    <span>{liveConflictMessage}</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Appointment Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW BOOKING DETAILS & SHARE RECEIPTS */}
      {selectedBooking && (
        <div id="modal-view-booking" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Appointment Detail</h3>
                <p className="text-[10px] text-slate-500">ID: {selectedBooking.id}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setIsConfirmingDelete(false);
                }}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-slate-900">{selectedBooking.clientName}</h4>
                  <p className="text-xs text-slate-500 font-medium">📱 {formatDisplayPhone(selectedBooking.clientPhone, business.phoneCountryCode || '+971')}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${selectedBooking.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : selectedBooking.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-indigo-100 text-indigo-800'
                  }`}>
                  {selectedBooking.status}
                </span>
              </div>

              <hr className="border-slate-100" />

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Staff</span>
                  <p className="font-semibold text-slate-800">
                    {staff.find(s => s.id === selectedBooking.staffId)?.name || 'Unknown Staff'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Service Booked</span>
                  <p className="font-semibold text-slate-800">{selectedBooking.serviceName}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Scheduled Date & Time</span>
                  <p className="font-semibold text-slate-800">
                    {new Date(selectedBooking.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {
                      new Date(selectedBooking.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    }
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Duration & Billing</span>
                  <p className="font-semibold text-slate-800">
                    {selectedBooking.durationMinutes} min • {selectedBooking.linkedPackageId ? 'Prepaid (Package)' : formatCurrency(selectedBooking.price, business.currency || 'AED')}
                  </p>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="font-bold text-slate-500 block mb-0.5">Notes & Custom Prefs:</span>
                  <p className="text-slate-700 italic">"{selectedBooking.notes}"</p>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {selectedBooking.status === 'confirmed' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onUpdateBookingStatus(selectedBooking.id, 'completed');
                        setSelectedBooking(null);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Complete Appointment</span>
                    </button>
                    <button
                      onClick={() => {
                        onUpdateBookingStatus(selectedBooking.id, 'cancelled');
                        setSelectedBooking(null);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold py-2 rounded-xl cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Cancel Booking</span>
                    </button>
                  </div>
                )}

                {selectedBooking.status === 'confirmed' && (
                  <button
                    onClick={() => handleSendReminder(selectedBooking)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    <Bell className="h-4 w-4" />
                    <span>Send WhatsApp Reminder</span>
                  </button>
                )}

                <a
                  href={generateWhatsAppReceipt(selectedBooking)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Send WhatsApp Receipt / Update</span>
                </a>

                {selectedBooking.status === 'completed' && (
                  <button
                    onClick={() => {
                      setReceiptBooking(selectedBooking);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Thermal Receipt</span>
                  </button>
                )}

                {!isConfirmingDelete ? (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-[11px] font-semibold py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Record</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onDeleteBooking(selectedBooking.id);
                        setSelectedBooking(null);
                        setIsConfirmingDelete(false);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Confirm Delete</span>
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE THERMAL RECEIPT PREVIEW */}
      {receiptBooking && (
        <div id="modal-receipt-preview" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between no-print">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Receipt Preview</h3>
                <p className="text-[10px] text-slate-500">Thermal paper receipt formatting</p>
              </div>
              <button
                onClick={() => setReceiptBooking(null)}
                className="p-1.5 hover:bg-slate-200 rounded-xl cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-slate-100 flex-1 overflow-y-auto flex justify-center items-start no-print">
              <div
                id="printable-receipt-area"
                className="bg-[#FDFBF7] text-slate-800 p-6 shadow-md border border-slate-200 max-w-[320px] w-full font-sans relative"
              >
                <div className="absolute top-0 left-0 right-0 border-t-4 border-dashed border-slate-300 opacity-60"></div>
                <div className="absolute bottom-0 left-0 right-0 border-b-4 border-dashed border-slate-300 opacity-60"></div>

                <div className="text-center space-y-1 pt-2">
                  <h2 className="text-base font-extrabold text-slate-950 uppercase tracking-wide">
                    {business.name}
                  </h2>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                    {business.type} Mode
                  </span>
                  <p className="text-[10px] font-medium text-slate-500 mt-1">
                    Managed by {business.ownerName}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-600">
                    📞 {formatDisplayPhone(business.phone, business.phoneCountryCode || '+971')}
                  </p>
                  {business.trn && (
                    <p className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-md py-0.5 px-2 w-fit mx-auto mt-1 border border-amber-200/60">
                      TRN: {business.trn}
                    </p>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-300 my-4" />

                <div className="text-[11px] space-y-1.5 font-medium text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">RECEIPT NO:</span>
                    <span className="font-bold text-slate-900">
                      REC-{receiptBooking.id.toUpperCase().split('-')[1] || receiptBooking.id.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DATE:</span>
                    <span className="text-slate-900 font-semibold">
                      {new Date(receiptBooking.dateTime).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">TIME:</span>
                    <span className="text-slate-900 font-semibold">
                      {new Date(receiptBooking.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CLIENT:</span>
                    <span className="text-slate-900 font-bold">{receiptBooking.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">MOBILE:</span>
                    <span className="text-slate-950 font-semibold">{formatDisplayPhone(receiptBooking.clientPhone, business.phoneCountryCode || '+971')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">STYLIST:</span>
                    <span className="text-slate-900 font-semibold">
                      {staff.find(s => s.id === receiptBooking.staffId)?.name || 'Store Stylist'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                    <span>Service Description</span>
                    <span>Price</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-900">
                    <div className="max-w-[180px] truncate">
                      <span>{receiptBooking.serviceName}</span>
                      <span className="text-[10px] text-slate-500 block">1 x {receiptBooking.durationMinutes} min</span>
                    </div>
                    <span>
                      {formatCurrency(receiptBooking.price, business.currency || 'AED')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-4" />

                <div className="text-xs space-y-1.5 font-semibold text-slate-800">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Subtotal</span>
                    <span>{formatCurrency(receiptBooking.price, business.currency || 'AED')}</span>
                  </div>

                  {business.enableVat && (
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>5% UAE VAT (Included)</span>
                      <span>{formatCurrency(calculateUaeVat(receiptBooking.price).vatAmount, business.currency || 'AED')}</span>
                    </div>
                  )}

                  {receiptBooking.linkedPackageId ? (
                    <div className="flex justify-between text-[11px] text-indigo-600">
                      <span>Prepaid Package Apply</span>
                      <span>-{formatCurrency(receiptBooking.price, business.currency || 'AED')}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-1 border-t border-slate-100">
                    <span>Total Charged</span>
                    <span>
                      {receiptBooking.linkedPackageId ? formatCurrency(0, business.currency || 'AED') : formatCurrency(receiptBooking.price, business.currency || 'AED')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-4" />

                <div className="text-center py-1">
                  <span className="inline-block border-2 border-emerald-600 text-emerald-600 text-[10px] font-extrabold tracking-widest px-3 py-1 rounded-md rotate-[-3deg] uppercase">
                    {receiptBooking.linkedPackageId ? 'PREPAID VIA PACKAGE' : 'PAID & SETTLED'}
                  </span>

                  {(() => {
                    const matchedPay = payments.find(p => p.linkedBookingId === receiptBooking.id);
                    if (matchedPay) {
                      return (
                        <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase tracking-wide">
                          Method: {matchedPay.method} ({matchedPay.date})
                        </p>
                      );
                    }
                    return (
                      <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase tracking-wide">
                        Method: UPI Tagged
                      </p>
                    );
                  })()}
                </div>

                {!receiptBooking.linkedPackageId && (() => {
                  const resolvedUpi = business.upiId || `${business.phone}@upi`;
                  return (
                    <div className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200/60 rounded-2xl my-4 text-center">
                      <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest mb-1.5">
                        Scan to Pay via UPI
                      </span>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                          `upi://pay?pa=${resolvedUpi}&pn=${encodeURIComponent(business.name)}&am=${receiptBooking.price}&cu=INR&tn=REC-${receiptBooking.id.toUpperCase().slice(0, 8)}`
                        )}`}
                        alt="UPI QR Code"
                        className="w-[100px] h-[100px] border border-slate-100 p-1"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[9px] font-bold text-slate-600 font-mono mt-1.5">
                        {resolvedUpi}
                      </span>
                      <span className="text-[8px] text-slate-400 font-semibold mt-0.5">
                        Amount: {formatCurrency(receiptBooking.price, business.currency || 'AED')}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex flex-col items-center justify-center mt-4 mb-2">
                  <div className="font-mono text-base tracking-widest text-slate-600 leading-none select-none">
                    ||||| | |||| ||| ||| |||| || |||
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider mt-1 block">
                    *REC-{receiptBooking.id.toUpperCase().slice(0, 8)}*
                  </span>
                </div>

                <div className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider pt-2">
                  <span>Thank you for visiting!</span>
                  <span className="block mt-0.5">Please visit us again.</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 no-print">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>Trigger System Print</span>
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Share via WhatsApp</span>
                </button>
              </div>
              <button
                onClick={() => setReceiptBooking(null)}
                className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT INJECT DUPLICATE DOM TO BE INVISIBLE EXCEPT DURING WINDOW PRINT */}
      {receiptBooking && (
        <div className="hidden print:block" id="printable-receipt-area">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold uppercase tracking-wide">{business.name}</h2>
            <span className="text-xs uppercase tracking-widest block font-bold">{business.type}</span>
            <p className="text-xs">Managed by {business.ownerName}</p>
            <p className="text-xs">Contact: {formatDisplayPhone(business.phone, business.phoneCountryCode || '+971')}</p>
            {business.trn && <p className="text-xs font-bold mt-0.5">TRN: {business.trn}</p>}
          </div>

          <div className="border-t border-dashed border-black my-4" />

          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>RECEIPT NO:</span>
              <span className="font-bold">REC-{receiptBooking.id.toUpperCase().split('-')[1] || receiptBooking.id.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>DATE & TIME:</span>
              <span>
                {new Date(receiptBooking.dateTime).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} • {
                  new Date(receiptBooking.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>CLIENT:</span>
              <span className="font-bold">{receiptBooking.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span>MOBILE:</span>
              <span>{formatDisplayPhone(receiptBooking.clientPhone, business.phoneCountryCode || '+971')}</span>
            </div>
            <div className="flex justify-between">
              <span>STYLIST:</span>
              <span>{staff.find(s => s.id === receiptBooking.staffId)?.name || 'Store Stylist'}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-black my-4" />

          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-bold">
              <span>Service Description</span>
              <span>Price</span>
            </div>
            <div className="flex justify-between font-medium">
              <div>
                <span>{receiptBooking.serviceName}</span>
                <span className="text-[10px] block text-slate-600">{receiptBooking.durationMinutes} min</span>
              </div>
              <span>{formatCurrency(receiptBooking.price, business.currency || 'AED')}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-black my-4" />

          <div className="text-xs space-y-1.5 font-bold">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal</span>
              <span>{formatCurrency(receiptBooking.price, business.currency || 'AED')}</span>
            </div>

            {business.enableVat && (
              <div className="flex justify-between text-slate-700">
                <span>5% UAE VAT (Included)</span>
                <span>{formatCurrency(calculateUaeVat(receiptBooking.price).vatAmount, business.currency || 'AED')}</span>
              </div>
            )}

            {receiptBooking.linkedPackageId ? (
              <div className="flex justify-between text-slate-700">
                <span>Prepaid Package Apply</span>
                <span>-{formatCurrency(receiptBooking.price, business.currency || 'AED')}</span>
              </div>
            ) : null}

            <div className="flex justify-between text-sm border-t border-black pt-1">
              <span>Total Paid</span>
              <span>{receiptBooking.linkedPackageId ? formatCurrency(0, business.currency || 'AED') : formatCurrency(receiptBooking.price, business.currency || 'AED')}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-black my-4" />

          <div className="text-center text-xs py-2">
            <div className="inline-block border-2 border-black text-black font-extrabold px-4 py-1.5 rounded uppercase text-sm">
              {receiptBooking.linkedPackageId ? 'PREPAID VIA PACKAGE' : 'PAID & SETTLED'}
            </div>
            {(() => {
              const matchedPay = payments.find(p => p.linkedBookingId === receiptBooking.id);
              if (matchedPay) {
                return (
                  <p className="text-[10px] font-bold mt-2 uppercase">
                    Method: {matchedPay.method} ({matchedPay.date})
                  </p>
                );
              }
              return null;
            })()}
          </div>

          {!receiptBooking.linkedPackageId && (() => {
            const resolvedUpi = business.upiId || `${business.phone}@upi`;
            return (
              <div className="flex flex-col items-center justify-center p-2 border border-black rounded-xl my-4 text-center max-w-[160px] mx-auto">
                <span className="text-[9px] font-bold uppercase tracking-widest mb-1">
                  Scan to Pay (UPI)
                </span>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                    `upi://pay?pa=${resolvedUpi}&pn=${encodeURIComponent(business.name)}&am=${receiptBooking.price}&cu=INR&tn=REC-${receiptBooking.id.toUpperCase().slice(0, 8)}`
                  )}`}
                  alt="UPI QR Code"
                  className="w-[90px] h-[90px] p-0.5"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[9px] font-bold font-mono mt-1">
                  {resolvedUpi}
                </span>
                <span className="text-[8px] mt-0.5 font-bold">
                  Amount: {formatCurrency(receiptBooking.price, business.currency || 'AED')}
                </span>
              </div>
            );
          })()}

          <div className="flex flex-col items-center justify-center mt-4">
            <div className="font-mono text-lg select-none tracking-widest text-black">
              ||||| | |||| ||| ||| |||| || |||
            </div>
            <span className="text-[10px] font-bold font-mono tracking-wider mt-1 block">
              *REC-{receiptBooking.id.toUpperCase().slice(0, 8)}*
            </span>
          </div>

          <div className="text-center text-[10px] font-bold uppercase tracking-wider pt-4">
            <span>Thank you for visiting! Please visit us again.</span>
          </div>
        </div>
      )}

      {/* Premium Toast Notification */}
      {toast && (
        <div
          id="custom-toast-notification"
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-bounce max-w-sm ${toast.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/30 shadow-emerald-500/10'
            : toast.type === 'warning'
              ? 'bg-amber-950/90 text-amber-100 border-amber-500/30 shadow-amber-500/10'
              : 'bg-rose-950/90 text-rose-100 border-rose-500/30 shadow-rose-500/10'
            }`}
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
            {toast.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-400 animate-pulse" />}
            {toast.type === 'error' && <XCircle className="h-5 w-5 text-rose-400" />}
          </div>
          <div className="flex-1 text-xs font-bold font-sans pr-2">
            {toast.message}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition-colors text-xs font-extrabold focus:outline-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* MODAL 4: STAFF SCHEDULE CONFLICT OVERLAY WARNING */}
      {conflictOverlay && (
        <div id="modal-conflict-warning" className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden flex flex-col max-h-[90vh] animate-pulse-once">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <AlertCircle className="h-8 w-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display">Schedule Conflict Detected!</h3>
                <p className="text-xs text-rose-700 font-bold mt-1">This slot is already reserved or overlaps with another booking</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs font-medium text-slate-700 leading-relaxed">
                {conflictOverlay.message}
              </div>

              <div className="text-xs text-slate-500 font-medium text-center px-4 leading-normal">
                Double-booking can cause scheduling disruptions. Do you want to ignore this warning and book the slot anyway?
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setConflictOverlay(null)}
                className="w-full sm:order-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-3 rounded-2xl transition-all cursor-pointer"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  conflictOverlay.onProceed();
                }}
                className="w-full sm:order-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-3 rounded-2xl shadow-md shadow-rose-100 transition-all cursor-pointer"
              >
                Force Save Slot
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
