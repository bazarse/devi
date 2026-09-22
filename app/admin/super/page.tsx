'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  Users, 
  IndianRupee, 
  Plus, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Smartphone,
  ChevronRight,
  BarChart3,
  Store,
  Sparkles,
  Package,
  Layers,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getActiveStores, createStoreBranch, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import { 
  SalesDeal, 
  fetchSalesPipelineDeals, 
  subscribeToPipeline 
} from '@/lib/sales-pipeline';
import { REAL_STRUCTURED_STORE_1, REAL_STRUCTURED_STORE_2 } from '@/lib/real-inventory-data';
import confetti from 'canvas-confetti';

export default function SuperAdminDashboardPage() {
  const [branches, setBranches] = useState<StoreBranch[]>(DEFAULT_STORES);
  const [pipelineDeals, setPipelineDeals] = useState<SalesDeal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);

  // New Store Form State
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchSubtitle, setBranchSubtitle] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('Ujjain');
  const [branchState, setBranchState] = useState('Madhya Pradesh');
  const [branchPincode, setBranchPincode] = useState('456010');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchEmail, setBranchEmail] = useState('devi_intex@rediffmail.com');
  const [branchGstin, setBranchGstin] = useState('23ALGPK9135M1ZT');
  const [branchManager, setBranchManager] = useState('');
  const [isSavingStore, setIsSavingStore] = useState(false);

  // Load stores & pipeline from Supabase on mount
  useEffect(() => {
    async function loadStores() {
      setIsLoading(true);
      const stores = await getActiveStores();
      setBranches(stores);
      setIsLoading(false);
    }
    loadStores();
  }, []);

  // Real-time Pipeline Subscription
  useEffect(() => {
    let isMounted = true;
    async function syncPipeline() {
      const deals = await fetchSalesPipelineDeals();
      if (isMounted) setPipelineDeals(deals);
    }
    syncPipeline();

    const unsubscribe = subscribeToPipeline(() => {
      syncPipeline();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const pendingApprovalsCount = pipelineDeals.filter(d => d.status === 'pending_approval').length;

  // Real Stock Inventory Breakdown
  const store1StockUnits = REAL_STRUCTURED_STORE_1.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const store1Valuation = REAL_STRUCTURED_STORE_1.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.costPrice || item.sellingPrice || 0)), 0);
  const store1ModelsCount = REAL_STRUCTURED_STORE_1.length;

  const store2StockUnits = REAL_STRUCTURED_STORE_2.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const store2Valuation = REAL_STRUCTURED_STORE_2.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.costPrice || item.sellingPrice || 0)), 0);
  const store2ModelsCount = REAL_STRUCTURED_STORE_2.length;

  const totalStockUnits = store1StockUnits + store2StockUnits;
  const totalStockValuation = store1Valuation + store2Valuation;

  // Helper to get real stats for each store branch
  const getStoreStats = (code: string) => {
    const isStore1 = code === 'DM-01' || code === '1';
    const realUnits = isStore1 ? store1StockUnits : store2StockUnits;
    const realValuation = isStore1 ? store1Valuation : store2Valuation;
    const modelsCount = isStore1 ? store1ModelsCount : store2ModelsCount;

    const storeDeals = (pipelineDeals || []).filter(
      (d) => (d.storeId === code || (isStore1 && d.storeId === 'DM-01')) && d.status === 'approved'
    );
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const todaySales = storeDeals
      .filter((d) => d && (d.decidedAt || d.submittedAt || '').startsWith(todayStr))
      .reduce((sum, d) => sum + (Number(d?.finalPrice) || 0), 0);
    const monthSales = storeDeals.reduce((sum, d) => sum + (Number(d.finalPrice) || 0), 0);

    return {
      realUnits,
      realValuation,
      modelsCount,
      todaySales,
      monthSales
    };
  };

  const totalNetworkRevenue = branches.reduce((acc, b) => acc + getStoreStats(b.code).todaySales, 0);
  const totalMonthRevenue = branches.reduce((acc, b) => acc + getStoreStats(b.code).monthSales, 0);
  const totalStaffCount = branches.reduce((acc, b) => acc + (b.active_staff_count || 0), 0);

  // Handle Create New Store
  const handleAddBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchCode) return;

    setIsSavingStore(true);
    const newStore = await createStoreBranch({
      code: branchCode.toUpperCase(),
      name: branchName,
      subtitle: branchSubtitle || `${branchCity} Store Branch`,
      address: branchAddress,
      city: branchCity,
      state: branchState,
      pincode: branchPincode,
      phone: branchPhone || '+91 98932 64192',
      email: branchEmail,
      gstin: branchGstin,
      manager_name: branchManager || 'Branch Manager',
    });

    setBranches(prev => [...prev, newStore]);
    setIsSavingStore(false);
    setShowAddBranch(false);

    // Reset Form
    setBranchName('');
    setBranchCode('');
    setBranchSubtitle('');
    setBranchAddress('');
    setBranchPhone('');
    setBranchManager('');

    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (e) {}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Super Admin HQ • Multi-Store Governance</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Chain Overview & Store Management</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Create New Store Button */}
          <button
            type="button"
            onClick={() => setShowAddBranch(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Store</span>
          </button>
        </div>
      </div>

      {/* PENDING APPROVALS REAL-TIME ACTION BANNER */}
      {pendingApprovalsCount > 0 && (
        <Link
          href="/admin/super/approvals"
          className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/60 hover:border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md transition-all group animate-scaleUp"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/30 shrink-0">
              {pendingApprovalsCount}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-950 tracking-wider">
                  Action Required • Multi-Store Pipeline
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 animate-pulse">
                  Live Deals
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {pendingApprovalsCount} Sales Deal{pendingApprovalsCount > 1 ? 's' : ''} Awaiting HQ / Store Manager Approval
              </h3>
              <p className="text-xs text-slate-600">
                Click here to inspect customer details, finance schemes, discounts, and approve GST billing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 group-hover:translate-x-1 transition-transform self-end sm:self-center">
            <span>Open Approvals Desk</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
      )}

      {/* Network Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Active Physical Stores</span>
            <Building2 className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{branches.length} Stores</div>
          <div className="text-xs text-slate-500">Kanthal & Freeganj branches</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 bg-gradient-to-br from-emerald-50/60 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Total Today&apos;s Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{formatINR(totalNetworkRevenue)}</div>
          <div className="text-xs text-emerald-600 font-semibold">Across all {branches.length} branches</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Monthly Network Turnover</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-800">{formatINR(totalMonthRevenue)}</div>
          <div className="text-xs text-slate-500">Gross chain volume</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 bg-gradient-to-br from-blue-50/60 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase">Total Closing Stock</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900">{totalStockUnits.toLocaleString('en-IN')} Units</div>
          <div className="text-xs text-blue-700 font-bold">{formatINR(totalStockValuation)} Cost Valuation</div>
        </div>

      </div>

      {/* Individual Store Branch Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Physical Store Locations & Isolated Ledgers</h2>
            <p className="text-xs text-slate-500">Real-time inventory valuation, daily sales, and store-specific day books</p>
          </div>
          <span className="text-xs text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full">{branches.length} Stores Registered</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {branches.map((b) => {
            const stats = getStoreStats(b.code);
            return (
              <div
                key={b.code}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badge & Code */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-brand-50 text-brand-700 border border-brand-200 font-mono">
                        {b.code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Store
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{b.city}</span>
                  </div>

                  {/* Name & Subtitle */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{b.name}</h3>
                    {b.subtitle && <p className="text-xs text-brand-600 font-semibold">{b.subtitle}</p>}
                  </div>

                  {/* Address & Contact Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                      <span>{b.address}, {b.city} ({b.pincode})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{b.phone}</span>
                      <span className="text-slate-400">• Manager: {b.manager_name || 'Store Manager'}</span>
                    </div>
                  </div>

                  {/* Financial KPI Row — each card is clickable to its detail view */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <Link href="/admin/super/register" className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer block">
                      <div className="text-[10px] uppercase font-bold text-emerald-700">Today Sales</div>
                      <div className="text-sm font-black text-emerald-800">{formatINR(stats.todaySales)}</div>
                      <div className="text-[9px] text-emerald-600 font-semibold">Tap for day book →</div>
                    </Link>
                    <Link href="/admin/super/register" className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer block">
                      <div className="text-[10px] uppercase font-bold text-purple-700">Month Turn</div>
                      <div className="text-sm font-black text-purple-800">{formatINR(stats.monthSales)}</div>
                      <div className="text-[9px] text-purple-600 font-semibold">Tap for register →</div>
                    </Link>
                    <Link href="/admin/super/inventory" className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer block">
                      <div className="text-[10px] uppercase font-bold text-blue-700">Stock Count</div>
                      <div className="text-sm font-black text-blue-800">{stats.realUnits.toLocaleString('en-IN')} Units</div>
                      <div className="text-[9px] text-blue-600 font-semibold">{formatINR(stats.realValuation)} →</div>
                    </Link>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Link
                    href="/admin/store"
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold text-center transition-colors min-h-[40px] flex items-center justify-center gap-1.5"
                  >
                    <Store className="w-3.5 h-3.5 text-brand-600" />
                    <span>Open Store Admin</span>
                  </Link>
                  <Link
                    href="/admin/super/register"
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-colors min-h-[40px] flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Day Book</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: CREATE NEW STORE MODAL */}
      {showAddBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Create New Store Branch</h3>
                  <p className="text-xs text-slate-500">Sets up isolated database ledger & store code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBranch(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBranchSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Store Code (Unique) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DM-03"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ujjain / Indore"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Store Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Devi Mobile 3.0 (Nanakheda Branch)"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subtitle / Tagline (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Smartphone Experience Center & Accessories Hub"
                  value={branchSubtitle}
                  onChange={(e) => setBranchSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Physical Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Shop 5, Near Nanakheda Bus Stand, Sanwer Road, Ujjain"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="456010"
                    value={branchPincode}
                    onChange={(e) => setBranchPincode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Store Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="098932 64192"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Store Manager</label>
                  <input
                    type="text"
                    placeholder="e.g. Prince Verma"
                    value={branchManager}
                    onChange={(e) => setBranchManager(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Store GSTIN</label>
                  <input
                    type="text"
                    placeholder="23ALGPK9135M1ZT"
                    value={branchGstin}
                    onChange={(e) => setBranchGstin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBranch(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStore}
                  className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingStore ? 'Provisioning...' : 'Provision Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
