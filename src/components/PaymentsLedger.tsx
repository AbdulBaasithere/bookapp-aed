import React, { useState } from 'react';
import { Payment, Client, Booking, Business } from '../types';
import { 
  Search, 
  Receipt, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Share2, 
  MessageSquare,
  TrendingUp,
  DollarSign,
  QrCode
} from 'lucide-react';

interface PaymentsLedgerProps {
  payments: Payment[];
  clients: Client[];
  bookings: Booking[];
  onMarkAsPaid: (paymentId: string, method?: 'cash' | 'upi' | 'card') => void;
  onAddManualPayment: (payment: Omit<Payment, 'id' | 'date'>) => void;
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

export default function PaymentsLedger({
  payments,
  clients,
  bookings,
  onMarkAsPaid,
  onAddManualPayment,
  wsConnected = false,
  liveFeed = [],
  business = { id: "biz-1", name: "Book App", type: "salon", ownerName: "Owner", phone: "9876543210" }
}: PaymentsLedgerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'paid' | 'due'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  // Manual payment states
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formMethod, setFormMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [formStatus, setFormStatus] = useState<'paid' | 'due'>('paid');

  // Compute stats
  const totalReceived = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDues = payments
    .filter(p => p.status === 'due')
    .reduce((sum, p) => sum + p.amount, 0);

  const upiCollected = payments
    .filter(p => p.status === 'paid' && p.method === 'upi')
    .reduce((sum, p) => sum + p.amount, 0);

  // Filter payments
  const filteredPayments = payments
    .filter(p => {
      // Search
      const term = searchTerm.toLowerCase();
      const matchSearch = p.clientName.toLowerCase().includes(term) || p.clientPhone.includes(term);
      
      // Status
      if (filterMode === 'paid') return matchSearch && p.status === 'paid';
      if (filterMode === 'due') return matchSearch && p.status === 'due';
      return matchSearch;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // Client Autocomplete helper
  const handleClientPhoneChange = (phoneInput: string) => {
    setFormClientPhone(phoneInput);
    const matchedClient = clients.find(c => c.phone === phoneInput);
    if (matchedClient) {
      setFormClientName(matchedClient.name);
    }
  };

  const handleManualPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientPhone || !formClientName || formAmount <= 0) {
      alert('Please fill out client details and a valid settlement amount.');
      return;
    }

    onAddManualPayment({
      clientPhone: formClientPhone,
      clientName: formClientName,
      amount: formAmount,
      method: formMethod,
      type: 'manual_settlement',
      status: formStatus
    });

    // Reset and close
    setFormClientPhone('');
    setFormClientName('');
    setFormAmount(0);
    setIsAddPaymentOpen(false);
  };

  // Generate WhatsApp simple receipt text
  const getWhatsAppReceiptText = (p: Payment) => {
    const formattedDate = new Date(p.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // Retrieve corresponding booking if any
    const booking = p.linkedBookingId ? bookings.find(b => b.id === p.linkedBookingId) : null;
    const description = booking 
      ? `Service appointment - ${booking.serviceName}` 
      : p.type === 'package_purchase' 
      ? `Package Subscription Payment` 
      : `Manual Outstanding Settlement`;

    const statusIcon = p.status === 'paid' ? '✅ PAID' : '⚠️ DUE';
    const paymentMode = p.status === 'paid' ? `via ${p.method.toUpperCase()}` : '';

    const receiptMsg = `*Receipt from ${business.name}* 🧾\n\n` +
      `👤 *Client:* ${p.clientName}\n` +
      `📅 *Date:* ${formattedDate}\n` +
      `📝 *Details:* ${description}\n` +
      `💵 *Amount:* ₹${p.amount}\n` +
      `📌 *Status:* ${statusIcon} ${paymentMode}\n\n` +
      `Thank you for your business! - ${business.name}`;

    let cleanPhone = p.clientPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(receiptMsg)}`;
  };

  return (
    <div className="space-y-4 pb-20" id="payments-ledger-root">
      
      {/* Real-time sync status ribbon */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold transition-all ${
        wsConnected 
          ? 'bg-emerald-50/40 border-emerald-100/50 text-emerald-800' 
          : 'bg-amber-50/40 border-amber-100/50 text-amber-800'
      }`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span>
            {wsConnected 
              ? 'Real-Time Sync Online: All billing adjustments, package subscriptions, and payments are synchronizing across connected salon counters.' 
              : 'Real-Time Sync Offline: Reconnecting to salon network state manager... Adjustments made will buffer locally.'}
          </span>
        </div>
        {liveFeed.length > 0 && (
          <span className="bg-white/80 border border-emerald-100 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase text-emerald-700 animate-pulse shrink-0">
            {liveFeed.length} New Live Actions
          </span>
        )}
      </div>
      
      {/* Top Ledger Stats and Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Stat 1 */}
        <div className="premium-card p-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Cash Flow (Collected)</span>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">₹{totalReceived.toLocaleString('en-IN')}</p>
          <span className="text-[9px] text-slate-400 block mt-1">Recorded upfront & settled bookings</span>
        </div>

        {/* Stat 2 */}
        <div className="premium-card p-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Dues Pending</span>
          <p className="text-xl font-extrabold text-red-500 mt-1">₹{totalDues.toLocaleString('en-IN')}</p>
          <span className="text-[9px] text-slate-400 block mt-1">Outstanding appointments</span>
        </div>

        {/* Stat 3 */}
        <div className="premium-card p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">UPI Collections</span>
              <p className="text-base font-bold text-slate-900 mt-1">₹{upiCollected.toLocaleString('en-IN')}</p>
            </div>
            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 font-bold rounded">
              {totalReceived > 0 ? Math.round((upiCollected / totalReceived) * 100) : 0}% UPI
            </span>
          </div>
          <button
            onClick={() => setIsAddPaymentOpen(true)}
            className="w-full mt-3 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            + Record Manual Payment
          </button>
        </div>

      </div>

      {/* Filter and search bar */}
      <div className="premium-card p-5 space-y-3">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setFilterMode('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'paid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Paid Only
            </button>
            <button
              onClick={() => setFilterMode('due')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'due' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pending Dues
            </button>
          </div>

          {/* Quick search input */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search client or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-indigo-500"
            />
          </div>
        </div>

      </div>

      {/* Dual Column Layout: Payments History & Traceability Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Column: Payments History List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs">
          
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_100px_90px] p-3 text-xs font-bold text-slate-400 border-b border-slate-150 bg-slate-50/50">
            <div>Client & details</div>
            <div className="text-right">Amount</div>
            <div className="text-center">Method</div>
            <div className="text-right">Status</div>
          </div>

          {/* Scrollbox of lines */}
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                No transaction entries match this filter selection.
              </div>
            ) : (
              filteredPayments.map(p => (
                <div 
                  key={p.id}
                  id={`payment-row-${p.id}`}
                  onClick={() => setSelectedReceipt(p)}
                  className="grid grid-cols-[1fr_80px_100px_90px] p-3 items-center text-xs hover:bg-slate-50/50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 block truncate max-w-[150px]">{p.clientName}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {
                        p.type === 'booking' ? 'Booking' : p.type === 'package_purchase' ? 'Package' : 'Manual Set'
                      }
                    </span>
                  </div>
                  
                  <div className="text-right font-bold text-slate-900">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </div>

                  <div className="text-center">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                      p.method === 'upi' ? 'bg-indigo-50 text-indigo-700' : p.method === 'card' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {p.method}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {p.status === 'paid' ? 'Paid' : 'Due'}
                    </span>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

        {/* Right Column: Traceability & UPI Payment Notifications */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-150 p-4 shadow-xs flex flex-col max-h-[440px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span>UPI & Payment Notifications</span>
            </h3>
            <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 font-black uppercase rounded animate-pulse">
              Traceability Live
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {liveFeed.filter(f => f.type === 'upi_payment_received' || f.method === 'upi' || f.type === 'manual_settlement').length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4 min-h-[200px]">
                <QrCode className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-500">No payment logs yet</p>
                <p className="text-[10px] text-slate-400 mt-1">UPI scan notifications & receipt updates will display here with instant traceability codes.</p>
              </div>
            ) : (
              liveFeed
                .filter(f => f.type === 'upi_payment_received' || f.method === 'upi' || f.type === 'manual_settlement')
                .map((feedItem) => {
                  const itemTime = new Date(feedItem.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  const isUPI = feedItem.type === 'upi_payment_received' || feedItem.method === 'upi';
                  
                  return (
                    <div 
                      key={feedItem.id} 
                      className={`p-2.5 rounded-xl border text-[11px] transition-all flex flex-col gap-1 ${
                        isUPI 
                          ? 'bg-indigo-50/50 border-indigo-100/60' 
                          : 'bg-emerald-50/40 border-emerald-100/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                          feedItem.type === 'upi_payment_received'
                            ? 'bg-indigo-600 text-white'
                            : isUPI
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {feedItem.type === 'upi_payment_received' ? '⚡ UPI RECEIVED' : isUPI ? 'UPI PAID' : 'SETTLED'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-semibold">{itemTime}</span>
                      </div>

                      <div className="leading-relaxed text-slate-700">
                        {feedItem.type === 'upi_payment_received' ? (
                          <span>
                            Amount of <strong className="text-indigo-900">₹{feedItem.amount}</strong> confirmed paid by <strong className="text-indigo-900">{feedItem.clientName}</strong> via UPI QR code interaction.
                          </span>
                        ) : (
                          <span>
                            Payment of <strong className="text-slate-800">₹{feedItem.amount}</strong> cleared for <strong>{feedItem.clientName}</strong>.
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[8px] text-slate-400 font-mono flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                        <span>TXN ID: {feedItem.id.toUpperCase()}</span>
                        <span>SUCCESS</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

      </div>


      {/* RECEIPT VIEW MODAL / SHEET */}
      {selectedReceipt && (
        <div id="modal-payment-receipt" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden">
            
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-slate-400" />
                <span>Simple Receipt</span>
              </span>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 hover:bg-slate-200 rounded-xl cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              
              {/* Receipt Visual layout */}
              <div className="border-2 border-dashed border-slate-150 p-4 rounded-2xl bg-amber-50/5 text-center space-y-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{business.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Auto-generated Transaction Slip</p>
                </div>

                <div className="py-2 border-t border-b border-slate-150/50 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Receipt No:</span>
                    <span className="font-semibold text-slate-700">{selectedReceipt.id}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Date:</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(selectedReceipt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Client Name:</span>
                    <span className="font-bold text-slate-800">{selectedReceipt.clientName}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Client Phone:</span>
                    <span className="font-semibold text-slate-700">+91 {selectedReceipt.clientPhone}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Transaction Class:</span>
                    <span className="font-semibold text-slate-700 uppercase">
                      {selectedReceipt.type === 'booking' ? 'Appointment Booking' : selectedReceipt.type === 'package_purchase' ? 'Prepaid Package Sale' : 'Outstanding Settlement'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between font-extrabold text-slate-900 py-1">
                  <span className="text-xs">TOTAL RECEIVED</span>
                  <span className="text-lg">₹{selectedReceipt.amount}</span>
                </div>

                <div className="flex justify-center gap-2 pt-1">
                  <span className={`text-[10px] font-bold px-3 py-1 border rounded-lg ${
                    selectedReceipt.status === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-150 text-red-800'
                  }`}>
                    {selectedReceipt.status === 'paid' ? `PAID via ${selectedReceipt.method.toUpperCase()}` : 'OUTSTANDING DUE'}
                  </span>
                </div>

                {/* Dynamic UPI QR Code for settling outstanding balance */}
                <div className="pt-3 border-t border-dashed border-slate-200 space-y-2">
                  {selectedReceipt.status === 'due' ? (
                    <>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center justify-center gap-1">
                        <QrCode className="h-3.5 w-3.5 animate-pulse" />
                        <span>Scan to Pay Outstanding Dues</span>
                      </span>
                      <div className="bg-white p-2 rounded-xl inline-block border border-slate-100 shadow-xs">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=8&data=${encodeURIComponent(
                            `upi://pay?pa=${selectedReceipt.clientPhone}@upi&pn=${encodeURIComponent(selectedReceipt.clientName)}&am=${selectedReceipt.amount}&cu=INR&tn=${encodeURIComponent(`Receipt-${selectedReceipt.id}`)}`
                          )}`}
                          alt="UPI QR Code"
                          className="w-32 h-32 mx-auto"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        <p className="font-semibold text-slate-700">UPI Payee ID: <span className="font-mono text-indigo-600">{selectedReceipt.clientPhone}@upi</span></p>
                        <p className="mt-0.5">Outstanding Amount: <strong className="text-slate-800">₹{selectedReceipt.amount}</strong></p>
                      </div>

                      {/* UPI QR Interaction Confirmation */}
                      <button
                        type="button"
                        onClick={() => {
                          onMarkAsPaid(selectedReceipt.id, 'upi');
                          setSelectedReceipt({ ...selectedReceipt, status: 'paid', method: 'upi' });
                        }}
                        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.01] cursor-pointer"
                      >
                        <CheckCircle className="h-4 w-4 text-white" />
                        <span>Confirm UPI Payment Received</span>
                      </button>
                    </>
                  ) : (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-center gap-1.5 text-emerald-800">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">No Outstanding Balance (Paid)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipts Actions */}
              <div className="space-y-2">
                
                {/* Convert to Paid action if Due */}
                {selectedReceipt.status === 'due' && (
                  <button
                    onClick={() => {
                      onMarkAsPaid(selectedReceipt.id);
                      setSelectedReceipt({ ...selectedReceipt, status: 'paid' });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Mark Outstanding as Paid (Collected)
                  </button>
                )}

                {/* WHATSAPP RECEIPT DISPATCH - REAL-WORLD INTEGRATION */}
                <a
                  href={getWhatsAppReceiptText(selectedReceipt)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Send Receipt on WhatsApp</span>
                </a>

                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-xl cursor-pointer"
                >
                  Close Receipt Screen
                </button>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* RECORD MANUAL PAYMENT MODAL */}
      {isAddPaymentOpen && (
        <div id="modal-record-payment" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Record Standing / Manual Payment</h3>
              <button 
                onClick={() => setIsAddPaymentOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualPaymentSubmit} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Client Mobile (10 digits)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                  <input 
                    type="tel"
                    placeholder="e.g. 9844332211"
                    value={formClientPhone}
                    onChange={(e) => handleClientPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-11 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Client Name</label>
                <input 
                  type="text"
                  placeholder="Enter full name"
                  value={formClientName}
                  onChange={(e) => setFormClientName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Amount Collected (₹)</label>
                <input 
                  type="number"
                  placeholder="e.g. 1500"
                  value={formAmount || ''}
                  onChange={(e) => setFormAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Mode</label>
                  <select
                    value={formMethod}
                    onChange={(e: any) => setFormMethod(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  >
                    <option value="upi">UPI / GPay</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card swipe</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  >
                    <option value="paid">Fully Paid</option>
                    <option value="due">Due / Pending</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Log Transaction
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
