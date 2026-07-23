import React, { useState } from 'react';
import { Package, Client, Payment, Business } from '../types';
import PhoneInput from './PhoneInput';
import { formatCurrency, formatDisplayPhone, buildWhatsAppLink } from '../utils/countryUtils';
import { 
  Plus, 
  Ticket, 
  Search, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Zap, 
  MessageSquare,
  QrCode
} from 'lucide-react';

interface PackagesTrackerProps {
  packages: Package[];
  clients: Client[];
  onSellPackage: (pkg: Omit<Package, 'id' | 'createdDate'>, paymentMethod: 'cash' | 'upi' | 'card') => void;
  business?: Business;
}

// Preset blueprint packages for quick creation in Dubai salon/wellness context
const PRESET_PACKAGES = [
  { name: "5-session Premium Hair Spa Pass", price: 450, sessions: 5, daysValidity: 60, desc: "Aromatic hair wash, deep therapy spa, and blowdry." },
  { name: "10-session Wellness & Gym Pass", price: 1200, sessions: 10, daysValidity: 90, desc: "Personalized posture, recovery & fitness training." },
  { name: "6-session HydraFacial Combo", price: 1800, sessions: 6, daysValidity: 120, desc: "Anti-aging exfoliation & skin brightening course." },
  { name: "1-month Unlimited Fitness Pass", price: 350, sessions: 30, daysValidity: 30, desc: "Full wellness access with personal coach guidance." }
];

export default function PackagesTracker({
  packages,
  clients,
  onSellPackage,
  business = { id: "biz-1", name: "Book App", type: "salon", ownerName: "Owner", phone: "9876543210" }
}: PackagesTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSellOpen, setIsSellOpen] = useState(false);

  // Selling states
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientCountryCode, setFormClientCountryCode] = useState(business?.phoneCountryCode || '+971');
  const [formClientName, setFormClientName] = useState('');
  const [formCustomName, setFormCustomName] = useState('');
  const [formCustomPrice, setFormCustomPrice] = useState(0);
  const [formCustomSessions, setFormCustomSessions] = useState(5);
  const [formValidityDays, setFormValidityDays] = useState(60);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [useCustomPackage, setUseCustomPackage] = useState(false);

  // Client Selection helper
  const handleClientPhoneChange = (phoneInput: string) => {
    setFormClientPhone(phoneInput);
    const matchedClient = clients.find(c => c.phone === phoneInput);
    if (matchedClient) {
      setFormClientName(matchedClient.name);
    }
  };

  // Preset quick toggle handler
  const selectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    setUseCustomPackage(false);
    const preset = PRESET_PACKAGES[idx];
    setFormCustomName(preset.name);
    setFormCustomPrice(preset.price);
    setFormCustomSessions(preset.sessions);
    setFormValidityDays(preset.daysValidity);
  };

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientPhone || !formClientName) {
      alert('Please select or specify a client with valid 10-digit mobile number.');
      return;
    }

    const finalName = useCustomPackage ? formCustomName : PRESET_PACKAGES[selectedPresetIdx].name;
    const finalPrice = useCustomPackage ? formCustomPrice : PRESET_PACKAGES[selectedPresetIdx].price;
    const finalSessions = useCustomPackage ? formCustomSessions : PRESET_PACKAGES[selectedPresetIdx].sessions;
    const finalDays = useCustomPackage ? formValidityDays : PRESET_PACKAGES[selectedPresetIdx].daysValidity;

    if (!finalName || finalPrice <= 0 || finalSessions <= 0) {
      alert('Please specify a valid package name, sessions count and price.');
      return;
    }

    // Compute expiry ISO date
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + finalDays);
    const expiryStr = expDate.toISOString().split('T')[0];

    onSellPackage({
      name: finalName,
      clientPhone: formClientPhone,
      totalSessions: finalSessions,
      sessionsRemaining: finalSessions,
      price: finalPrice,
      expiryDate: expiryStr
    }, formPaymentMethod);

    // Reset and close
    setFormClientPhone('');
    setFormClientName('');
    setUseCustomPackage(false);
    setIsSellOpen(false);
  };

  // Filter package records based on search
  const filteredPackages = packages.filter(p => {
    const term = searchTerm.toLowerCase();
    const client = clients.find(c => c.phone === p.clientPhone);
    return (
      p.name.toLowerCase().includes(term) ||
      p.clientPhone.includes(term) ||
      (client && client.name.toLowerCase().includes(term))
    );
  });

  // Calculate status warning
  const getPackageStatus = (pkg: Package) => {
    const expDate = new Date(pkg.expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (pkg.sessionsRemaining === 0) {
      return { label: "Exhausted", color: "bg-red-100 text-red-800 border-red-200", isUrgent: true };
    }
    if (diffDays < 0) {
      return { label: "Expired", color: "bg-slate-100 text-slate-800 border-slate-200", isUrgent: false };
    }
    if (pkg.sessionsRemaining === 1) {
      return { label: "1 Session Left", color: "bg-amber-100 text-amber-800 border-amber-200 animate-pulse", isUrgent: true };
    }
    if (diffDays <= 7) {
      return { label: `Expiring soon (${diffDays}d)`, color: "bg-amber-100 text-amber-800 border-amber-200", isUrgent: true };
    }
    return { label: "Active", color: "bg-emerald-100 text-emerald-800 border-emerald-200", isUrgent: false };
  };

  return (
    <div className="space-y-4 pb-20" id="packages-tracker-root">
      
      {/* Top action header card */}
      <div className="premium-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Prepaid Memberships & Packages</h2>
          <p className="text-[11px] text-slate-500">Track remaining session credits for advanced billing.</p>
        </div>
        <button
          onClick={() => {
            selectPreset(0);
            setIsSellOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Sell Package Pass</span>
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input 
          type="text"
          placeholder="Search by client name, mobile or package..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-indigo-500 shadow-xs"
        />
      </div>

      {/* Main Packages Display List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPackages.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 p-12 text-center bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs font-medium">
            No package purchases logged yet matching "{searchTerm}"
          </div>
        ) : (
          filteredPackages.map(pkg => {
            const client = clients.find(c => c.phone === pkg.clientPhone);
            const status = getPackageStatus(pkg);
            
            // Build renewal nudge WhatsApp link
            const nudgeMsg = `Hi ${client ? client.name : 'Client'}, your package "${pkg.name}" is ${pkg.sessionsRemaining === 0 ? 'exhausted' : `almost completed (${pkg.sessionsRemaining} left)`}. Let us know when you would like to book or renew! - ${business.name}`;
            
            const nudgeLink = buildWhatsAppLink(pkg.clientPhone, nudgeMsg, business.phoneCountryCode || '971');

            return (
              <div 
                key={pkg.id} 
                id={`package-card-${pkg.id}`}
                className="premium-card p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight block truncate max-w-[160px]">
                      {pkg.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Purchased: {new Date(pkg.createdDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Client Reference */}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {client ? client.name : 'Unsaved Client'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      📱 {formatDisplayPhone(pkg.clientPhone, business.phoneCountryCode || '+971')}
                    </span>
                  </div>
                </div>

                {/* Balance Progress meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Sessions Balance</span>
                    <span className="text-indigo-600">{pkg.sessionsRemaining} / {pkg.totalSessions} sessions</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        pkg.sessionsRemaining === 0 
                          ? 'bg-red-500' 
                          : pkg.sessionsRemaining <= 1 
                          ? 'bg-amber-500 animate-pulse' 
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${(pkg.sessionsRemaining / pkg.totalSessions) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Footer Info & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Price Paid</span>
                    <span className="text-xs font-bold text-slate-900">{formatCurrency(pkg.price, business.currency || 'AED')}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-400 font-medium">
                      Val: {new Date(pkg.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    {status.isUrgent && (
                      <a
                        href={nudgeLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 py-1 rounded-lg"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>Nudge</span>
                      </a>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>


      {/* MODAL: SELL PACKAGE PASS */}
      {isSellOpen && (
        <div id="modal-sell-package" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Issue Prepaid Package</h3>
                <p className="text-[10px] text-slate-500">Collects upfront payment and creates credits.</p>
              </div>
              <button 
                onClick={() => setIsSellOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSellSubmit} className="p-4 space-y-4 overflow-y-auto">
              
              {/* Select Client Row */}
              <div className="space-y-1">
                <PhoneInput
                  id="package-client-phone"
                  label="Client Mobile Contact"
                  value={formClientPhone}
                  onChange={(val) => handleClientPhoneChange(val.replace(/\D/g, ''))}
                  countryCode={formClientCountryCode}
                  onCountryCodeChange={setFormClientCountryCode}
                  placeholder="50 123 4567"
                  required
                />
                {formClientPhone.length >= 7 && !clients.some(c => c.phone === formClientPhone) && (
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1">✨ New Client! Will create directory record automatically.</p>
                )}
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

              <hr className="border-slate-100" />

              {/* Toggle custom package option */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-800">Select Package Type</span>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomPackage(!useCustomPackage);
                    if (!useCustomPackage) {
                      // prefill custom fields
                      setFormCustomName("Custom 10-Session Combo");
                      setFormCustomPrice(800);
                      setFormCustomSessions(10);
                      setFormValidityDays(60);
                    }
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  {useCustomPackage ? "Use Standard Blueprints" : "Create Custom Package"}
                </button>
              </div>

              {!useCustomPackage ? (
                /* Preset Grid Selector */
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_PACKAGES.map((p, idx) => (
                    <div
                      key={p.name}
                      onClick={() => selectPreset(idx)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedPresetIdx === idx && !useCustomPackage
                          ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500'
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex justify-between font-bold text-xs">
                        <span className="text-slate-900">{p.name}</span>
                        <span className="text-indigo-600">{formatCurrency(p.price, business.currency || 'AED')}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{p.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                /* Custom inputs */
                <div className="space-y-3 p-3 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Custom Package Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. 8-Session Physio Pass"
                      value={formCustomName}
                      onChange={(e) => setFormCustomName(e.target.value)}
                      className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Price ({business.currency || 'AED'})</label>
                      <input 
                        type="number"
                        value={formCustomPrice}
                        onChange={(e) => setFormCustomPrice(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Sessions</label>
                      <input 
                        type="number"
                        value={formCustomSessions}
                        onChange={(e) => setFormCustomSessions(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Validity (Days)</label>
                      <input 
                        type="number"
                        value={formValidityDays}
                        onChange={(e) => setFormValidityDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <hr className="border-slate-100" />

              {/* Payment details Tagging */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Payment Collection Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['upi', 'cash', 'card'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormPaymentMethod(method)}
                      className={`py-2 text-center text-xs font-semibold rounded-xl border uppercase transition-all cursor-pointer ${
                        formPaymentMethod === method
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {method === 'upi' ? 'UPI' : method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Purchase & Collect upfront
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
