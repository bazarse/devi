'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Store as StoreIcon, 
  Search, 
  Eye, 
  IndianRupee, 
  Smartphone, 
  FileSpreadsheet, 
  Gift, 
  X,
  Filter,
  Building2,
  Pencil,
  Users,
  Package,
  Printer
} from 'lucide-react';
import { formatINR, formatDateTime } from '@/lib/utils';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import { 
  SalesDeal, 
  fetchSalesPipelineDeals, 
  updateDealStatusInPipeline, 
  editDealInPipeline,
  subscribeToPipeline 
} from '@/lib/sales-pipeline';
import InvoiceModal from '@/components/invoice-modal';
import { InvoiceData } from '@/lib/invoice-generator';
import DealPaymentBreakdown from '@/components/deal-payment-breakdown';
import confetti from 'canvas-confetti';

export default function SuperAdminApprovalsPage() {
  const [queue, setQueue] = useState<SalesDeal[]>([]);
  const [storesList, setStoresList] = useState<StoreBranch[]>(DEFAULT_STORES);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending_approval' | 'approved' | 'rejected'>('pending_approval');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Selected Deal Detail Modal State
  const [viewingDeal, setViewingDeal] = useState<SalesDeal | null>(null);

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Reject Modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Full Deal Edit Modal
  const [editingDeal, setEditingDeal] = useState<SalesDeal | null>(null);
  const [editForm, setEditForm] = useState({
    productName: '',
    finalPrice: 0,
    discount: 0,
    imeiSerial: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    paymentMethod: 'Cash',
    financeProvider: '',
    cashAmount: 0,
    upiAmount: 0,
    cardAmount: 0,
    neftAmount: 0,
    downPaymentCash: 0,
    downPaymentUpi: 0,
    downPaymentCard: 0,
    disbursementAmount: 0,
    gifts: '',
    vasPlan: 'None',
    remark: '',
    adminNote: ''
  });
  const [isEditSaving, setIsEditSaving] = useState(false);

  useEffect(() => {
    async function loadStores() {
      const stores = await getActiveStores();
      setStoresList(stores);
    }
    loadStores();
  }, []);

  // Real-time Pipeline Subscription
  useEffect(() => {
    let isMounted = true;
    async function syncPipeline() {
      const deals = await fetchSalesPipelineDeals();
      if (isMounted) {
        setQueue(deals);
        setIsLoading(false);
      }
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

  // Auto-open Edit Modal if editDealId URL param is present
  useEffect(() => {
    if (typeof window !== 'undefined' && queue.length > 0) {
      try {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('editDealId');
        if (editId) {
          const found = queue.find(d => d.id === editId || d.token === editId);
          if (found && !editingDeal) {
            handleOpenEdit(found);
            // Clean URL so it doesn't re-trigger in loops
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      } catch (e) {}
    }
  }, [queue, editingDeal]);

  const handleApprove = async (id: string) => {
    const adminName = typeof window !== 'undefined' ? (sessionStorage.getItem('devi_user_name') || 'Dilip Kishnani (Super Admin HQ)') : 'Dilip Kishnani (Super Admin HQ)';
    setQueue(prev => prev.map(i => i.id === id ? { ...i, status: 'approved' } : i));
    await updateDealStatusInPipeline(id, 'approved', adminName);
    try {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      }
    } catch (e) {}
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setToastMessage({
        title: '⚠️ Rejection Reason Required',
        message: 'Please enter a valid rejection reason explaining why this deal is rejected.',
        type: 'error'
      });
      return;
    }
    const adminName = typeof window !== 'undefined' ? (sessionStorage.getItem('devi_user_name') || 'Dilip Kishnani (Super Admin HQ)') : 'Dilip Kishnani (Super Admin HQ)';
    const targetId = rejectingId;
    const reason = trimmedReason;

    setQueue(prev => prev.map(i => i.id === targetId ? { ...i, status: 'rejected', rejectionReason: reason } : i));
    setRejectingId(null);
    setRejectReason('');

    setToastMessage({
      title: '⚠️ Deal Rejected',
      message: `Deal #${targetId.slice(0, 8)} rejected. Moved to "Rejected" tab.`,
      type: 'error'
    });

    try {
      await updateDealStatusInPipeline(targetId, 'rejected', adminName, reason);
    } catch (err) {
      console.error('Error rejecting deal:', err);
    }
  };

  const handleOpenEdit = (deal: SalesDeal) => {
    setEditingDeal(deal);
    setEditForm({
      productName: deal.productName || '',
      finalPrice: Number(deal.finalPrice) || 0,
      discount: Number(deal.discount) || 0,
      imeiSerial: deal.imeiSerial || '',
      customerName: deal.customerName || '',
      customerPhone: deal.customerPhone || '',
      customerAddress: deal.customerAddress || '',
      paymentMethod: deal.paymentMethod || 'Cash',
      financeProvider: deal.financeProvider || '',
      cashAmount: Number(deal.cashAmount) || 0,
      upiAmount: Number(deal.upiAmount) || 0,
      cardAmount: Number(deal.cardAmount) || 0,
      neftAmount: Number((deal as any).neftAmount) || 0,
      downPaymentCash: Number(deal.downPaymentCash) || 0,
      downPaymentUpi: Number(deal.downPaymentUpi) || 0,
      downPaymentCard: Number(deal.downPaymentCard) || 0,
      disbursementAmount: Number(deal.disbursementAmount) || 0,
      gifts: deal.gifts || '',
      vasPlan: deal.vasPlan || 'None',
      remark: (deal as any).remark || '',
      adminNote: ''
    });
  };

  const handleEditSave = async () => {
    if (!editingDeal) return;
    setIsEditSaving(true);
    const adminName = typeof window !== 'undefined' ? (sessionStorage.getItem('devi_user_name') || 'Dilip Kishnani (Super Admin HQ)') : 'Dilip Kishnani (Super Admin HQ)';
    const targetId = editingDeal.id;

    setQueue(prev => prev.map(i => i.id === targetId ? {
      ...i,
      status: 'approved',
      ...editForm
    } : i));

    setToastMessage({
      title: '✅ Deal Edited & Approved',
      message: `${editForm.productName} updated & approved. GST Bill generated!`,
      type: 'success'
    });

    try {
      await editDealInPipeline(targetId, {
        ...editForm,
        editedBy: adminName,
      });
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      console.error('Error editing deal:', err);
    }

    setEditingDeal(null);
    setIsEditSaving(false);
  };

  const filteredQueue = queue.filter(item => {
    if (!item) return false;
    const matchesStore = selectedStoreFilter === 'ALL' || item.storeId === selectedStoreFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const cleanSearch = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !cleanSearch ||
                          (item.customerName || '').toLowerCase().includes(cleanSearch) ||
                          (item.customerPhone || '').includes(cleanSearch) ||
                          (item.productName || '').toLowerCase().includes(cleanSearch) ||
                          (item.imeiSerial || '').includes(cleanSearch) ||
                          (item.salesPersonName || '').toLowerCase().includes(cleanSearch) ||
                          (item.id || '').toLowerCase().includes(cleanSearch) ||
                          (item.token || '').toLowerCase().includes(cleanSearch);
    return matchesStore && matchesStatus && matchesSearch;
  });

  const handleOpenInvoice = (item: SalesDeal) => {
    const isStore2 = item.storeId === 'DM-02' || (item.storeName && item.storeName.includes('2.0'));
    setSelectedInvoice({
      invoiceNo: `25-26/${String(item.token || item.id || '').replace('SA-', '')}/DEVI`,
      invoiceDate: new Date().toLocaleDateString('en-IN'),
      refNo: item.salesPersonName || 'STAFF',
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      customerAddress: item.customerAddress || 'Ujjain (M.P.)',
      partyName: item.paymentMethod === 'EMI' ? (item.financeProvider || 'BAJAJ FINANCE LIMITED') : item.customerName,
      productName: item.productName,
      hsnCode: '85171290',
      imeiNumber: item.imeiSerial,
      quantity: 1,
      rateInclTax: item.finalPrice,
      basePrice: (item.basePrice && item.basePrice > 0) ? item.basePrice : ((item as any).product_price || (item as any).mrp || 0),
      paymentMethod: item.paymentMethod,
      financeProvider: item.financeProvider || undefined,
      storeName: isStore2 ? 'DEVI MOBILE 2.0 (FREEGANJ)' : 'DEVI MOBILE ACCESSORIES',
      storeAddress: isStore2 ? 'SHOP NO 4, OPP HOTEL SHREE GANGA, FREEGANJ, UJJAIN 456010' : '206/1, KANTHAL CHAURAHA, ANKPAT MARG, UJJAIN 456006',
      storeGstin: '23ALGPK9135M1ZT',
      storePhone: isStore2 ? '9826084000, 9713001600' : '9713001600, 6262335656, 9893264192'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
              Super Admin HQ • Master Approvals Authority
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Multi-Store Sales Approvals Queue</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/super/register"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors min-h-[44px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>HQ Daily Sales Register</span>
          </Link>
        </div>
      </div>

      {/* Toast Feedback Alert */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-scaleUp ${
          toastMessage.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : toastMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <div className="font-bold text-xs">{toastMessage.title}</div>
              <div className="text-[11px] opacity-90">{toastMessage.message}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, phone, IMEI, salesman or model name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Store:</span>
            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">🏢 All Stores ({storesList.length})</option>
              {storesList.map((st) => (
                <option key={st.code} value={st.code}>{st.code}: {st.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 overflow-x-auto custom-scrollbar pb-1">
          {[
            { id: 'pending_approval', label: 'Pending Approvals', count: queue.filter(q => q.status === 'pending_approval').length },
            { id: 'approved', label: 'Approved Sales', count: queue.filter(q => q.status === 'approved').length },
            { id: 'rejected', label: 'Rejected', count: queue.filter(q => q.status === 'rejected').length },
            { id: 'ALL', label: 'All Records', count: queue.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[38px] ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Cards */}
      <div className="space-y-4">
        {filteredQueue.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 text-center rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="text-base font-bold text-slate-700">No Pending Approvals in Selected Filter!</div>
            <div className="text-xs">All counter sales across selected store branches are processed.</div>
          </div>
        ) : (
          filteredQueue.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingDeal(item)}
              className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 hover:shadow-md hover:border-brand-400 transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg">
                    {item.id}
                  </span>
                  <span className="text-xs font-black text-amber-950 bg-amber-100/90 border border-amber-300 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                    <Building2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>{item.storeName || `Store ${item.storeId}`}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingDeal(item);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-lg transition-colors min-h-[32px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    item.status === 'pending_approval'
                      ? 'bg-amber-100 text-amber-800'
                      : item.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {String(item.status || '').replace('_', ' ')}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Salesman: <span className="font-bold text-slate-800">{item.salesPersonName}</span> • {formatDateTime(item.submittedAt)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs">
                {/* Product & IMEI */}
                <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Product Sold</span>
                  <div className="font-bold text-slate-900 text-sm">{item.productName}</div>
                  <div className="font-mono text-slate-600">IMEI: {item.imeiSerial}</div>
                  <div className="text-brand-700 font-black text-base pt-1">{formatINR(item.finalPrice)}</div>
                  <div className="pt-1">
                    {item.vasPlan && item.vasPlan !== 'None' ? (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                        <span>🛡️ VAS: {item.vasPlan}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-lg">
                        <span>🛡️ VAS: None</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Information</span>
                  <div className="font-bold text-slate-900 text-sm">{item.customerName}</div>
                  <div className="text-slate-600">Phone: {item.customerPhone}</div>
                  {item.gifts && item.gifts !== 'None' && (
                    <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md font-bold text-[10px] mt-1">
                      <Gift className="w-3 h-3 text-purple-600" />
                      <span>Gift: {Array.isArray(item.gifts) ? item.gifts.join(', ') : String(item.gifts || '')}</span>
                    </div>
                  )}
                  {item.hasExchange && (
                    <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded mt-1">
                      🔄 Old Device Exchange Value: {formatINR(item.exchangeValue || 0)}
                    </div>
                  )}
                </div>

                {/* Full Payment Breakdown */}
                <DealPaymentBreakdown deal={item} />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {item.status === 'pending_approval' && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRejectingId(item.id);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors min-h-[44px] text-center flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Sale
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(item);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit & Return
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(item.id);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Generate GST Bill</span>
                    </button>
                  </>
                )}
                {/* Admin can still edit an already-approved deal (req #11) */}
                {item.status === 'approved' && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInvoice(item);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Bill</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(item);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Approved Deal
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900">Reject Approval Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 font-bold flex items-center justify-between">
              <span>Rejection Reason <span className="text-rose-600">* (Mandatory)</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Salesman will see this on POS ledger</span>
            </div>

            <textarea
              rows={3}
              placeholder="e.g. Bajaj finance file rejected, down payment mismatch..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
            {!rejectReason.trim() && (
              <p className="text-[11px] text-rose-600 font-medium">Please enter a reason to enable rejection.</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={handleRejectConfirm}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold min-h-[44px] transition-all ${
                  rejectReason.trim()
                    ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-500/20'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ FULL DEAL EDIT & APPROVE MODAL */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">Full Deal Edit & Approve</h3>
                  <p className="text-[11px] text-amber-100 font-medium">Modify any deal fields below before final GST bill generation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDeal(null)}
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-5 flex-1 text-xs">
              
              {/* Deal Meta Header */}
              <div className="p-3 bg-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-slate-700">
                <div>
                  <span className="font-bold">Deal ID:</span> <span className="font-mono font-bold text-brand-700">{editingDeal.token || editingDeal.id}</span>
                </div>
                <div>
                  <span className="font-bold">Store Branch:</span> <span className="font-bold text-slate-900">{editingDeal.storeName || editingDeal.storeId}</span>
                </div>
                <div>
                  <span className="font-bold">Staff:</span> <span>{editingDeal.salesPersonName}</span>
                </div>
              </div>

              {/* 1. Device & Pricing */}
              <div className="space-y-3">
                <div className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-brand-700">
                  <Smartphone className="w-4 h-4" />
                  <span>1. Product & Pricing</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Product Name</label>
                    <input
                      type="text"
                      value={editForm.productName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, productName: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">IMEI / Serial Number</label>
                    <input
                      type="text"
                      value={editForm.imeiSerial}
                      onChange={(e) => setEditForm(prev => ({ ...prev, imeiSerial: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="15-digit IMEI"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Final Agreed Price (₹)</label>
                    <input
                      type="number"
                      value={editForm.finalPrice}
                      onChange={(e) => setEditForm(prev => ({ ...prev, finalPrice: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50/50 font-black text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Discount Given (₹)</label>
                    <input
                      type="number"
                      value={editForm.discount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, discount: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Customer Information */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-brand-700">
                  <Users className="w-4 h-4" />
                  <span>2. Customer Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Customer Full Name</label>
                    <input
                      type="text"
                      value={editForm.customerName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Phone Number (10 Digits)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={editForm.customerPhone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-bold mb-1">Customer Address / City</label>
                    <input
                      type="text"
                      value={editForm.customerAddress}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="e.g. Malipura, Ujjain"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Payment & Finance Mode */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-brand-700">
                  <IndianRupee className="w-4 h-4" />
                  <span>3. Payment & Financing</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Payment Method</label>
                    <select
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="UPI">📱 UPI / QR Code</option>
                      <option value="Card">💳 Credit / Debit Card</option>
                      <option value="NEFT">🏦 NEFT / Bank Transfer</option>
                      <option value="EMI">🏦 Finance / EMI</option>
                      <option value="Split">🔀 Split Payment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Finance Provider</label>
                    <select
                      value={editForm.financeProvider}
                      onChange={(e) => setEditForm(prev => ({ ...prev, financeProvider: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                    >
                      <option value="">None / Direct</option>
                      <option value="Bajaj Finance Limited">Bajaj Finance Limited</option>
                      <option value="IDFC First Bank">IDFC First Bank</option>
                      <option value="HDB Financial Services">HDB Financial Services</option>
                      <option value="TVS Credit">TVS Credit</option>
                      <option value="HDFC Bank SmartEMI">HDFC Bank SmartEMI</option>
                      <option value="ICICI Bank Card EMI">ICICI Bank Card EMI</option>
                      <option value="Pine Labs Brand EMI">Pine Labs Brand EMI</option>
                      <option value="Poonawalla Fincorp">Poonawalla Fincorp</option>
                      <option value="Cholamandalam Finance">Cholamandalam Finance</option>
                      <option value="Home Credit">Home Credit</option>
                      <option value="DMI Finance">DMI Finance</option>
                      {/* keep any existing custom value visible */}
                      {editForm.financeProvider &&
                        !['','Bajaj Finance Limited','IDFC First Bank','HDB Financial Services','TVS Credit','HDFC Bank SmartEMI','ICICI Bank Card EMI','Pine Labs Brand EMI','Poonawalla Fincorp','Cholamandalam Finance','Home Credit','DMI Finance'].includes(editForm.financeProvider) && (
                        <option value={editForm.financeProvider}>{editForm.financeProvider}</option>
                      )}
                    </select>
                  </div>

                  {editForm.paymentMethod === 'EMI' && (
                    <>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Down Payment (Cash) (₹)</label>
                        <input
                          type="number"
                          value={editForm.downPaymentCash}
                          onChange={(e) => setEditForm(prev => ({ ...prev, downPaymentCash: Number(e.target.value) }))}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Down Payment (UPI) (₹)</label>
                        <input
                          type="number"
                          value={editForm.downPaymentUpi}
                          onChange={(e) => setEditForm(prev => ({ ...prev, downPaymentUpi: Number(e.target.value) }))}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Disbursement Loan Amount (₹)</label>
                        <input
                          type="number"
                          value={editForm.disbursementAmount}
                          onChange={(e) => setEditForm(prev => ({ ...prev, disbursementAmount: Number(e.target.value) }))}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </>
                  )}

                  {editForm.paymentMethod === 'Cash' && (
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Cash Received (₹)</label>
                      <input
                        type="number"
                        value={editForm.cashAmount || editForm.finalPrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cashAmount: Number(e.target.value) }))}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  )}

                  {editForm.paymentMethod === 'UPI' && (
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">UPI Amount Received (₹)</label>
                      <input
                        type="number"
                        value={editForm.upiAmount || editForm.finalPrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, upiAmount: Number(e.target.value) }))}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  )}

                  {editForm.paymentMethod === 'Card' && (
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Card POS Amount (₹)</label>
                      <input
                        type="number"
                        value={editForm.cardAmount || editForm.finalPrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cardAmount: Number(e.target.value) }))}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  )}

                  {editForm.paymentMethod === 'Split' && (
                    <div className="sm:col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">🔀 Split Payment Breakdown</span>
                        <span className={`text-[11px] font-mono font-bold ${
                          (Number(editForm.cashAmount || 0) + Number(editForm.upiAmount || 0) + Number(editForm.cardAmount || 0)) === editForm.finalPrice
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}>
                          Total: ₹{Number(editForm.cashAmount || 0) + Number(editForm.upiAmount || 0) + Number(editForm.cardAmount || 0)} / Target: ₹{editForm.finalPrice}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Cash (₹)</label>
                          <input
                            type="number"
                            value={editForm.cashAmount || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, cashAmount: Number(e.target.value) }))}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">UPI (₹)</label>
                          <input
                            type="number"
                            value={editForm.upiAmount || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, upiAmount: Number(e.target.value) }))}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Card (₹)</label>
                          <input
                            type="number"
                            value={editForm.cardAmount || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, cardAmount: Number(e.target.value) }))}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">NEFT (₹)</label>
                          <input
                            type="number"
                            value={editForm.neftAmount || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, neftAmount: Number(e.target.value) }))}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editForm.paymentMethod === 'NEFT' && (
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">NEFT / Bank Transfer Amount (₹)</label>
                      <input
                        type="number"
                        value={editForm.neftAmount || editForm.finalPrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, neftAmount: Number(e.target.value) }))}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 4. VAS & Freebies */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-brand-700">
                  <Package className="w-4 h-4" />
                  <span>4. VAS Protection & Gifts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Value-Added Service (VAS)</label>
                    <select
                      value={editForm.vasPlan}
                      onChange={(e) => setEditForm(prev => ({ ...prev, vasPlan: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                    >
                      <option value="None">None</option>
                      <option value="Devi Complete Care (1 Year)">🛡️ Devi Complete Care (1 Year)</option>
                      <option value="Screen Damage Protection">📱 Screen Damage Protection</option>
                      <option value="Extended Warranty 1 Year">⏱️ Extended Warranty 1 Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Gifts / Accessories Bundled</label>
                    <input
                      type="text"
                      value={editForm.gifts}
                      onChange={(e) => setEditForm(prev => ({ ...prev, gifts: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="e.g. Tempered Glass, Back Cover, Earphones"
                    />
                  </div>
                </div>
              </div>

              {/* Deal Remark (visible on deal, e.g. udhaari) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-slate-900 font-bold">🗒️ Deal Remark / Note (e.g. Udhaari baaki)</label>
                <input
                  type="text"
                  value={editForm.remark}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remark: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Udhaari ₹2000 baaki, deliver tomorrow..."
                />
              </div>

              {/* 5. Manager Change Note */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-slate-900 font-bold">📝 Manager Audit Note (Reason for modification)</label>
                <textarea
                  rows={2}
                  value={editForm.adminNote}
                  onChange={(e) => setEditForm(prev => ({ ...prev, adminNote: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Price adjusted by HQ, customer name corrected, approved..."
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingDeal(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={isEditSaving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEditSaving ? 'Saving & Approving...' : 'Save Changes & Approve Deal'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* COMPREHENSIVE DEAL DETAILS MODAL */}
      {viewingDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg">
                  {viewingDeal.id}
                </span>
                <span className="text-xs font-black text-amber-950 bg-amber-100/90 border border-amber-300 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                  <Building2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>{viewingDeal.storeName || `Store ${viewingDeal.storeId}`}</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                  viewingDeal.status === 'pending_approval'
                    ? 'bg-amber-100 text-amber-800'
                    : viewingDeal.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {String(viewingDeal.status || '').replace('_', ' ')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setViewingDeal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Trail Banner */}
            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-slate-600">
                Salesman: <span className="font-bold text-slate-900">{viewingDeal.salesPersonName}</span> • Submitted: {formatDateTime(viewingDeal.submittedAt)}
              </div>
              {viewingDeal.status === 'approved' && (
                <div className="text-emerald-700 font-semibold">
                  Approved by {viewingDeal.decidedBy || 'Super Admin HQ'} on {formatDateTime(viewingDeal.decidedAt || viewingDeal.submittedAt)}
                </div>
              )}
              {viewingDeal.status === 'rejected' && (
                <div className="text-rose-700 font-semibold">
                  Rejected by {viewingDeal.decidedBy || 'Manager'}: {viewingDeal.rejectionReason || 'Details mismatch'}
                </div>
              )}
            </div>

            {/* Customer & Product Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Details</span>
                <div className="font-bold text-slate-900 text-sm">{viewingDeal.customerName}</div>
                <div className="text-slate-600 font-mono">Phone: {viewingDeal.customerPhone}</div>
                {viewingDeal.customerAddress && (
                  <div className="text-slate-500 text-[11px] pt-0.5">Address: {viewingDeal.customerAddress}</div>
                )}
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Product Sold</span>
                <div className="font-bold text-slate-900 text-sm">{viewingDeal.productName}</div>
                <div className="text-slate-600 font-mono">IMEI: {viewingDeal.imeiSerial}</div>
                <div className="text-brand-700 font-black text-sm pt-0.5">{formatINR(viewingDeal.finalPrice)}</div>
              </div>
            </div>

            {/* Extras: VAS, Gifts, Exchange */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">VAS Plan</span>
                <span className="font-bold text-emerald-800">{viewingDeal.vasPlan || 'None'}</span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Bundled Gifts</span>
                <span className="font-bold text-purple-700">{Array.isArray(viewingDeal.gifts) ? viewingDeal.gifts.join(', ') : (viewingDeal.gifts || 'None')}</span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Exchange Device</span>
                <span className="font-bold text-indigo-700">{viewingDeal.hasExchange ? formatINR(viewingDeal.exchangeValue || 0) : 'None'}</span>
              </div>
            </div>

            {/* Payment Breakdown Card */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Complete Payment Breakdown</span>
              <DealPaymentBreakdown deal={viewingDeal} />
            </div>

            {/* Remarks / Udhaari notes */}
            {viewingDeal.remark && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <span className="font-bold block">Remark / Notes:</span>
                <p>{viewingDeal.remark}</p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {viewingDeal.status === 'pending_approval' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const id = viewingDeal.id;
                      setViewingDeal(null);
                      setRejectingId(id);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const deal = viewingDeal;
                      setViewingDeal(null);
                      handleOpenEdit(deal);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit & Return</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = viewingDeal.id;
                      setViewingDeal(null);
                      handleApprove(id);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Deal</span>
                  </button>
                </>
              )}

              {viewingDeal.status === 'approved' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const deal = viewingDeal;
                      setViewingDeal(null);
                      handleOpenInvoice(deal);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>View & Print GST Bill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const deal = viewingDeal;
                      setViewingDeal(null);
                      handleOpenEdit(deal);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Deal</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setViewingDeal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors min-h-[44px]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Exact Devi Mobile GST Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          data={selectedInvoice}
        />
      )}

    </div>
  );
}
