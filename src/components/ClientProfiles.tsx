import React, { useState } from 'react';
import { Client, Booking, Package, Payment, Business } from '../types';
import PhoneInput from './PhoneInput';
import { formatCurrency, formatDisplayPhone, buildWhatsAppLink } from '../utils/countryUtils';
import { 
  Search, 
  UserPlus, 
  Phone, 
  FileText, 
  Calendar, 
  Ticket, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle, 
  Edit3, 
  MessageSquare,
  Sparkles,
  AlertCircle,
  Cake
} from 'lucide-react';

interface ClientProfilesProps {
  clients: Client[];
  bookings: Booking[];
  packages: Package[];
  payments: Payment[];
  onAddClient: (client: Omit<Client, 'id' | 'createdDate'>) => void;
  onUpdateClientNotes: (clientId: string, notes: string) => void;
  onUpdateClient: (client: Client) => void;
  onSettleDues: (clientPhone: string, amount: number, method: 'cash' | 'upi' | 'card') => void;
  business?: Business;
  isSyncing?: boolean;
}

export default function ClientProfiles({
  clients,
  bookings,
  packages,
  payments,
  onAddClient,
  onUpdateClientNotes,
  onUpdateClient,
  onSettleDues,
  business = { id: "biz-1", name: "Book App", type: "salon", ownerName: "Owner", phone: "9876543210" },
  isSyncing = false
}: ClientProfilesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  type SortOption = 'recent_booking' | 'visits_count' | 'total_spent' | 'name';
  const [sortBy, setSortBy] = useState<SortOption>('recent_booking');

  // Helpers for sorting calculations
  const getLatestBookingTime = (phone: string): string => {
    const clientBookings = bookings.filter(b => b.clientPhone === phone);
    if (clientBookings.length === 0) return '0000-00-00T00:00';
    const sorted = [...clientBookings].sort((a, b) => b.dateTime.localeCompare(a.dateTime));
    return sorted[0].dateTime;
  };

  const getClientTotalSpent = (phone: string): number => {
    return payments
      .filter(p => p.clientPhone === phone && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getClientTotalVisits = (phone: string): number => {
    return bookings.filter(b => b.clientPhone === phone && b.status === 'completed').length;
  };
  
  // Create client form states
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCountryCode, setNewClientCountryCode] = useState(business?.phoneCountryCode || '+971');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [newClientBirthday, setNewClientBirthday] = useState('');

  // Editing client form states
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientCountryCode, setEditClientCountryCode] = useState(business?.phoneCountryCode || '+971');
  const [editClientNotes, setEditClientNotes] = useState('');
  const [editClientBirthday, setEditClientBirthday] = useState('');

  // Editing notes state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');

  // Settle dues form state
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [isSettleOpen, setIsSettleOpen] = useState(false);

  // Search filter
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.phone.includes(term);
  });

  // Sort filtered clients dynamically
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'recent_booking') {
      const timeA = getLatestBookingTime(a.phone);
      const timeB = getLatestBookingTime(b.phone);
      if (timeB === timeA) {
        return a.name.localeCompare(b.name);
      }
      return timeB.localeCompare(timeA);
    }
    if (sortBy === 'visits_count') {
      const countA = getClientTotalVisits(a.phone);
      const countB = getClientTotalVisits(b.phone);
      if (countB === countA) {
        return a.name.localeCompare(b.name);
      }
      return countB - countA;
    }
    if (sortBy === 'total_spent') {
      const spentA = getClientTotalSpent(a.phone);
      const spentB = getClientTotalSpent(b.phone);
      if (spentB === spentA) {
        return a.name.localeCompare(b.name);
      }
      return spentB - spentA;
    }
    return a.name.localeCompare(b.name);
  });

  // Calculate stats for a single client
  const getClientStats = (clientPhone: string) => {
    const clientBookings = bookings.filter(b => b.clientPhone === clientPhone);
    const completedBookings = clientBookings.filter(b => b.status === 'completed');
    const clientPkgs = packages.filter(p => p.clientPhone === clientPhone);
    const clientPayments = payments.filter(p => p.clientPhone === clientPhone);

    // Dues (Unpaid payments)
    const totalDues = clientPayments
      .filter(p => p.status === 'due')
      .reduce((sum, p) => sum + p.amount, 0);

    // Total spent (Paid payments)
    const totalSpent = clientPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalVisits: completedBookings.length,
      upcomingVisits: clientBookings.filter(b => b.status === 'confirmed').length,
      activePackages: clientPkgs.filter(p => p.sessionsRemaining > 0).length,
      totalDues,
      totalSpent,
      history: clientBookings.sort((a, b) => b.dateTime.localeCompare(a.dateTime)),
      pkgs: clientPkgs
    };
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientPhone) {
      alert('Please fill out client name and mobile number.');
      return;
    }
    
    // Check duplication
    if (clients.some(c => c.phone === newClientPhone)) {
      alert('A client with this phone number already exists.');
      return;
    }

    onAddClient({
      name: newClientName,
      phone: newClientPhone,
      notes: newClientNotes,
      birthday: newClientBirthday || undefined
    });

    // Reset and close
    setNewClientName('');
    setNewClientPhone('');
    setNewClientNotes('');
    setNewClientBirthday('');
    setIsAddClientOpen(false);
  };

  const startEditClient = (client: Client) => {
    setEditClientName(client.name);
    setEditClientPhone(client.phone);
    setEditClientNotes(client.notes || '');
    setEditClientBirthday(client.birthday || '');
    setIsEditClientOpen(true);
  };

  const handleEditClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    if (!editClientName || !editClientPhone) {
      alert('Please fill out client name and mobile number.');
      return;
    }

    // Check duplication (allow same phone for the current client we are editing)
    if (clients.some(c => c.phone === editClientPhone && c.id !== selectedClient.id)) {
      alert('Another client with this phone number already exists.');
      return;
    }

    const updatedC: Client = {
      ...selectedClient,
      name: editClientName,
      phone: editClientPhone,
      notes: editClientNotes,
      birthday: editClientBirthday || undefined
    };

    onUpdateClient(updatedC);
    setSelectedClient(updatedC);
    setIsEditClientOpen(false);
  };

  const startEditNotes = (client: Client) => {
    setEditedNotes(client.notes);
    setIsEditingNotes(true);
  };

  const handleSaveNotes = (clientId: string) => {
    onUpdateClientNotes(clientId, editedNotes);
    setIsEditingNotes(false);
    // Refresh selected client copy
    const updated = clients.find(c => c.id === clientId);
    if (updated) {
      setSelectedClient({ ...updated, notes: editedNotes });
    }
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || settleAmount <= 0) return;
    
    onSettleDues(selectedClient.phone, settleAmount, settleMethod);
    setIsSettleOpen(false);
    setSettleAmount(0);
    
    // Refresh selected client calculations
    const updated = clients.find(c => c.id === selectedClient.id);
    if (updated) setSelectedClient(updated);
  };

  // WhatsApp Nudge wrapper
  const handleWhatsAppChat = (client: Client, message: string) => {
    const link = buildWhatsAppLink(client.phone, message, business?.phoneCountryCode || '971');
    window.open(link, '_blank');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20" id="client-profiles-root">
      
      {/* LEFT COLUMN: CLIENT SEARCH & DIRECTORY LIST */}
      <div className="md:col-span-1 space-y-4">
        
        {/* Search header & action */}
        <div className="premium-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Directory ({clients.length})</h2>
            <button
              onClick={() => setIsAddClientOpen(true)}
              className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Client</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name or 10-digit phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
            />
          </div>

          {/* Sorting selection controls */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sort List By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-indigo-500 cursor-pointer"
            >
              <option value="recent_booking">🕒 Recent Booking</option>
              <option value="visits_count">🔥 Most Visits</option>
              <option value="total_spent">💰 Highest Spender</option>
              <option value="name">🔤 Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Directory List Scrollbox */}
        <div className="space-y-2 max-h-[450px] overflow-y-auto">
          {sortedClients.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs font-medium">
              No clients found matching "{searchTerm}"
            </div>
          ) : (
            sortedClients.map(c => {
              const stats = getClientStats(c.phone);
              const isSelected = selectedClient?.id === c.id;
              
              return (
                <div
                  key={c.id}
                  id={`client-card-${c.id}`}
                  onClick={() => setSelectedClient(c)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-xs' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">📱 {formatDisplayPhone(c.phone, business?.phoneCountryCode || '+971')}</p>
                      
                      {(() => {
                        const latestTime = getLatestBookingTime(c.phone);
                        if (latestTime !== '0000-00-00T00:00') {
                          const dStr = new Date(latestTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                          return (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50/70 border border-indigo-100/30 px-2 py-0.5 rounded-lg mt-2 w-fit">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                              <span>Recent: {dStr}</span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 mt-2 w-fit">
                            <Calendar className="h-3.5 w-3.5 text-slate-300" />
                            <span>No bookings yet</span>
                          </div>
                        );
                      })()}
                    </div>
                    {stats.totalDues > 0 && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                        Due: {formatCurrency(stats.totalDues, business?.currency || 'AED')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/50 text-[10px] font-semibold text-slate-400">
                    <span>{stats.totalVisits} Visits</span>
                    {stats.activePackages > 0 && (
                      <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                        {stats.activePackages} Active Pkgs
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: CLIENT VISIT HISTORY & DETAILS PANEL */}
      <div className="md:col-span-2 space-y-4">
        {selectedClient ? (
          (() => {
            const stats = getClientStats(selectedClient.phone);
            return (
              <div id="client-details-card" className="premium-card p-6 space-y-6">
                
                {/* Client Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Client Profile</span>
                    <h2 className="text-xl font-bold text-slate-950 mt-0.5">{selectedClient.name}</h2>
                    <p className="text-xs text-slate-600 font-semibold mt-1 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatDisplayPhone(selectedClient.phone, business?.phoneCountryCode || '+971')}</span>
                    </p>
                    {selectedClient.birthday && (
                      <p className="text-[11px] text-indigo-600 font-extrabold mt-1.5 flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-100/40 w-fit px-2.5 py-1 rounded-xl">
                        <Cake className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Birthday: {new Date(selectedClient.birthday).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEditClient(selectedClient)}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer border border-slate-200/50"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={() => handleWhatsAppChat(selectedClient, `Hi ${selectedClient.name}, just checking in from ${business.name}! Hope you are doing great.`)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>WhatsApp Hello</span>
                    </button>
                    {stats.totalDues > 0 && (
                      <button
                        onClick={() => {
                          setSettleAmount(stats.totalDues);
                          setIsSettleOpen(true);
                        }}
                        className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Settle Dues</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid Financial & Visit KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Spent</span>
                    <p className="text-sm font-bold text-slate-900 mt-1">₹{stats.totalSpent.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Dues</span>
                    <p className={`text-sm font-bold mt-1 ${stats.totalDues > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      ₹{stats.totalDues}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Visits (Done)</span>
                    <p className="text-sm font-bold text-slate-900 mt-1">{stats.totalVisits}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Active Packages</span>
                    <p className="text-sm font-bold text-indigo-600 mt-1">{stats.activePackages}</p>
                  </div>
                </div>

                {/* Preferences / Medical Notes Box */}
                <div className="p-3.5 bg-indigo-50/30 rounded-xl border border-indigo-100/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Preferences & Sensitivities Notes</span>
                    </h4>
                    {!isEditingNotes ? (
                      <button 
                        onClick={() => startEditNotes(selectedClient)}
                        className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSaveNotes(selectedClient.id)}
                        className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Save Notes
                      </button>
                    )}
                  </div>

                  {!isEditingNotes ? (
                    <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                      {selectedClient.notes ? `"${selectedClient.notes}"` : "No notes specified yet. Add allergies or styling preferences here."}
                    </p>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-medium focus:outline-indigo-500"
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {/* Sub-section: Active Packages Balance */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Ticket className="h-4 w-4 text-slate-400" />
                    <span>Active Package Subscriptions</span>
                  </h3>

                  {stats.pkgs.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-6">No package subscriptions logged.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                      {stats.pkgs.map(pkg => (
                        <div key={pkg.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block truncate max-w-[150px]">{pkg.name}</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Expiry: {new Date(pkg.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                              {pkg.sessionsRemaining} left
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-1">of {pkg.totalSessions} sessions</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-section: Visit logs timeline */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Full Appointment History ({stats.history.length})</span>
                  </h3>

                  {stats.history.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-6">No previous visits logged.</p>
                  ) : (
                    <div className="space-y-2.5 pl-6 max-h-[250px] overflow-y-auto pr-1">
                      {stats.history.map(h => (
                        <div key={h.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-950">{h.serviceName}</div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {new Date(h.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {
                                new Date(h.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                              }
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 block">
                              {h.linkedPackageId ? 'Package Session' : `₹${h.price}`}
                            </span>
                            <span className={`inline-block text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                              h.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {h.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })()
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-150 text-center h-full">
            <UserPlus className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-800">Select Client Profile</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Click any client in the left pane to examine visit timeline, package usage, allergic warnings, and record outstanding due settlements.
            </p>
          </div>
        )}
      </div>


      {/* MODAL: ADD NEW CLIENT */}
      {isAddClientOpen && (
        <div id="modal-add-client" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add New Client</h3>
              <button 
                onClick={() => setIsAddClientOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Full Name (Required)</label>
                <input 
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  required
                />
              </div>

              <PhoneInput
                id="new-client-phone"
                label="Mobile Contact Number"
                value={newClientPhone}
                onChange={(val) => setNewClientPhone(val.replace(/\D/g, ''))}
                countryCode={newClientCountryCode}
                onCountryCodeChange={setNewClientCountryCode}
                placeholder="50 123 4567"
                required
              />

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Notes (Allergies, Hair Type, Preferences)</label>
                <textarea 
                  placeholder="e.g. Allergic to Eucalyptus oil, prefers Imran"
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Birthday (Optional)</label>
                <input 
                  type="date"
                  value={newClientBirthday}
                  onChange={(e) => setNewClientBirthday(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <button
                id="submit-add-client"
                type="submit"
                disabled={isSyncing}
                className={`w-full text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  isSyncing 
                    ? 'bg-slate-400 text-slate-100 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving Client Profile...</span>
                  </>
                ) : (
                  <span>Save Client Profile</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT EXISTING CLIENT */}
      {isEditClientOpen && selectedClient && (
        <div id="modal-edit-client" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Edit Client Profile</h3>
              <button 
                onClick={() => setIsEditClientOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditClientSubmit} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Full Name (Required)</label>
                <input 
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  required
                />
              </div>

              <PhoneInput
                id="edit-client-phone"
                label="Mobile Contact Number"
                value={editClientPhone}
                onChange={(val) => setEditClientPhone(val.replace(/\D/g, ''))}
                countryCode={editClientCountryCode}
                onCountryCodeChange={setEditClientCountryCode}
                placeholder="50 123 4567"
                required
              />

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Notes (Allergies, Hair Type, Preferences)</label>
                <textarea 
                  placeholder="e.g. Allergic to Eucalyptus oil, prefers Imran"
                  value={editClientNotes}
                  onChange={(e) => setEditClientNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Birthday (Optional)</label>
                <input 
                  type="date"
                  value={editClientBirthday}
                  onChange={(e) => setEditClientBirthday(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <button
                id="submit-edit-client"
                type="submit"
                disabled={isSyncing}
                className={`w-full text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  isSyncing 
                    ? 'bg-slate-400 text-slate-100 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Updating Client Profile...</span>
                  </>
                ) : (
                  <span>Update Client Profile</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* MODAL: DU DUE SETTLEMENT */}
      {isSettleOpen && selectedClient && (
        <div id="modal-settle-dues" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xs w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Settle Outstanding Dues</h3>
              <button 
                onClick={() => setIsSettleOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="p-4 space-y-4">
              <div className="space-y-1 bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl text-xs">
                <span className="font-semibold text-slate-500 block">Total Due:</span>
                <span className="text-lg font-bold text-rose-600 block">
                  ₹{getClientStats(selectedClient.phone).totalDues}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Settle Amount (₹)</label>
                <input 
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Payment Channel</label>
                <select
                  value={settleMethod}
                  onChange={(e: any) => setSettleMethod(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500"
                  required
                >
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="cash">Cash Handover</option>
                  <option value="card">Card swipe</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Confirm Settlement Received
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
