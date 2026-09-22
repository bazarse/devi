'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Building2, 
  Phone, 
  User, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Search, 
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  Trash2,
  Edit2,
  Sparkles,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { 
  FinanceProvider, 
  getStoreFinanceProviders, 
  toggleFinanceProvider, 
  saveFinanceProvider, 
  deleteFinanceProvider, 
  subscribeToFinance 
} from '@/lib/finance-service';
import confetti from 'canvas-confetti';
import ErrorBoundary from '@/components/error-boundary';

export default function StoreFinancePage() {
  const [activeStoreId, setActiveStoreId] = useState('DM-01');
  const [providers, setProviders] = useState<FinanceProvider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userPhone = sessionStorage.getItem('devi_user_phone') || localStorage.getItem('devi_user_phone') || '';
      const store = userPhone === '7828915933' ? 'DM-02' : (sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id') || 'DM-01');
      setActiveStoreId(store);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadProviders() {
      const list = await getStoreFinanceProviders(activeStoreId);
      if (isMounted) setProviders(list);
    }
    loadProviders();

    const unsub = subscribeToFinance(() => {
      loadProviders();
    });
    return unsub;
  }, [activeStoreId]);

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleFinanceProvider(id, !currentStatus);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    saveFinanceProvider({
      name: name.trim(),
      code: code.trim().toUpperCase() || name.trim().slice(0, 6).toUpperCase(),
      storeId: activeStoreId,
      merchantId: merchantId.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive: true
    });

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setShowAddModal(false);
    setName('');
    setCode('');
    setMerchantId('');
    setContactPerson('');
    setContactPhone('');
    setNotes('');
  };

  const filteredProviders = providers.filter(p => {
    if (!p) return false;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? Boolean(p.isActive) : !p.isActive);
    const q = (searchQuery || '').toLowerCase().trim();
    const name = String(p.name || '').toLowerCase();
    const code = String(p.code || '').toLowerCase();
    const contactPerson = String(p.contactPerson || '').toLowerCase();
    const merchantId = String(p.merchantId || '').toLowerCase();
    const matchesSearch = !q || 
      name.includes(q) || 
      code.includes(q) || 
      contactPerson.includes(q) || 
      merchantId.includes(q);
    return matchesStatus && matchesSearch;
  });

  const activeCount = providers.filter(p => p && p.isActive).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans pb-16">
      
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">
                Store {activeStoreId} ({activeStoreId === 'DM-02' ? 'Freeganj 2.0' : 'Kanthal Flagship'})
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                Live POS Integrated
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Finance & Bank Partners</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
            Branch: {activeStoreId} ({activeStoreId === 'DM-02' ? 'Freeganj' : 'Kanthal'})
          </span>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Finance Partner</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Total Tie-Ups</div>
          <div className="text-2xl font-black text-slate-900">{providers.length} Partners</div>
          <div className="text-[10px] text-slate-400">Configured for Branch {activeStoreId}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="text-xs font-bold text-emerald-700 uppercase">Active on POS Counter</div>
          <div className="text-2xl font-black text-emerald-700">{activeCount} Enabled</div>
          <div className="text-[10px] text-emerald-600 font-semibold">Available during billing</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Disabled / Off</div>
          <div className="text-2xl font-black text-slate-500">{providers.length - activeCount} Banks</div>
          <div className="text-[10px] text-slate-400">Hidden from salesman</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Current Branch</div>
          <div className="text-2xl font-black text-blue-700">{activeStoreId}</div>
          <div className="text-[10px] text-slate-400">{activeStoreId === 'DM-02' ? 'Freeganj Branch' : 'Kanthal Flagship'}</div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bank name, code, merchant ID or DSA executive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                statusFilter === tab 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'ALL' ? 'All Partners' : tab === 'ACTIVE' ? 'Active Only' : 'Inactive Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Cards Grid */}
      <ErrorBoundary title="Finance Providers" description="Unable to display finance partner accounts due to a localized issue. Please retry.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map(p => (
            <div
              key={p.id}
              className={`bg-white rounded-3xl border p-5 space-y-4 shadow-sm transition-all flex flex-col justify-between ${
                p.isActive ? 'border-slate-200 hover:border-brand-300' : 'border-slate-200 bg-slate-50/50 opacity-75'
              }`}
            >
              <div className="space-y-3">
                {/* Top Bar */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-mono font-bold">
                    CODE: {p.code}
                  </span>

                  {/* 1-Tap Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggle(p.id, p.isActive)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all min-h-[36px] ${
                      p.isActive 
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {p.isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Active on POS</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Partner Name & Terminal Code */}
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>{p.name}</span>
                  </h3>
                  {p.merchantId && (
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Terminal / MID: <span className="font-bold text-slate-800">{p.merchantId}</span>
                    </div>
                  )}
                </div>

                {/* DSA Executive Contact */}
                {(p.contactPerson || p.contactPhone) && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">DSA Field Executive</span>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{p.contactPerson || 'Store Field Representative'}</span>
                      {p.contactPhone && (
                        <a
                          href={`tel:${p.contactPhone || ''}`}
                          className="text-brand-600 hover:text-brand-800 font-bold flex items-center gap-1 bg-brand-50 px-2.5 py-1 rounded-lg min-h-[36px]"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{p.contactPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {p.notes && (
                  <p className="text-[11px] text-slate-500 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    {p.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleToggle(p.id, p.isActive)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800"
                >
                  {p.isActive ? 'Turn Off for Store' : 'Turn On for Store'}
                </button>

                <button
                  type="button"
                  onClick={() => deleteFinanceProvider(p.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Remove Partner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ErrorBoundary>

      {/* ADD FINANCE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Finance / Bank Partner</h3>
                  <span className="text-xs text-slate-500">Configuring for Store {activeStoreId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bank / Finance Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kotak Mahindra Smart Finance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Short Code</label>
                  <input
                    type="text"
                    placeholder="e.g. KOTAK"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Merchant / POS MID</label>
                  <input
                    type="text"
                    placeholder="e.g. MID-998822"
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">DSA Executive Name</label>
                  <input
                    type="text"
                    placeholder="Field contact name"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Executive Phone</label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Scheme Details</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 0% EMI scheme available on Samsung and Apple"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
