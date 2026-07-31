import { Business, Staff, Client, Package, Booking, Payment, Service } from './types';

export const DEFAULT_BUSINESS: Business = {
  id: "biz-1",
  name: "Dubai Luxe Wellness & Salon",
  type: "salon",
  ownerName: "Tariq Al-Mansoor",
  phone: "501234567",
  phoneCountryCode: "+971",
  currency: "AED",
  country: "United Arab Emirates",
  emirate: "Dubai",
  trn: "100456789000003",
  enableVat: true,
  iban: "AE120330000012345678901",
  bankName: "Emirates NBD",
  upiId: "dubailuxe@bank"
};

export const DEFAULT_STAFF: Staff[] = [
  {
    id: "staff-1",
    name: "Tariq Al-Mansoor",
    role: "Master & Director",
    workingHours: { start: "08:00", end: "21:00" },
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    businessId: "biz-1"
  },
  {
    id: "staff-2",
    name: "Fatima Al-Hashemi",
    role: "Senior Hair & Beauty Specialist",
    workingHours: { start: "09:00", end: "20:00" },
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    businessId: "biz-1"
  },
  {
    id: "staff-3",
    name: "Vikram Malhotra",
    role: "Therapist & Skincare Expert",
    workingHours: { start: "10:00", end: "19:00" },
    color: "bg-amber-100 text-amber-800 border-amber-200",
    businessId: "biz-1"
  }
];

export const DEFAULT_SERVICES: Service[] = [
  // Salon
  { name: "Haircut & Styling (Men)", price: 150, durationMinutes: 30, category: "Hair" },
  { name: "Haircut & Blowdry (Women)", price: 280, durationMinutes: 60, category: "Hair" },
  { name: "Global Hair Coloring", price: 450, durationMinutes: 120, category: "Hair" },
  { name: "Premium Keratin Treatment", price: 750, durationMinutes: 150, category: "Hair" },
  { name: "Beard Styling & Grooming", price: 90, durationMinutes: 20, category: "Hair" },
  // Spa
  { name: "Swedish Massage (60 min)", price: 350, durationMinutes: 60, category: "Spa" },
  { name: "Deep Tissue Massage (90 min)", price: 480, durationMinutes: 90, category: "Spa" },
  { name: "De-tan Facial Treatment", price: 290, durationMinutes: 45, category: "Skin" },
  { name: "HydraFacial Glow Dubai", price: 650, durationMinutes: 75, category: "Skin" },
  // Gym / Physio
  { name: "Personal Training Session", price: 250, durationMinutes: 60, category: "Fitness" },
  { name: "Physiotherapy Consultation", price: 300, durationMinutes: 45, category: "Therapy" },
  { name: "Sports Rehabilitation", price: 380, durationMinutes: 60, category: "Therapy" }
];

export const DEFAULT_CLIENTS: Client[] = [
  {
    id: "client-1",
    name: "Aarav Mehta",
    phone: "501234567",
    notes: "Prefers light hold hair wax, regular Downtown Dubai client.",
    createdDate: "2026-07-01",
    birthday: "1995-04-12",
    businessId: "biz-1"
  },
  {
    id: "client-2",
    name: "Priya Patel",
    phone: "529876543",
    notes: "Sensitive skin, always schedules evening skincare in Dubai Marina.",
    createdDate: "2026-07-03",
    birthday: "1992-11-20",
    businessId: "biz-1"
  },
  {
    id: "client-3",
    name: "Sheikh Hamdan Al-Maktoum",
    phone: "551122334",
    notes: "Requires deep shoulder work during massages, Jumeirah resident.",
    createdDate: "2026-07-05",
    birthday: "1988-08-15",
    businessId: "biz-1"
  },
  {
    id: "client-4",
    name: "Ananya Iyer",
    phone: "544455667",
    notes: "Regular global hair coloring, uses organic shampoo.",
    createdDate: "2026-07-10",
    birthday: "1998-01-30",
    businessId: "biz-1"
  },
  {
    id: "client-5",
    name: "Rohan Das",
    phone: "567788990",
    notes: "Interested in premium packages.",
    createdDate: "2026-07-15",
    birthday: "1990-06-25",
    businessId: "biz-1"
  }
];

export const DEFAULT_PACKAGES: Package[] = [
  {
    id: "pkg-1",
    name: "Dubai Skincare Glow Package (5 Sessions)",
    clientPhone: "529876543",
    totalSessions: 5,
    sessionsRemaining: 4,
    price: 2600,
    createdDate: "2026-07-05",
    expiryDate: "2026-10-05",
    businessId: "biz-1"
  }
];

export const DEFAULT_BOOKINGS: Booking[] = [
  {
    id: "booking-1",
    clientPhone: "501234567",
    clientName: "Aarav Mehta",
    staffId: "staff-2",
    serviceName: "Haircut & Styling (Men)",
    dateTime: "2026-07-20T09:30",
    durationMinutes: 30,
    status: "completed",
    price: 150,
    businessId: "biz-1"
  },
  {
    id: "booking-2",
    clientPhone: "529876543",
    clientName: "Priya Patel",
    staffId: "staff-1",
    serviceName: "HydraFacial Glow Dubai",
    dateTime: "2026-07-20T11:00",
    durationMinutes: 75,
    status: "confirmed",
    price: 650,
    businessId: "biz-1"
  },
  {
    id: "booking-3",
    clientPhone: "567788990",
    clientName: "Rohan Das",
    staffId: "staff-3",
    serviceName: "Deep Tissue Massage (90 min)",
    dateTime: "2026-07-20T15:00",
    durationMinutes: 90,
    status: "completed",
    price: 480,
    businessId: "biz-1"
  }
];

export const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: "pay-1",
    clientPhone: "501234567",
    clientName: "Aarav Mehta",
    amount: 150,
    method: "card",
    date: "2026-07-20",
    type: "booking",
    linkedBookingId: "booking-1",
    status: "paid",
    businessId: "biz-1"
  },
  {
    id: "pay-2",
    clientPhone: "529876543",
    clientName: "Priya Patel",
    amount: 650,
    method: "card",
    date: "2026-07-20",
    type: "booking",
    linkedBookingId: "booking-2",
    status: "paid",
    businessId: "biz-1"
  },
  {
    id: "pay-3",
    clientPhone: "567788990",
    clientName: "Rohan Das",
    amount: 480,
    method: "cash",
    date: "2026-07-20",
    type: "booking",
    linkedBookingId: "booking-3",
    status: "paid",
    businessId: "biz-1"
  }
];

// Default Payment notifications
export const DEFAULT_LIVE_FEED = [
  {
    id: "tx-upi-101",
    timestamp: "2026-07-20T08:15:00.000Z",
    clientName: "Aarav Mehta",
    amount: 150,
    method: "card",
    type: "card_payment_received"
  },
  {
    id: "tx-upi-102",
    timestamp: "2026-07-20T08:10:00.000Z",
    clientName: "Rohan Das",
    amount: 480,
    method: "cash",
    type: "manual_settlement"
  }
];
