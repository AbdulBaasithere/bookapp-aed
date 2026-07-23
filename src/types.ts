export type BusinessType = string;

export function getBusinessEmoji(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('salon') || t.includes('hair') || t.includes('barber') || t.includes('stylist')) return '💇';
  if (t.includes('spa') || t.includes('beauty') || t.includes('wellness') || t.includes('skin')) return '🌸';
  if (t.includes('clinic') || t.includes('doctor') || t.includes('medical') || t.includes('dental') || t.includes('dentist') || t.includes('physio')) return '🩺';
  if (t.includes('gym') || t.includes('fitness') || t.includes('workout') || t.includes('train') || t.includes('yoga') || t.includes('dance')) return '🏋️';
  if (t.includes('massage') || t.includes('therapy')) return '💆';
  if (t.includes('nail')) return '💅';
  if (t.includes('groom')) return '🧔';
  if (t.includes('tattoo')) return '✒️';
  if (t.includes('pet') || t.includes('dog') || t.includes('cat') || t.includes('vet')) return '🐾';
  if (t.includes('consult') || t.includes('law') || t.includes('coach') || t.includes('office')) return '💼';
  if (t.includes('edu') || t.includes('tutor') || t.includes('class') || t.includes('school') || t.includes('teach')) return '🎓';
  if (t.includes('photo') || t.includes('shoot') || t.includes('video') || t.includes('film')) return '📷';
  if (t.includes('car') || t.includes('wash') || t.includes('auto') || t.includes('repair')) return '🚗';
  if (t.includes('clean') || t.includes('maid') || t.includes('house')) return '🧹';
  if (t.includes('food') || t.includes('cafe') || t.includes('restaurant') || t.includes('bakery')) return '🍔';
  return '📦'; // Default/General fallback
}

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  ownerName: string;
  phone: string;
  phoneCountryCode?: string; // default '+971'
  currency?: string; // default 'AED'
  country?: string; // default 'United Arab Emirates'
  emirate?: string; // e.g. 'Dubai'
  trn?: string; // UAE Tax Registration Number (15 digits)
  enableVat?: boolean; // 5% VAT enabled
  iban?: string; // UAE IBAN e.g. AE120330000012345678901
  bankName?: string; // e.g. Emirates NBD, Mashreq, FAB
  upiId?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  workingHours: {
    start: string; // "HH:MM" format
    end: string;   // "HH:MM" format
  };
  color: string; // Tailwind color class or hex (e.g. "bg-teal-100 text-teal-800")
  businessId?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  notes: string;
  createdDate: string;
  birthday?: string; // "YYYY-MM-DD" or "MM-DD" format
  businessId?: string;
}

export interface Package {
  id: string;
  name: string;
  clientPhone: string;
  totalSessions: number;
  sessionsRemaining: number;
  price: number;
  expiryDate: string; // "YYYY-MM-DD"
  createdDate: string; // "YYYY-MM-DD"
  businessId?: string;
}

export interface Booking {
  id: string;
  clientPhone: string;
  clientName: string;
  staffId: string;
  serviceName: string;
  dateTime: string; // ISO String or "YYYY-MM-DDTHH:MM"
  durationMinutes: number;
  status: 'confirmed' | 'completed' | 'no-show' | 'cancelled';
  notes?: string;
  linkedPackageId?: string; // If this booking decrements a package
  price: number;
  businessId?: string;
}

export interface Payment {
  id: string;
  clientPhone: string;
  clientName: string;
  amount: number;
  method: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'tabby';
  date: string; // ISO date or "YYYY-MM-DD"
  type: 'booking' | 'package_purchase' | 'manual_settlement';
  linkedBookingId?: string;
  linkedPackageId?: string;
  status: 'paid' | 'due';
  businessId?: string;
}

export interface Service {
  name: string;
  price: number;
  durationMinutes: number;
  category: string;
}
