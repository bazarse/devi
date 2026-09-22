'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  Printer, 
  Share2, 
  Smartphone, 
  IndianRupee, 
  TrendingUp, 
  ShoppingBag,
  Search,
  Receipt,
  Gift,
  ShieldCheck,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { formatINR, formatDateTime } from '@/lib/utils';
import InvoiceModal from '@/components/invoice-modal';
import { InvoiceData } from '@/lib/invoice-generator';
import { sendUrgentReminderToAdmins } from '@/lib/notification-service';
import { 
  SalesDeal, 
  fetchSalesPipelineDeals, 
  subscribeToPipeline 
} from '@/lib/sales-pipeline';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';

export default function SalesmanHistoryPage() {
  const router = useRouter();
  const [salesList, setSalesList] = useState<SalesDeal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Selected Deal View Modal State
  const [viewingDeal, setViewingDeal] = useState<SalesDeal | null>(null);

  // Reminders Track State
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Real-time Pipeline Subscription
  useEffect(() => {
    let isMounted = true;

    // Capture current user identity once. A salesman only sees their OWN deals;
    // a store admin sees only their store; super admin sees everything.
    const role = sessionStorage.getItem('devi_user_role') || localStorage.getItem('devi_user_role');
    const myPhone = (sessionStorage.getItem('devi_user_phone') || localStorage.getItem('devi_user_phone') || '')
      .replace(/\D/g, '')
      .slice(-10);
    const myStore = (sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id') || '') === 'DM-02' ? 'DM-02' : 'DM-01';

    let filter: { salesmanPhone?: string; storeId?: string } | undefined;
    if (role === 'salesman') {
      // Point 13: Strict salesman isolation — a salesman can ONLY ever fetch & view their own sales
      const targetPhone = myPhone.length === 10 ? myPhone : '0000000000';
      filter = { salesmanPhone: targetPhone };
    } else if (role === 'store_admin') {
      filter = { storeId: myStore };
    }

    async function syncSales() {
      const deals = await fetchSalesPipelineDeals(filter);
      if (isMounted) {
        if (role === 'salesman') {
          // Double-lock client-side isolation
          const strictlyMine = myPhone.length === 10 
            ? deals.filter(d => (d.salesPersonPhone || '').replace(/\D/g, '').slice(-10) === myPhone)
            : [];
          setSalesList(strictlyMine);
        } else {
          setSalesList(deals);
        }
      }
    }
    syncSales();

    const unsubscribe = subscribeToPipeline(() => {
      syncSales();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleEditAndResubmit = (sale: SalesDeal) => {
    sessionStorage.setItem('devi_edit_deal', JSON.stringify({
      id: sale.id,
      token: sale.token || sale.id,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      productName: sale.productName,
      imei: sale.imeiSerial,
      finalPrice: sale.finalPrice,
      paymentMode: sale.paymentMethod,
      financeProvider: sale.financeProvider,
      disbursementAmount: sale.disbursementAmount,
      downPayment: (sale.downPaymentCash || 0) + (sale.downPaymentUpi || 0) + (sale.downPaymentCard || 0),
      gifts: sale.gifts,
      vasPlan: sale.vasPlan,
      hasExchange: sale.hasExchange,
      exchangeValue: sale.exchangeValue,
      oldDeviceName: sale.oldDeviceName,
      oldDeviceImei: sale.oldDeviceImei,
      oldDeviceCondition: sale.oldDeviceCondition,
    }));
    router.push('/pos');
  };

  const handleReNotifyManagers = async (sale: SalesDeal) => {
    await sendUrgentReminderToAdmins({
      dealId: sale.token || sale.id,
      salesmanName: sale.salesPersonName || 'Staff Salesman',
      storeId: sale.storeId || 'DM-01',
      customerName: sale.customerName,
      productName: sale.productName,
      finalPrice: sale.finalPrice,
    });
    setRemindedIds(prev => ({ ...prev, [sale.id]: true }));
    setReminderToast(`🔔 Urgent Reminder sent to Managers for ${sale.customerName}!`);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    setTimeout(() => setReminderToast(null), 5000);
  };

  const filteredSales = salesList.filter(item => {
    if (!item) return false;
    const clean = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !clean ||
                          (item.customerName || '').toLowerCase().includes(clean) ||
                          (item.customerPhone || '').includes(clean) ||
                          (item.productName || '').toLowerCase().includes(clean) ||
                          (item.id || '').toLowerCase().includes(clean);
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMySalesToday = salesList
    .filter(s => s && s.status === 'approved')
    .reduce((acc, s) => acc + (Number(s.finalPrice) || 0), 0);

  const totalApprovedUnits = salesList.filter(s => s && s.status === 'approved').length;
  const totalPendingUnits = salesList.filter(s => s && s.status === 'pending_approval').length;
  const totalRejectedUnits = salesList.filter(s => s && s.status === 'rejected').length;

  const handleOpenInvoice = (sale: SalesDeal) => {
    const inv: InvoiceData = {
      invoiceNo: `25-26/${String(sale.token || sale.id || '').replace('SA-', '')}/DEVI`,
      invoiceDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      refNo: sale.salesPersonName || 'STAFF',
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerAddress: sale.customerAddress || 'Ujjain, Madhya Pradesh',
      partyName: sale.paymentMethod === 'EMI' ? (sale.financeProvider || 'BAJAJ FINANCE LIMITED') : sale.customerName,
      productName: sale.productName,
      hsnCode: '85171290',
      imeiNumber: sale.imeiSerial,
      quantity: 1,
      rateInclTax: sale.finalPrice,
      basePrice: (sale.basePrice && sale.basePrice > 0) ? sale.basePrice : ((sale as any).product_price || (sale as any).mrp || 0),
      paymentMethod: sale.paymentMethod,
      financeProvider: sale.financeProvider || undefined,
      storeName: 'DEVI MOBILE ACCESSORIES',
      storeAddress: '206/1, KANTHAL CHAURAHA, ANKPAT MARG, UJJAIN 456006',
      storeGstin: '23ALGPK9135M1ZT',
      storePhone: '9713001600, 6262335656, 9893264192'
    };
    setSelectedInvoice(inv);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">Live Approvals & Billing Ledger</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">My Sales History & Approval Desk</h1>
          </div>
        </div>

        <Link
          href="/pos"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-500/25 active:scale-95 transition-all min-h-[44px]"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>+ Create New Sale</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">My Sales Billed Today</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{formatINR(totalMySalesToday)}</div>
          <div className="text-xs text-emerald-600 font-semibold">{totalApprovedUnits} Units approved</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{totalPendingUnits} Deals</div>
          <div className="text-xs text-slate-500">Under verification by Admin</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Rejected / Revise</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">{totalRejectedUnits} Deals</div>
          <div className="text-xs text-slate-500">Check rejection reason below</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, phone, model or token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'approved', 'pending_approval', 'rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'All' ? 'All Deals' : st === 'approved' ? '✅ Approved' : st === 'pending_approval' ? '⏳ Pending' : '❌ Rejected'}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Cards */}
      <div className="space-y-4">
        {filteredSales.map((sale) => (
          <div
            key={sale.id}
            className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-sm space-y-4 transition-all ${
              sale.status === 'approved'
                ? 'border-emerald-200 bg-emerald-50/10'
                : sale.status === 'rejected'
                ? 'border-rose-200 bg-rose-50/10'
                : 'border-amber-200 bg-amber-50/10'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg">
                  {sale.token || sale.id}
                </span>

                {sale.status === 'approved' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved by {sale.decidedBy || 'Store Admin'}
                  </span>
                )}

                {sale.status === 'pending_approval' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Admin Approval
                  </span>
                )}

                {sale.status === 'rejected' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected by {sale.decidedBy || 'Store Admin'}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {formatDateTime(sale.submittedAt)}
              </div>
            </div>

            {/* Rejection Reason Banner */}
            {sale.status === 'rejected' && sale.rejectionReason && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">Admin Rejection Reason: </span>
                  <span>{sale.rejectionReason}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Product & Scheme */}
              <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Product Sold</span>
                <div className="font-bold text-slate-900 text-sm">{sale.productName}</div>
                <div className="font-mono text-slate-600">IMEI: {sale.imeiSerial}</div>
                <div className="text-brand-700 font-black text-base pt-1">{formatINR(sale.finalPrice)}</div>
                
                {sale.gifts && sale.gifts !== 'None' && (
                  <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md font-bold text-[10px] mt-1">
                    <Gift className="w-3 h-3 text-purple-600" />
                    <span>Gift: {sale.gifts}</span>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                <div className="font-bold text-slate-900 text-sm">{sale.customerName}</div>
                <div className="text-slate-600">Phone: {sale.customerPhone}</div>
                <div className="pt-0.5">
                  {sale.vasPlan && sale.vasPlan !== 'None' ? (
                    <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>🛡️ VAS: {sale.vasPlan}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                      <span>🛡️ VAS: None</span>
                    </div>
                  )}
                </div>
                {sale.hasExchange && (
                  <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded mt-1">
                    🔄 Old Device Exchange: {formatINR(sale.exchangeValue || 0)}
                  </div>
                )}
              </div>

              {/* Payment Mode */}
              <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Mode</span>
                <div className="font-bold text-slate-900">{sale.paymentMethod}</div>
                {sale.paymentMethod === 'EMI' ? (
                  <div className="text-slate-600 space-y-0.5">
                    <div>Provider: <span className="font-bold text-slate-800">{sale.financeProvider || 'Finance'}</span></div>
                    <div>Disbursement: <span className="font-bold text-amber-800">{formatINR(sale.disbursementAmount || 0)}</span></div>
                    <div>Down Payment: <span className="font-bold text-slate-800">{formatINR((sale.downPaymentCash || 0) + (sale.downPaymentUpi || 0) + (sale.downPaymentCard || 0))}</span></div>
                  </div>
                ) : (
                  <div className="text-slate-600 space-y-0.5">
                    <div>Cash: {formatINR(sale.cashAmount || 0)}</div>
                    <div>UPI: {formatINR(sale.upiAmount || 0)}</div>
                    <div>Card: {formatINR(sale.cardAmount || 0)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Feedback Banner on Ledger Card (BUG-R1-05) */}
            {sale.status === 'rejected' && (
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Manager Rejection Reason:</span>
                </div>
                <p className="text-rose-700 font-medium pl-5 text-[13px]">{sale.rejectionReason || 'No specific reason entered by management'}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingDeal(sale)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>View Deal Form</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {sale.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenInvoice(sale)}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>View Official GST Tax Bill</span>
                  </button>
                ) : sale.status === 'rejected' ? (
                  <button
                    type="button"
                    onClick={() => handleEditAndResubmit(sale)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <span>✏️ Edit & Resubmit Deal</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReNotifyManagers(sale)}
                      disabled={remindedIds[sale.id]}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                        remindedIds[sale.id]
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      title="Send instant reminder notification to Store Manager and Super Admin"
                    >
                      {remindedIds[sale.id] ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Reminder Sent!</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>🔔 Re-Notify Managers</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditAndResubmit(sale)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1"
                    >
                      <span>✏️ Edit & Resubmit</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FLOATING REMINDER TOAST */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-slideDown">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-100">{reminderToast}</div>
        </div>
      )}

      {/* DEAL SUMMARY INSPECTION MODAL */}
      {viewingDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-1 rounded-lg">
                  {viewingDeal.token}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  viewingDeal.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : viewingDeal.status === 'rejected'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {viewingDeal.status === 'approved' ? '✅ Approved' : viewingDeal.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingDeal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Product Info */}
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Smartphone & Hardware</span>
                <div className="font-bold text-slate-900 text-sm">{viewingDeal.productName}</div>
                <div className="font-mono text-slate-600">IMEI: {viewingDeal.imeiSerial}</div>
                <div className="text-brand-700 font-black text-base pt-1">{formatINR(viewingDeal.finalPrice)}</div>
              </div>

              {/* Customer Info */}
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Customer Details</span>
                <div className="font-bold text-slate-900">{viewingDeal.customerName}</div>
                <div className="text-slate-600">Phone: {viewingDeal.customerPhone}</div>
              </div>

              {/* Gifts & VAS */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="text-[10px] uppercase font-bold text-purple-700">Gift Scheme</span>
                  <div className="font-bold text-purple-950 mt-0.5">{viewingDeal.gifts || 'None'}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-blue-700">VAS Protection</span>
                  <div className="font-bold text-blue-950 mt-0.5">{viewingDeal.vasPlan || 'Standard'}</div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Payment Mode</span>
                <div className="font-bold text-slate-900">{viewingDeal.paymentMethod}</div>
                {viewingDeal.paymentMethod === 'EMI' && (
                  <div className="text-slate-600 text-[11px] pt-1">
                    <div>Provider: <span className="font-bold text-slate-800">{viewingDeal.financeProvider || 'Finance'}</span></div>
                    {viewingDeal.disbursementAmount ? <div>Loan Disbursement: {formatINR(viewingDeal.disbursementAmount)}</div> : null}
                    <div>Down Payment: {formatINR((viewingDeal.downPaymentCash || 0) + (viewingDeal.downPaymentUpi || 0) + (viewingDeal.downPaymentCard || 0))}</div>
                  </div>
                )}
              </div>

              {/* Rejection reason if rejected */}
              {viewingDeal.status === 'rejected' && viewingDeal.rejectionReason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs">
                  <div className="font-bold mb-0.5">Admin Rejection Reason:</div>
                  <div>{viewingDeal.rejectionReason}</div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              {viewingDeal.status === 'pending_approval' && (
                <button
                  type="button"
                  onClick={() => {
                    handleReNotifyManagers(viewingDeal);
                    setViewingDeal(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
                >
                  🔔 Re-Notify Managers
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setViewingDeal(null);
                  handleEditAndResubmit(viewingDeal);
                }}
                className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                ✏️ Edit & Resubmit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          data={selectedInvoice}
        />
      )}

    </div>
  );
}
