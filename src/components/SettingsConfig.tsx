import React, { useState } from 'react';
import { Business, Staff, BusinessType, Service, getBusinessEmoji } from '../types';
import SupabaseDiagnostic from './SupabaseDiagnostic';
import { 
  Building, 
  Users, 
  ShieldAlert, 
  Download, 
  Upload, 
  RefreshCw, 
  Clock, 
  Trash2, 
  Plus, 
  CheckCircle,
  HelpCircle,
  Database,
  Sparkles,
  Edit
} from 'lucide-react';

interface SettingsConfigProps {
  business: Business;
  staff: Staff[];
  onUpdateBusiness: (business: Business) => void;
  onAddStaff: (newStaff: Omit<Staff, 'id'>) => void;
  onDeleteStaff: (staffId: string) => void;
  onExportData: () => void;
  onImportData: (jsonData: string) => boolean;
  onResetToDemo: () => void;
  lastExportDate: string | null;
  // Multi-business portal additions
  businesses: Business[];
  activeBusinessId: string;
  onSwitchBusiness: (id: string) => void;
  onAddBusiness: (newB: Omit<Business, 'id'>) => void;
  onDeleteBusiness: (id: string) => void;
  // Supabase sync props
  supabaseStatus: { configured: boolean; url: string | null };
  isSyncing: boolean;
  onSync: () => void;
  syncError: string | null;
  syncSuccess: boolean;
  // Service management additions
  services: Service[];
  onAddService: (newService: Service) => void;
  onUpdateService: (originalName: string, updatedService: Service) => void;
  onDeleteService: (serviceName: string) => void;
}

const COLOR_PRESETS = [
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  "bg-orange-50 text-orange-700 border-orange-200"
];

interface SectorSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

const PRESET_SECTORS = [
  { id: 'spa', label: 'Spa & Wellness', emoji: '🌸' },
  { id: 'salon', label: 'Salon & Hair Studio', emoji: '💇' },
  { id: 'gym', label: 'Gym & Fitness Center', emoji: '🏋️' },
  { id: 'clinic', label: 'Clinic & Healthcare', emoji: '🩺' },
  { id: 'barber', label: 'Barber & Grooming', emoji: '🧔' },
  { id: 'massage', label: 'Massage & Therapy', emoji: '💆' },
  { id: 'nail', label: 'Nail Studio', emoji: '💅' },
  { id: 'yoga', label: 'Yoga & Pilates Studio', emoji: '🧘' },
  { id: 'petcare', label: 'Pet Care & Grooming', emoji: '🐾' },
  { id: 'consulting', label: 'Consulting & Coaching', emoji: '💼' },
  { id: 'education', label: 'Education & Tutoring', emoji: '🎓' },
  { id: 'photography', label: 'Photography & Studio', emoji: '📷' },
  { id: 'autodetailing', label: 'Auto Detailing & Care', emoji: '🚗' },
];

function BusinessSectorSelect({ value, onChange, className }: SectorSelectProps) {
  const normalizedValue = (value || '').toLowerCase().trim();
  const matchedPreset = PRESET_SECTORS.find(
    s => s.id === normalizedValue || s.label.toLowerCase() === normalizedValue
  );

  const isCustom = !matchedPreset && value !== '';
  const [selectedOption, setSelectedOption] = useState<string>(
    matchedPreset ? matchedPreset.id : isCustom ? 'custom' : 'salon'
  );

  React.useEffect(() => {
    const norm = (value || '').toLowerCase().trim();
    const found = PRESET_SECTORS.find(s => s.id === norm || s.label.toLowerCase() === norm);
    if (found) {
      setSelectedOption(found.id);
    } else if (value) {
      setSelectedOption('custom');
    }
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = e.target.value;
    setSelectedOption(opt);
    if (opt !== 'custom') {
      const preset = PRESET_SECTORS.find(s => s.id === opt);
      if (preset) {
        onChange(preset.id);
      }
    } else {
      if (PRESET_SECTORS.some(s => s.id === (value || '').toLowerCase())) {
        onChange('');
      }
    }
  };

  return (
    <div className="space-y-1.5">
      <select
        value={selectedOption}
        onChange={handleSelectChange}
        className={className}
      >
        <optgroup label="Popular Business Sectors">
          <option value="spa">🌸 Spa & Wellness</option>
          <option value="salon">💇 Salon & Hair Studio</option>
          <option value="gym">🏋️ Gym & Fitness Center</option>
          <option value="clinic">🩺 Clinic & Healthcare</option>
        </optgroup>
        <optgroup label="More Sectors">
          <option value="barber">🧔 Barber & Grooming</option>
          <option value="massage">💆 Massage & Therapy</option>
          <option value="nail">💅 Nail Studio</option>
          <option value="yoga">🧘 Yoga & Pilates Studio</option>
          <option value="petcare">🐾 Pet Care & Grooming</option>
          <option value="consulting">💼 Consulting & Coaching</option>
          <option value="education">🎓 Education & Tutoring</option>
          <option value="photography">📷 Photography & Studio</option>
          <option value="autodetailing">🚗 Auto Detailing & Care</option>
        </optgroup>
        <optgroup label="Custom">
          <option value="custom">✨ Other / Custom Sector...</option>
        </optgroup>
      </select>

      {selectedOption === 'custom' && (
        <input
          type="text"
          placeholder="Type custom business sector name..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          required
        />
      )}
    </div>
  );
}

export default function SettingsConfig({
  business,
  staff,
  onUpdateBusiness,
  onAddStaff,
  onDeleteStaff,
  onExportData,
  onImportData,
  onResetToDemo,
  lastExportDate,
  businesses,
  activeBusinessId,
  onSwitchBusiness,
  onAddBusiness,
  onDeleteBusiness,
  supabaseStatus,
  isSyncing,
  onSync,
  syncError,
  syncSuccess,
  services,
  onAddService,
  onUpdateService,
  onDeleteService
}: SettingsConfigProps) {
  
  // Business details state
  const [bName, setBName] = useState(business.name);
  const [bType, setBType] = useState<BusinessType>(business.type);
  const [bOwner, setBOwner] = useState(business.ownerName);
  const [bPhone, setBPhone] = useState(business.phone);
  const [bUpi, setBUpi] = useState(business.upiId || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

  // Sync inputs with currently selected active business
  React.useEffect(() => {
    setBName(business.name);
    setBType(business.type);
    setBOwner(business.ownerName);
    setBPhone(business.phone);
    setBUpi(business.upiId || '');
  }, [business]);

  // New business creation states
  const [isAddingBusiness, setIsAddingBusiness] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizType, setNewBizType] = useState<BusinessType>('salon');
  const [newBizOwner, setNewBizOwner] = useState('');
  const [newBizPhone, setNewBizPhone] = useState('');

  const handleAddBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName || !newBizOwner || !newBizPhone) {
      alert('Please fill out all business details.');
      return;
    }
    onAddBusiness({
      name: newBizName,
      type: newBizType,
      ownerName: newBizOwner,
      phone: newBizPhone,
      upiId: ''
    });
    // Reset form
    setNewBizName('');
    setNewBizType('salon');
    setNewBizOwner('');
    setNewBizPhone('');
    setIsAddingBusiness(false);
  };

  // New staff state
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sStart, setSStart] = useState('09:00');
  const [sEnd, setSEnd] = useState('20:00');
  const [sColorIdx, setSColorIdx] = useState(0);

  // Import state
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });

  // Service management states
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceName, setEditingServiceName] = useState<string | null>(null);
  const [servName, setServName] = useState('');
  const [servPrice, setServPrice] = useState('');
  const [servDuration, setServDuration] = useState('');
  const [servCategory, setServCategory] = useState('Hair');

  // Beautiful custom confirmation modal state (bypasses standard iFrame alert/confirm limitations)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servName.trim() || !servPrice || !servDuration) return;

    const parsedPrice = parseFloat(servPrice) || 0;
    const parsedDuration = parseInt(servDuration, 10) || 15;

    const newService: Service = {
      name: servName.trim(),
      price: parsedPrice,
      durationMinutes: parsedDuration,
      category: servCategory || 'Hair',
    };

    if (editingServiceName) {
      onUpdateService(editingServiceName, newService);
    } else {
      onAddService(newService);
    }

    // Reset form
    setServName('');
    setServPrice('');
    setServDuration('');
    setServCategory('Hair');
    setIsAddingService(false);
    setEditingServiceName(null);
  };

  const handleCancelServiceEdit = () => {
    setServName('');
    setServPrice('');
    setServDuration('');
    setServCategory('Hair');
    setIsAddingService(false);
    setEditingServiceName(null);
  };

  const handleStartEditService = (s: Service) => {
    setEditingServiceName(s.name);
    setServName(s.name);
    setServPrice(s.price.toString());
    setServDuration(s.durationMinutes.toString());
    setServCategory(s.category || 'Hair');
    setIsAddingService(true);
  };

  // Export status calculation
  const getDaysSinceLastExport = () => {
    if (!lastExportDate) return null;
    const last = new Date(lastExportDate);
    if (isNaN(last.getTime())) return null;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysSinceExport = getDaysSinceLastExport();
  const isBackupOverdue = lastExportDate === null || (daysSinceExport !== null && daysSinceExport >= 7);

  const handleUpdateBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusiness({
      id: business.id,
      name: bName,
      type: bType,
      ownerName: bOwner,
      phone: bPhone,
      upiId: bUpi
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName || !sRole) {
      alert('Please fill out the staff name and role details.');
      return;
    }

    onAddStaff({
      name: sName,
      role: sRole,
      workingHours: { start: sStart, end: sEnd },
      color: COLOR_PRESETS[sColorIdx]
    });

    // Reset
    setSName('');
    setSRole('');
    setSStart('09:00');
    setSEnd('20:00');
    setSColorIdx(0);
    setIsAddingStaff(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const success = onImportData(text);
        if (success) {
          setImportStatus({ type: 'success', msg: 'Schedule Database successfully imported! Page will reload shortly.' });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setImportStatus({ type: 'error', msg: 'Failed to parse JSON. Please ensure it is a valid Booking Backup file.' });
        }
      } catch (err) {
        setImportStatus({ type: 'error', msg: 'Invalid JSON backup format.' });
      }
    };
    reader.readAsText(file);
  };

  const triggerResetPrompt = () => {
    setConfirmModal({
      isOpen: true,
      title: "⚠️ DANGER ZONE: CLEAR DATABASE?",
      message: "Are you sure you want to clear your entire offline database, including all businesses, bookings, packages, staff, and client directories? This will completely wipe your local data to start with a fresh empty slate.",
      onConfirm: () => {
        onResetToDemo();
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-6 pb-20" id="settings-config-root">

      {/* Backup Reminder Prompt */}
      {isBackupOverdue && (
        <div id="backup-overdue-alert" className="premium-card p-5 bg-amber-50/70 border-amber-200/80 shadow-md text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-once">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shrink-0">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-amber-900 tracking-wide uppercase font-sans">
                ⚠️ DATA PROTECTION WARNING: BACKUP OVERDUE
              </h3>
              <p className="text-xs font-bold text-amber-950 mt-1 font-display">
                {lastExportDate 
                  ? `You haven't exported a schedule backup in ${daysSinceExport} days!` 
                  : "You have never exported a database backup!"}
              </p>
              <p className="text-[11px] text-amber-800/90 font-medium mt-0.5 leading-relaxed">
                Since Book App Portal runs completely offline, clearing your browser cookies or cache will erase your current client directories, packages, and ledger history. Export a secure .json database file now to prevent accidental data loss.
              </p>
            </div>
          </div>
          <button
            onClick={onExportData}
            className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4.5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Export Backup Now</span>
          </button>
        </div>
      )}
      
      {/* SECTION 0: MULTI-BUSINESS PORTAL MANAGER */}
      <div className="premium-card p-6 space-y-4" id="settings-multi-business-manager">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 font-display">
            <Building className="h-4.5 w-4.5 text-indigo-500" />
            <span>Multi-Business Portal Manager</span>
          </h2>
          <button
            type="button"
            onClick={() => setIsAddingBusiness(!isAddingBusiness)}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-100/50 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-indigo-100/50 transition-all"
          >
            {isAddingBusiness ? "Close Form" : "+ Create New Business"}
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Manage and run multiple separate business portals concurrently. Each business maintains its own independent staff list, calendar bookings, clients, prepaid packages, and payments ledger in high-speed offline local storage.
        </p>

        {/* Business Creation Form */}
        {isAddingBusiness && (
          <form onSubmit={handleAddBusinessSubmit} className="p-4 bg-slate-50/70 border border-slate-200/60 rounded-2xl space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-800">Configure New Business Portal</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Business Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Zen Salon & Spa"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Business Sector</label>
                <BusinessSectorSelect
                  value={newBizType}
                  onChange={setNewBizType}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Owner Full Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Amit Sen"
                  value={newBizOwner}
                  onChange={(e) => setNewBizOwner(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Contact Phone</label>
                <input 
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newBizPhone}
                  onChange={(e) => setNewBizPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
            >
              Initialize Business Portal
            </button>
          </form>
        )}

        {/* Existing Businesses List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {businesses.map(b => {
            const isActive = b.id === activeBusinessId;
            return (
              <div 
                key={b.id} 
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                  isActive 
                    ? 'bg-indigo-50/40 border-indigo-200 shadow-xs' 
                    : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-extrabold text-slate-900 font-display truncate max-w-[150px]">{b.name}</h4>
                      {isActive && (
                        <span className="bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold capitalize mt-1">
                      {getBusinessEmoji(b.type)} {b.type} • {b.ownerName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Phone: +91 {b.phone}
                    </p>
                  </div>

                  {!isActive && businesses.length > 1 && (
                    <button
                      type="button"
                      id={`delete-business-btn-${b.id}`}
                      title="Remove business portal"
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Delete Business Portal?",
                          message: `Are you sure you want to delete the business "${b.name}"? All of its staff settings, clients directories, packages, and payments records will be permanently deleted from your local offline storage.`,
                          onConfirm: () => onDeleteBusiness(b.id)
                        });
                      }}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border border-slate-150 bg-white shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50">
                  {isActive ? (
                    <span className="text-[10px] font-extrabold text-indigo-700 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Currently Managing</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSwitchBusiness(b.id)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10 text-slate-700 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer"
                    >
                      Switch to Portal
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: BUSINESS CONFIG */}
      <div className="premium-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Building className="h-4.5 w-4.5 text-indigo-500" />
          <span>Business Details</span>
        </h2>

        <form onSubmit={handleUpdateBusinessSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Business Name</label>
              <input 
                type="text"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Business Sector</label>
              <BusinessSectorSelect
                value={bType}
                onChange={setBType}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500 text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Owner Full Name</label>
              <input 
                type="text"
                value={bOwner}
                onChange={(e) => setBOwner(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Business Contact (Mobile)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                <input 
                  type="tel"
                  value={bPhone}
                  onChange={(e) => setBPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full pl-11 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Owner UPI ID (for Receipt QR Code)</label>
              <input 
                type="text"
                placeholder="e.g. name@upi or phone@upi"
                value={bUpi}
                onChange={(e) => setBUpi(e.target.value.trim())}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
              />
            </div>

          </div>

          <div className="flex items-center justify-between pt-1">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fade-in">
                <CheckCircle className="h-4 w-4" />
                <span>Saved business details successfully!</span>
              </span>
            )}
            <button
              type="submit"
              className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Update Business Profile
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: STAFF & RESOURCES MANAGEMENT */}
      <div className="premium-card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-indigo-500" />
            <span>Staff Slots & Chairs (Chairs, Stylists, Rooms)</span>
          </h2>
          <button
            onClick={() => setIsAddingStaff(!isAddingStaff)}
            className="text-xs text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-indigo-100/50"
          >
            {isAddingStaff ? "Close Form" : "+ Add Staff / Resource"}
          </button>
        </div>

        {/* Staff details creation form */}
        {isAddingStaff && (
          <form onSubmit={handleAddStaffSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-800">Add New Active Stylist / Resource Column</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Designation / Role (e.g. Hair Specialist, Spa Bed 2)</label>
                <input 
                  type="text"
                  placeholder="e.g. Senior Hairdresser"
                  value={sRole}
                  onChange={(e) => setSRole(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Work Shift Starts</label>
                <input 
                  type="time"
                  value={sStart}
                  onChange={(e) => setSStart(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Work Shift Ends</label>
                <input 
                  type="time"
                  value={sEnd}
                  onChange={(e) => setSEnd(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium"
                  required
                />
              </div>
            </div>

            {/* Color selection presets */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Calendar Card Theme</label>
              <div className="flex gap-2 flex-wrap pt-1">
                {COLOR_PRESETS.map((colorClass, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSColorIdx(idx)}
                    className={`h-7 w-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${colorClass} ${
                      sColorIdx === idx ? 'ring-2 ring-indigo-600 scale-105' : 'opacity-80'
                    }`}
                  >
                    🎨
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
            >
              Add Staff Column
            </button>
          </form>
        )}

        {/* Existing staff cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {staff.map(s => (
            <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-extrabold ${s.color}`}>
                  {s.name[0]}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{s.name}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{s.role}</p>
                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5 mt-0.5">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{s.workingHours.start} - {s.workingHours.end}</span>
                  </p>
                </div>
              </div>

              {staff.length > 1 && (
                <button
                  id={`remove-staff-btn-${s.id}`}
                  title="Remove column"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "Remove Staff Column?",
                      message: `Are you sure you want to remove ${s.name}? This will remove their column from the calendar grid.`,
                      onConfirm: () => onDeleteStaff(s.id)
                    });
                  }}
                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border border-slate-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2.3: SERVICES MANAGEMENT */}
      <div className="premium-card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
            <span>Services Directory</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              if (isAddingService) {
                handleCancelServiceEdit();
              } else {
                setIsAddingService(true);
              }
            }}
            className="text-xs text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-indigo-100/50"
          >
            {isAddingService ? "Close Form" : "+ Add Service"}
          </button>
        </div>

        {/* Service Creation or Editing Form */}
        {isAddingService && (
          <form onSubmit={handleServiceSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-800">
              {editingServiceName ? `Edit Service: ${editingServiceName}` : "Add New Business Service"}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Service Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Premium Haircut"
                  value={servName}
                  onChange={(e) => setServName(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Category</label>
                <select
                  value={servCategory}
                  onChange={(e) => setServCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                >
                  <option value="Hair">Hair 💇</option>
                  <option value="Spa">Spa 🌸</option>
                  <option value="Skin">Skin 🩺</option>
                  <option value="Massage">Massage 💆</option>
                  <option value="Fitness">Fitness 🏋️</option>
                  <option value="Therapy">Therapy 🩹</option>
                  <option value="Nails">Nails 💅</option>
                  <option value="Grooming">Grooming 🧔</option>
                  <option value="General">General 📦</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Price (INR ₹)</label>
                <input 
                  type="number"
                  placeholder="e.g. 500"
                  min="0"
                  value={servPrice}
                  onChange={(e) => setServPrice(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-500">Duration (Minutes)</label>
                <input 
                  type="number"
                  placeholder="e.g. 45"
                  min="5"
                  value={servDuration}
                  onChange={(e) => setServDuration(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:outline-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
              >
                {editingServiceName ? "Save Changes" : "Create Service"}
              </button>
              <button
                type="button"
                onClick={handleCancelServiceEdit}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Existing services grid list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services
            .filter(s => !(s as any).businessId || (s as any).businessId === activeBusinessId)
            .map(s => {
              const categoryEmoji = 
                s.category === 'Hair' ? '💇' :
                s.category === 'Spa' ? '🌸' :
                s.category === 'Skin' ? '🩺' :
                s.category === 'Massage' ? '💆' :
                s.category === 'Fitness' ? '🏋️' :
                s.category === 'Therapy' ? '🩹' :
                s.category === 'Nails' ? '💅' :
                s.category === 'Grooming' ? '🧔' : '📦';

              return (
                <div key={s.name} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider mb-1.5">
                        {categoryEmoji} {s.category || 'General'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={s.name}>{s.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5 mt-0.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{s.durationMinutes} minutes</span>
                      </p>
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 bg-white border border-slate-200/50 px-2 py-1 rounded-xl shadow-2xs shrink-0">
                      ₹{s.price}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-200/30">
                    <button
                      type="button"
                      id={`edit-service-btn-${s.name.replace(/\s+/g, '-').toLowerCase()}`}
                      title="Edit Service"
                      onClick={() => handleStartEditService(s)}
                      className="p-1 px-2.5 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 rounded-lg transition-colors cursor-pointer border border-slate-100 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      id={`delete-service-btn-${s.name.replace(/\s+/g, '-').toLowerCase()}`}
                      title="Remove Service"
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Remove Service?",
                          message: `Are you sure you want to remove the service "${s.name}"? This will permanently delete it from the directory.`,
                          onConfirm: () => onDeleteService(s.name)
                        });
                      }}
                      className="p-1 px-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border border-slate-100 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* SECTION 2.5: CLOUD SYNCHRONIZATION */}
      <div className="premium-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Database className="h-4.5 w-4.5 text-indigo-500" />
          <span>Supabase Cloud Sync</span>
        </h2>

        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Synchronize your local booking calendar, staff settings, clients, and payment ledger records with your cloud Supabase PostgreSQL database. This allows secure real-time multi-device collaboration.
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDiagnosticModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 text-xs font-bold py-2 px-3 rounded-xl transition-colors cursor-pointer"
          >
            <Database className="h-4 w-4 text-indigo-400" />
            <span>Open Connection Diagnostic Tool & Vercel Setup</span>
          </button>
        </div>

        {supabaseStatus.configured ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-bold text-emerald-950">Cloud Database Linked</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 select-all truncate max-w-[200px]">
                {supabaseStatus.url}
              </span>
            </div>

            <button
              onClick={onSync}
              disabled={isSyncing}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Synchronizing Database...</span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  <span>Sync Now (Two-way Push/Pull)</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-100/70 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs font-semibold leading-relaxed">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-extrabold">Cloud Sync Not Configured</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                To backup your bookings to Supabase PostgreSQL, make sure the <code className="bg-amber-100/60 px-1 py-0.5 rounded font-mono text-indigo-600">SUPABASE_URL</code> and <code className="bg-amber-100/60 px-1 py-0.5 rounded font-mono text-indigo-600">SUPABASE_KEY</code> environment variables are defined.
              </p>
            </div>
          </div>
        )}

        {syncError && (
          <div className="space-y-3 animate-fade-in">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 font-semibold leading-relaxed">
              ❌ {syncError}
            </div>

            {/* Schema migration assistance card */}
            {(syncError.toLowerCase().includes('user_id') || 
              syncError.toLowerCase().includes('column') || 
              syncError.toLowerCase().includes('table') || 
              syncError.toLowerCase().includes('relation') || 
              syncError.toLowerCase().includes('cache') || 
              syncError.toLowerCase().includes('constraint') || 
              syncError.toLowerCase().includes('businesses_type_check') || 
              syncError.toLowerCase().includes('missing')) && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3.5">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-600 animate-pulse" />
                  <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">🔧 Supabase Database Schema Setup Required</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Your Supabase project is missing tables or columns required for cloud sync. Copy and run the SQL below in your <b>Supabase SQL Editor</b> to set up or upgrade your database tables:
                </p>
                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-slate-200 text-[9px] font-mono rounded-xl overflow-x-auto max-h-40 leading-normal select-all">
{`-- ====================================================================
-- SUPABASE / POSTGRESQL SCHEMA FOR BOOK APP MULTI-BUSINESS BOOKING PORTAL
-- Run this schema in your Supabase project's SQL Editor to create tables.
-- ====================================================================

-- 1. Create Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    upi_id TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    working_hours JSONB NOT NULL, -- Format: {"start": "08:00", "end": "21:00"}
    color TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    created_date TEXT NOT NULL, -- Format: YYYY-MM-DD
    birthday TEXT,              -- Format: YYYY-MM-DD or MM-DD
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Prepaid Packages Table
CREATE TABLE IF NOT EXISTS public.packages (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    total_sessions INTEGER NOT NULL,
    sessions_remaining INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    expiry_date TEXT NOT NULL,   -- Format: YYYY-MM-DD
    created_date TEXT NOT NULL,  -- Format: YYYY-MM-DD
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Bookings (Appointments) Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    staff_id TEXT REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    service_name TEXT NOT NULL,
    date_time TEXT NOT NULL,     -- Format: YYYY-MM-DDTHH:MM
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'completed', 'no-show', 'cancelled')),
    notes TEXT,
    linked_package_id TEXT,      -- Can reference public.packages(id) optionally
    price NUMERIC NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Payments Ledger Table
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'card')),
    date TEXT NOT NULL,          -- Format: YYYY-MM-DD or ISO String
    type TEXT NOT NULL CHECK (type IN ('booking', 'package_purchase', 'manual_settlement')),
    linked_booking_id TEXT,      -- Can reference public.bookings(id) optionally
    linked_package_id TEXT,      -- Can reference public.packages(id) optionally
    status TEXT NOT NULL CHECK (status IN ('paid', 'due')),
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Services Directory Table
CREATE TABLE IF NOT EXISTS public.services (
    name TEXT NOT NULL,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    price NUMERIC NOT NULL,
    duration_minutes INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'Hair',
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (business_id, name)
);

-- ====================================================================
-- MIGRATION HELPERS FOR EXISTING TABLES
-- This ensures existing setups get the user_id column automatically
-- ====================================================================
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';

-- ====================================================================
-- ENHANCEMENTS: INDICES FOR OPTIMAL QUERY PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_packages_user_id ON public.packages(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);

CREATE INDEX IF NOT EXISTS idx_staff_business_id ON public.staff(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_id ON public.clients(business_id);
CREATE INDEX IF NOT EXISTS idx_packages_business_id ON public.packages(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) FOR USER ISOLATION
-- ====================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Drop existing general policies if any
DROP POLICY IF EXISTS "Allow all read operations" ON public.businesses;
DROP POLICY IF EXISTS "Allow all write operations" ON public.businesses;
DROP POLICY IF EXISTS "Allow all read operations" ON public.staff;
DROP POLICY IF EXISTS "Allow all write operations" ON public.staff;
DROP POLICY IF EXISTS "Allow all read operations" ON public.clients;
DROP POLICY IF EXISTS "Allow all write operations" ON public.clients;
DROP POLICY IF EXISTS "Allow all read operations" ON public.packages;
DROP POLICY IF EXISTS "Allow all write operations" ON public.packages;
DROP POLICY IF EXISTS "Allow all read operations" ON public.bookings;
DROP POLICY IF EXISTS "Allow all write operations" ON public.bookings;
DROP POLICY IF EXISTS "Allow all read operations" ON public.payments;
DROP POLICY IF EXISTS "Allow all write operations" ON public.payments;
DROP POLICY IF EXISTS "Allow all read operations" ON public.services;
DROP POLICY IF EXISTS "Allow all write operations" ON public.services;

DROP POLICY IF EXISTS "Allow read own data" ON public.businesses;
DROP POLICY IF EXISTS "Allow write own data" ON public.businesses;
DROP POLICY IF EXISTS "Allow read own data" ON public.staff;
DROP POLICY IF EXISTS "Allow write own data" ON public.staff;
DROP POLICY IF EXISTS "Allow read own data" ON public.clients;
DROP POLICY IF EXISTS "Allow write own data" ON public.clients;
DROP POLICY IF EXISTS "Allow read own data" ON public.packages;
DROP POLICY IF EXISTS "Allow write own data" ON public.packages;
DROP POLICY IF EXISTS "Allow read own data" ON public.bookings;
DROP POLICY IF EXISTS "Allow write own data" ON public.bookings;
DROP POLICY IF EXISTS "Allow read own data" ON public.payments;
DROP POLICY IF EXISTS "Allow write own data" ON public.payments;
DROP POLICY IF EXISTS "Allow read own data" ON public.services;
DROP POLICY IF EXISTS "Allow write own data" ON public.services;

-- Enable clean multi-tenant user isolation policies (casts auth.uid() to text to match user_id)
CREATE POLICY "Allow read own data" ON public.businesses FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.businesses FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.staff FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.staff FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.clients FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.clients FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.packages FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.packages FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.bookings FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.bookings FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.payments FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.payments FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.services FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.services FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');`}
                  </pre>
                  <button
                    onClick={() => {
                      const sqlText = `-- ====================================================================
-- SUPABASE / POSTGRESQL SCHEMA FOR BOOK APP MULTI-BUSINESS BOOKING PORTAL
-- Run this schema in your Supabase project's SQL Editor to create tables.
-- ====================================================================

-- 1. Create Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    upi_id TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    working_hours JSONB NOT NULL, -- Format: {"start": "08:00", "end": "21:00"}
    color TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    created_date TEXT NOT NULL, -- Format: YYYY-MM-DD
    birthday TEXT,              -- Format: YYYY-MM-DD or MM-DD
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Prepaid Packages Table
CREATE TABLE IF NOT EXISTS public.packages (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    total_sessions INTEGER NOT NULL,
    sessions_remaining INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    expiry_date TEXT NOT NULL,   -- Format: YYYY-MM-DD
    created_date TEXT NOT NULL,  -- Format: YYYY-MM-DD
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Bookings (Appointments) Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    staff_id TEXT REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    service_name TEXT NOT NULL,
    date_time TEXT NOT NULL,     -- Format: YYYY-MM-DDTHH:MM
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'completed', 'no-show', 'cancelled')),
    notes TEXT,
    linked_package_id TEXT,      -- Can reference public.packages(id) optionally
    price NUMERIC NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Payments Ledger Table
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'card')),
    date TEXT NOT NULL,          -- Format: YYYY-MM-DD or ISO String
    type TEXT NOT NULL CHECK (type IN ('booking', 'package_purchase', 'manual_settlement')),
    linked_booking_id TEXT,      -- Can reference public.bookings(id) optionally
    linked_package_id TEXT,      -- Can reference public.packages(id) optionally
    status TEXT NOT NULL CHECK (status IN ('paid', 'due')),
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Services Directory Table
CREATE TABLE IF NOT EXISTS public.services (
    name TEXT NOT NULL,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    price NUMERIC NOT NULL,
    duration_minutes INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'Hair',
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (business_id, name)
);

-- ====================================================================
-- MIGRATION HELPERS FOR EXISTING TABLES
-- This ensures existing setups get the user_id column automatically
-- ====================================================================
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';

-- ====================================================================
-- ENHANCEMENTS: INDICES FOR OPTIMAL QUERY PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_packages_user_id ON public.packages(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);

CREATE INDEX IF NOT EXISTS idx_staff_business_id ON public.staff(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_id ON public.clients(business_id);
CREATE INDEX IF NOT EXISTS idx_packages_business_id ON public.packages(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) FOR USER ISOLATION
-- ====================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Drop existing general policies if any
DROP POLICY IF EXISTS "Allow all read operations" ON public.businesses;
DROP POLICY IF EXISTS "Allow all write operations" ON public.businesses;
DROP POLICY IF EXISTS "Allow all read operations" ON public.staff;
DROP POLICY IF EXISTS "Allow all write operations" ON public.staff;
DROP POLICY IF EXISTS "Allow all read operations" ON public.clients;
DROP POLICY IF EXISTS "Allow all write operations" ON public.clients;
DROP POLICY IF EXISTS "Allow all read operations" ON public.packages;
DROP POLICY IF EXISTS "Allow all write operations" ON public.packages;
DROP POLICY IF EXISTS "Allow all read operations" ON public.bookings;
DROP POLICY IF EXISTS "Allow all write operations" ON public.bookings;
DROP POLICY IF EXISTS "Allow all read operations" ON public.payments;
DROP POLICY IF EXISTS "Allow all write operations" ON public.payments;
DROP POLICY IF EXISTS "Allow all read operations" ON public.services;
DROP POLICY IF EXISTS "Allow all write operations" ON public.services;

DROP POLICY IF EXISTS "Allow read own data" ON public.businesses;
DROP POLICY IF EXISTS "Allow write own data" ON public.businesses;
DROP POLICY IF EXISTS "Allow read own data" ON public.staff;
DROP POLICY IF EXISTS "Allow write own data" ON public.staff;
DROP POLICY IF EXISTS "Allow read own data" ON public.clients;
DROP POLICY IF EXISTS "Allow write own data" ON public.clients;
DROP POLICY IF EXISTS "Allow read own data" ON public.packages;
DROP POLICY IF EXISTS "Allow write own data" ON public.packages;
DROP POLICY IF EXISTS "Allow read own data" ON public.bookings;
DROP POLICY IF EXISTS "Allow write own data" ON public.bookings;
DROP POLICY IF EXISTS "Allow read own data" ON public.payments;
DROP POLICY IF EXISTS "Allow write own data" ON public.payments;
DROP POLICY IF EXISTS "Allow read own data" ON public.services;
DROP POLICY IF EXISTS "Allow write own data" ON public.services;

-- Enable clean multi-tenant user isolation policies (casts auth.uid() to text to match user_id)
CREATE POLICY "Allow read own data" ON public.businesses FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.businesses FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.staff FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.staff FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.clients FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.clients FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.packages FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.packages FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.bookings FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.bookings FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.payments FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.payments FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.services FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.services FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');`;
                      navigator.clipboard.writeText(sqlText);
                      alert("SQL Setup Schema copied to clipboard!");
                    }}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-slate-850 hover:bg-slate-750 text-white rounded-lg border border-slate-700 transition-all text-[9px] font-black cursor-pointer"
                    title="Copy to clipboard"
                  >
                    Copy SQL Schema Code
                  </button>
                </div>
                <div className="p-3 bg-indigo-100/30 rounded-xl text-[10px] text-slate-600 font-semibold space-y-1">
                  <p className="font-extrabold flex items-center gap-1 text-indigo-950">
                    <CheckCircle className="h-3.5 w-3.5 text-indigo-600" />
                    <span>How to apply this update:</span>
                  </p>
                  <ol className="list-decimal pl-4.5 space-y-1 text-slate-500 font-medium">
                    <li>Click the <b>Copy SQL Schema Code</b> button above to copy the complete setup script.</li>
                    <li>Open your <b>Supabase Dashboard</b> for this project.</li>
                    <li>Select the <b>SQL Editor</b> from the left navigation sidebar.</li>
                    <li>Click <b>New Query</b>, paste the copied SQL block, and hit <b>Run</b>.</li>
                    <li>Return here and click the <b>Start Syncing Database</b> button again!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {syncSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-semibold leading-relaxed">
            ✅ Cloud synchronization successfully completed! All records are in perfect harmony.
          </div>
        )}
      </div>

      {/* SECTION 3: SYSTEM DATA BACKUPS & HARD REBOOT */}
      <div className="premium-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="h-4.5 w-4.5 text-indigo-500" />
          <span>Local Storage Management & Data Protection</span>
        </h2>

        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Your client records and payment ledger are stored entirely inside your device's offline web cache. To protect your data, export a schedule backup daily, especially before clearing browser storage.
        </p>

        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-xs">
          <span className="font-bold text-slate-500">Last Database Export:</span>
          {lastExportDate ? (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
              isBackupOverdue 
                ? 'bg-amber-100 text-amber-800 border border-amber-200/50' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200/50'
            }`}>
              {new Date(lastExportDate).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} {isBackupOverdue ? `(${daysSinceExport} days ago - Overdue)` : '(Active)'}
            </span>
          ) : (
            <span className="bg-rose-100 text-rose-800 border border-rose-200/50 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
              Never Exported (Overdue)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Backup trigger */}
          <button
            onClick={onExportData}
            className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-4 w-4 text-indigo-600" />
            <span>Export Database (.json)</span>
          </button>

          {/* Import trigger */}
          <label className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs">
            <Upload className="h-4 w-4 text-indigo-600" />
            <span>Restore Backup (.json)</span>
            <input 
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        {importStatus.type !== 'idle' && (
          <div className={`p-3 rounded-xl text-xs font-semibold ${
            importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}>
            {importStatus.msg}
          </div>
        )}

        <hr className="border-slate-100" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50/20 border border-red-100 p-4 rounded-2xl">
          <div>
            <h4 className="text-xs font-extrabold text-red-950">System Diagnostics & Clear Data</h4>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Completely clear your offline database, bookings, packages, staff, and client directories to start with a fresh empty slate.</p>
          </div>
          <button
            onClick={triggerResetPrompt}
            className="inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Clear Offline Data</span>
          </button>
        </div>
      </div>

      {/* Beautiful, iframe-safe custom confirmation modal overlay */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="custom-confirm-modal">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="space-y-1.5 text-center">
              <h3 className="text-sm font-extrabold text-slate-900">{confirmModal.title}</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                id="modal-cancel-btn"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="modal-confirm-btn"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
