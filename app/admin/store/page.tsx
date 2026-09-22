'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store as StoreIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  IndianRupee, 
  Smartphone, 
  Wrench, 
  AlertTriangle, 
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  UploadCloud,
  Target,
  Package,
  Pencil,
  Search,
  Receipt,
  Eye,
  X,
  ShieldCheck,
  Gift
} from 'lucide-react';
import { formatINR, formatDateTime } from '@/lib/utils';
import { 
  SalesDeal, 
  fetchSalesPipelineDeals, 
  updateDealStatusInPipeline, 
  editDealInPipeline, 
  subscribeToPipeline 
} from '@/lib/sales-pipeline';
import { REAL_STRUCTURED_STORE_1, REAL_STRUCTURED_STORE_2 } from '@/lib/real-inventory-data';
import confetti from 'canvas-confetti';
import { getStaffUsers } from '@/lib/staff-service';
import InvoiceModal from '@/components/invoice-modal';
import DealPaymentBreakdown from '@/components/deal-payment-breakdown';
import { InvoiceData } from '@/lib/invoice-generator';

export default function StoreAdminDashboardPage() {
  const [activeStoreId, setActiveStoreId] = useState('DM-01');
  const [allDeals, setAllDeals] = useState<SalesDeal[]>([]);
  const [pendingQueue, setPendingQueue] = useState<SalesDeal[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [staffCount, setStaffCount] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editingDeal, setEditingDeal] = useState<SalesDeal | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editImei, setEditImei] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending_approval' | 'approved' | 'rejected' | 'ALL'>('pending_approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [viewingDeal, setViewingDeal] = useState<SalesDeal | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const store = sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id') || localStorage.getItem('devi_active_store') || 'DM-01';
      setActiveStoreId(store);
    }
  }, []);

  useEffect(() => {
    async function loadStaff() {
      const users = await getStaffUsers(activeStoreId);
      setStaffCount(users.length || 1);
    }
    loadStaff();
  }, [activeStoreId]);

  useEffect(() => {
    let isMounted = true;
    async function syncStorePipeline() {
      const deals = await fetchSalesPipelineDeals({ storeId: activeStoreId });
      if (isMounted) {
        setAllDeals(deals);
        setPendingQueue(deals.filter(d => d.status === 'pending_approval'));
        setApprovedCount(deals.filter(d => d.status === 'approved').length);
      }
    }
    syncStorePipeline();

    const unsubscribe = subscribeToPipeline(() => {
      syncStorePipeline();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeStoreId]);

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayApprovedDeals = allDeals.filter(d => 
    d && d.status === 'approved' && 
    (d.decidedAt || d.submittedAt || '').startsWith(todayStr)
  );
  const todayRevenue = todayApprovedDeals.reduce((acc, d) => acc + (Number(d?.finalPrice) || 0), 0);

  const pendingCount = allDeals.filter(d => d.status === 'pending_approval').length;
  const storeApprovedCount = allDeals.filter(d => d.status === 'approved').length;
  const rejectedCount = allDeals.filter(d => d.status === 'rejected').length;
  const totalRecordsCount = allDeals.length;

  const filteredDeals = allDeals.filter(d => {
    // 1. Status Filter
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;

    // 2. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const token = (d.token || d.id || '').toLowerCase();
      const billNo = (d.billNumber || `25-26/${String(d.token || d.id || '').replace('SA-', '')}/DEVI`).toLowerCase();
      const match =
        token.includes(q) ||
        billNo.includes(q) ||
        (d.customerName || '').toLowerCase().includes(q) ||
        (d.customerPhone || '').includes(q) ||
        (d.productName || '').toLowerCase().includes(q) ||
        (d.imeiSerial || '').includes(q) ||
        (d.salesPersonName || '').toLowerCase().includes(q) ||
        (d.decidedBy || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const handleOpenInvoice = (sale: SalesDeal) => {
    const isDm02 = activeStoreId === 'DM-02';
    const inv: InvoiceData = {
      invoiceNo: sale.billNumber || `25-26/${String(sale.token || sale.id || '').replace('SA-', '')}/DEVI`,
      invoiceDate: new Date(sale.decidedAt || sale.submittedAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      refNo: sale.salesPersonName || 'STAFF',
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerAddress: sale.customerAddress || (isDm02 ? 'Freeganj, Ujjain, Madhya Pradesh' : 'Kanthal, Ujjain, Madhya Pradesh'),
      partyName: sale.paymentMethod === 'EMI' ? (sale.financeProvider || 'BAJAJ FINANCE LIMITED') : sale.customerName,
      productName: sale.productName,
      hsnCode: '85171290',
      imeiNumber: sale.imeiSerial,
      quantity: 1,
      rateInclTax: sale.finalPrice,
      basePrice: (sale.basePrice && sale.basePrice > 0) ? sale.basePrice : ((sale as any).product_price || (sale as any).mrp || 0),
      paymentMethod: sale.paymentMethod,
      financeProvider: sale.financeProvider || undefined,
      storeName: isDm02 ? 'DEVI MOBILE (FREEGANJ 2.0)' : 'DEVI MOBILE ACCESSORIES',
      storeAddress: isDm02 ? 'SHOP 4, TOWER CHOWK, FREEGANJ, UJJAIN 456010' : '206/1, KANTHAL CHAURAHA, ANKPAT MARG, UJJAIN 456006',
      storeGstin: '23ALGPK9135M1ZT',
      storePhone: isDm02 ? '7828915933, 9893264192' : '9713001600, 6262335656, 9893264192'
    };
    setSelectedInvoice(inv);
  };

  const handleApprove = async (id: string) => {
    const adminName = typeof window !== 'undefined' ? (sessionStorage.getItem('devi_user_name') || 'Store Manager') : 'Store Manager';
    setPendingQueue(prev => prev.filter(i => i.id !== id));
    setApprovedCount(prev => prev + 1);
    await updateDealStatusInPipeline(id, 'approved', adminName);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    const adminName = typeof window !== 'undefined' ? (sessionStorage.getItem('devi_user_name') || 'Store Manager') : 'Store Manager';
    const targetId = rejectingId;
    setPendingQueue(prev => prev.filter(i => i.id !== targetId));
    await updateDealStatusInPipeline(targetId, 'rejected', adminName, rejectReason || 'Price/Financing mismatch');
    setRejectingId(null);
    setRejectReason('');
  };

  const handleOpenEdit = (deal: SalesDeal) => {
    setEditingDeal(deal);
    setEditPrice(deal.finalPrice);
    setEditImei(deal.imeiSerial || '');
    setEditNote('');
  };

  const handleEditSave = async () => {
    if (!editingDeal) return;
    setIsEditSaving(true);
    const adminName = typeof window !== 'undefined' ? (sessionStorage.getItem('devi_user_name') || 'Store Manager') : 'Store Manager';
    const targetId = editingDeal.id;
    // Only move counts when editing a still-pending deal. Editing an
    // already-approved deal must not double-count it as a new approval.
    if (editingDeal.status === 'pending_approval') {
      setPendingQueue(prev => prev.filter(i => i.id !== targetId));
      setApprovedCount(prev => prev + 1);
    }
    await editDealInPipeline(targetId, {
      finalPrice: editPrice,
      imeiSerial: editImei,
      adminNote: editNote,
      editedBy: adminName,
    });
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setEditingDeal(null);
    setEditNote('');
    setIsEditSaving(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">
              Branch {activeStoreId} ({activeStoreId === 'DM-02' ? 'Freeganj 2.0' : 'Kanthal Flagship'}) Control Desk
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Store Admin Dashboard</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/store/leads"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold shadow-sm active:scale-95 transition-all min-h-[44px]"
          >
            <Target className="w-4 h-4 text-purple-600" />
            <span>Store Leads CRM</span>
          </Link>
          <Link
            href="/admin/store/inventory"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold shadow-sm active:scale-95 transition-all min-h-[44px]"
          >
            <Package className="w-4 h-4 text-blue-600" />
            <span>Store Inventory</span>
          </Link>
          <Link
            href="/admin/store/register"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition-colors min-h-[44px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Open Cash Register</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('approved')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all active:scale-98"
          title="Click to view all approved sales for this store"
        >
          <div className="text-xs font-bold text-slate-400 uppercase">Today&apos;s Store Revenue</div>
          <div className="text-2xl font-black text-emerald-700">
            {formatINR(todayRevenue)}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {todayApprovedDeals.length > 0 ? `${todayApprovedDeals.length} bills closed today` : '₹0 today sales'}
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('pending_approval')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all active:scale-98"
          title="Click to view pending verification queue"
        >
          <div className="text-xs font-bold text-slate-400 uppercase">Pending Approvals</div>
          <div className="text-2xl font-black text-amber-600">{pendingCount} Orders</div>
          <div className="text-[10px] text-slate-400">Needs manager verification</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-blue-50/50 to-white">
          <div className="text-xs font-bold text-blue-700 uppercase">Store Closing Stock</div>
          <div className="text-2xl font-black text-blue-900">
            {activeStoreId === 'DM-02' ? '1,492' : '9,739'} Units
          </div>
          <div className="text-[10px] text-blue-700 font-bold">
            {activeStoreId === 'DM-02' ? '₹89.04 Lakhs' : '₹1.83 Crore'} Cost
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Active Sales Staff</div>
          <div className="text-2xl font-black text-slate-900">{staffCount} Staff</div>
          <div className="text-[10px] text-slate-400">Branch {activeStoreId} staff team</div>
        </div>
      </div>

      {/* APPROVALS DESK / DEALS QUEUE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <StoreIcon className="w-5 h-5 text-brand-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Branch {activeStoreId} Sales Approvals Desk</h2>
              <p className="text-[11px] text-slate-500">Live counter sales, Super Admin & Manager approvals for {activeStoreId}</p>
            </div>
          </div>
          <span className="text-xs bg-brand-50 text-brand-800 font-bold px-3 py-1 rounded-full border border-brand-200 self-start sm:self-auto">
            {filteredDeals.length} Deal{filteredDeals.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter Bar: Search + Status Tabs */}
        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, phone, IMEI, salesman or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {[
              { id: 'pending_approval', label: '⏳ Pending Verification', count: pendingCount },
              { id: 'approved', label: '✅ Approved Sales', count: storeApprovedCount },
              { id: 'rejected', label: '❌ Rejected Deals', count: rejectedCount },
              { id: 'ALL', label: '📋 All Records', count: totalRecordsCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px] ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {filteredDeals.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              {statusFilter === 'pending_approval' ? 'All caught up! No pending sales.' : 'No deals found matching filter.'}
            </div>
            <div className="text-xs text-slate-400">
              {statusFilter === 'pending_approval' 
                ? 'All submitted sales for this store have been verified and processed.' 
                : 'Try adjusting your search query or switching tab.'}
            </div>
            {statusFilter === 'pending_approval' && storeApprovedCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>View {storeApprovedCount} Approved Store Deal{storeApprovedCount > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeals.map((item) => {
              const isApproved = item.status === 'approved';
              const isPending = item.status === 'pending_approval';
              const isRejected = item.status === 'rejected';
              const isSuperApproved = isApproved && Boolean(item.decidedBy?.includes('Super Admin') || item.decidedBy?.includes('Dilip'));

              return (
                <div
                  key={item.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${
                    isApproved 
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300' 
                      : isRejected 
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300' 
                      : 'bg-slate-50 border-slate-200 hover:border-brand-300'
                  }`}
                >
                  {/* Info (Clickable for full details) */}
                  <div 
                    onClick={() => setViewingDeal(item)}
                    className="space-y-2 flex-1 min-w-0 cursor-pointer group hover:opacity-95"
                    title="Click anywhere to inspect full deal details"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-black text-brand-700 group-hover:underline">{item.token || item.id}</span>
                      <span>•</span>
                      <span className="text-xs font-semibold text-slate-600">By {item.salesPersonName}</span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-400">{formatDateTime(item.submittedAt)}</span>
                      
                      {/* Status Badges */}
                      {isApproved && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isSuperApproved 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isSuperApproved ? `👑 Approved by ${item.decidedBy}` : `✅ Approved by ${item.decidedBy || 'Store Admin'}`}</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Verification</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejected by {item.decidedBy || 'Admin'}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-base font-black text-slate-900 leading-snug group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                        <span>{item.productName}</span>
                        <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Customer: <span className="font-bold text-slate-900">{item.customerName}</span> ({item.customerPhone})
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">IMEI / Serial: {item.imeiSerial || 'N/A'}</div>
                    </div>

                    {isRejected && item.rejectionReason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium">
                        <span className="font-bold">Rejection Reason: </span>
                        {item.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Price & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 shrink-0">
                    <div className="text-left sm:text-right sm:mr-4 cursor-pointer" onClick={() => setViewingDeal(item)}>
                      <div className="text-lg sm:text-xl font-black text-slate-900">{formatINR(item.finalPrice)}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        {item.paymentMethod === 'EMI' ? `EMI - ${item.financeProvider || 'Finance'}` : (item.paymentMethod || 'Direct Cash')}
                      </div>
                    </div>

                    {/* Action buttons depending on status */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => setViewingDeal(item)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-colors min-h-[44px]"
                            title="View full deal breakdown"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                            <span>Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all min-h-[44px]"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 transition-colors min-h-[44px]"
                          >
                            <Pencil className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(item.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors min-h-[44px]"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenInvoice(item)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm active:scale-95 transition-all min-h-[44px]"
                          >
                            <Receipt className="w-4 h-4 text-emerald-400" />
                            <span>View GST Bill</span>
                          </button>
                          {/* Admin can edit an already-approved deal (req #11) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 transition-colors min-h-[44px]"
                          >
                            <Pencil className="w-4 h-4" />
                            <span>Edit Deal</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingDeal(item)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-colors min-h-[44px]"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Deal Info</span>
                          </button>
                        </>
                      )}

                      {isRejected && (
                        <button
                          type="button"
                          onClick={() => setViewingDeal(item)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-colors min-h-[44px]"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REJECTION MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Reject Sale Request {rejectingId}</h3>
            <p className="text-xs text-slate-500">
              Please enter the reason for rejecting this sale. This will be shown to the salesman on their dashboard.
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Finance OTP failed, wrong IMEI scanned, down payment shortage..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT & APPROVE MODAL */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit & Approve Sale Deal</h3>
                <p className="text-[11px] text-slate-500">Deal update hote hi directly approve ho jayegi aur salesman ko alert milega</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl space-y-0.5 text-xs">
              <div className="font-bold text-slate-900">{editingDeal.productName}</div>
              <div className="text-slate-500">Customer: {editingDeal.customerName} ({editingDeal.customerPhone})</div>
              <div className="text-slate-500 font-mono">Deal ID: {editingDeal.token || editingDeal.id}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">✏️ Corrected Final Price (₹)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-amber-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50"
                  placeholder="Enter corrected price"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">📱 Corrected IMEI / Serial Number</label>
                <input
                  type="text"
                  value={editImei}
                  onChange={(e) => setEditImei(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter correct 15-digit IMEI"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">📝 Manager Change Note (required)</label>
                <textarea
                  required
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Price updated by manager, IMEI corrected and approved..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingDeal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={isEditSaving || !editNote.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isEditSaving ? 'Saving & Approving...' : '✅ Save Changes & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 OFFICIAL GST TAX INVOICE MODAL */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          data={selectedInvoice}
        />
      )}

      {/* 👁️ VIEW DEAL DETAILS MODAL */}
      {viewingDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Sale Deal Details</h3>
                  <p className="text-xs text-slate-500 font-mono">{viewingDeal.token || viewingDeal.id} • Branch {viewingDeal.storeId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDeal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Approval Decision Banner */}
            <div className={`p-3.5 rounded-2xl border text-xs font-semibold ${
              viewingDeal.status === 'approved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : viewingDeal.status === 'rejected'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {viewingDeal.status === 'approved' && (
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved by {viewingDeal.decidedBy || 'Super Admin HQ'}</span>
                  </div>
                  {viewingDeal.decidedAt && (
                    <div className="text-[11px] text-emerald-700">Timestamp: {formatDateTime(viewingDeal.decidedAt)}</div>
                  )}
                </div>
              )}
              {viewingDeal.status === 'rejected' && (
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <XCircle className="w-4 h-4" />
                    <span>Rejected by {viewingDeal.decidedBy || 'Manager'}</span>
                  </div>
                  <div className="text-[11px] text-rose-700">Reason: {viewingDeal.rejectionReason || 'Details mismatch'}</div>
                </div>
              )}
              {viewingDeal.status === 'pending_approval' && (
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Clock className="w-4 h-4" />
                  <span>Awaiting Manager / Super Admin Verification</span>
                </div>
              )}
            </div>

            {/* Customer & Product */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Customer</span>
                <div className="font-bold text-slate-900">{viewingDeal.customerName}</div>
                <div className="text-slate-500 font-mono">📞 {viewingDeal.customerPhone}</div>
                {viewingDeal.customerAddress && <div className="text-[11px] text-slate-500">{viewingDeal.customerAddress}</div>}
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Product</span>
                <div className="font-bold text-slate-900">{viewingDeal.productName}</div>
                <div className="text-slate-500 font-mono">IMEI: {viewingDeal.imeiSerial || 'N/A'}</div>
                <div className="text-[11px] text-slate-500">Salesman: {viewingDeal.salesPersonName}</div>
              </div>
            </div>

            {/* Full Financial Breakdown */}
            <DealPaymentBreakdown deal={viewingDeal} />

            {/* Actions in Modal */}
            <div className="flex gap-2 pt-2">
              {viewingDeal.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenInvoice(viewingDeal);
                    setViewingDeal(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm min-h-[44px]"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>View Official GST Bill</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingDeal(null)}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
