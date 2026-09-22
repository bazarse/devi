'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Filter, 
  Smartphone, 
  User, 
  Calendar,
  IndianRupee,
  ArrowLeft,
  ChevronRight,
  Printer
} from 'lucide-react';
import { formatINR, formatDate, formatDateTime } from '@/lib/utils';
import { 
  SalesDeal, 
  fetchSalesPipelineDeals, 
  subscribeToPipeline 
} from '@/lib/sales-pipeline';
import InvoiceModal from '@/components/invoice-modal';
import DealPaymentBreakdown from '@/components/deal-payment-breakdown';
import { InvoiceData } from '@/lib/invoice-generator';
import { Eye, Gift, ShieldCheck, X } from 'lucide-react';

export default function SalesApprovalsPage() {
  const [approvalsList, setApprovalsList] = useState<SalesDeal[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Deal Detail Modal State
  const [viewingDeal, setViewingDeal] = useState<SalesDeal | null>(null);

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    let isMounted = true;

    // A salesman only sees their OWN deals; a store admin sees only their store;
    // super admin sees everything.
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

    async function syncData() {
      const deals = await fetchSalesPipelineDeals(filter);
      if (isMounted) {
        if (role === 'salesman') {
          // Double-lock client-side isolation
          const strictlyMine = myPhone.length === 10
            ? deals.filter(d => (d.salesPersonPhone || '').replace(/\D/g, '').slice(-10) === myPhone)
            : [];
          setApprovalsList(strictlyMine);
        } else {
          setApprovalsList(deals);
        }
      }
    }
    syncData();

    const unsubscribe = subscribeToPipeline(() => {
      syncData();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const filteredApprovals = approvalsList.filter((item) => {
    if (!item) return false;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const clean = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !clean ||
                          (item.customerName || '').toLowerCase().includes(clean) ||
                          (item.productName || '').toLowerCase().includes(clean) ||
                          (item.id || '').toLowerCase().includes(clean);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved & Billed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const handleOpenInvoice = (item: SalesDeal) => {
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
      storeName: 'DEVI MOBILE ACCESSORIES',
      storeAddress: '206/1, KANTHAL CHAURAHA, ANKPAT MARG, UJJAIN 456006',
      storeGstin: '23ALGPK9135M1ZT',
      storePhone: '9713001600, 6262335656, 9893264192'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900">My Sales Approvals</h1>
            <p className="text-xs text-slate-500">Track manager verification and print official Devi Mobile GST invoices</p>
          </div>
        </div>

        <Link
          href="/pos"
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          + New Sale
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, phone, product or Request ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { key: 'all', label: 'All Sales' },
              { key: 'pending_approval', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap min-h-[44px] ${
                  selectedStatus === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="text-base font-bold text-slate-700">No Sales in Selected Filter</div>
            <div className="text-xs">Your counter deals will appear here as you submit them.</div>
          </div>
        ) : (
          filteredApprovals.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingDeal(item)}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-brand-400 hover:shadow-md transition-all p-5 space-y-4 cursor-pointer"
            >
              {/* Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 font-mono">ID: {item.id}</span>
                  <span>•</span>
                  <span className="text-xs text-slate-500">{formatDateTime(item.submittedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingDeal(item);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                  {getStatusBadge(item.status)}
                </div>
              </div>

              {/* Main Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Customer</div>
                  <div className="font-bold text-slate-900 text-sm">{item.customerName}</div>
                  <div className="text-slate-500 font-mono">{item.customerPhone}</div>
                </div>

                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Product & IMEI</div>
                  <div className="font-bold text-slate-900">{item.productName}</div>
                  <div className="text-slate-500 font-mono text-[11px]">IMEI: {item.imeiSerial}</div>
                </div>

                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Payment & Price</div>
                  <div className="font-black text-brand-700 text-sm">{formatINR(item.finalPrice)}</div>
                  <div className="text-slate-500">
                    {item.paymentMethod === 'EMI' ? `Finance: ${item.financeProvider}` : `Method: ${item.paymentMethod || 'Cash'}`}
                  </div>
                </div>
              </div>

              {/* Rejection Notice Banner */}
              {item.status === 'rejected' && item.rejectionReason && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                  <span className="font-bold block">Rejection Feedback from Manager:</span>
                  <p className="text-rose-700">{item.rejectionReason}</p>
                </div>
              )}

              {/* Approved Details Banner & Print Bill */}
              {item.status === 'approved' && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs">
                  <span className="text-emerald-800">
                    <span className="font-bold">Verified By:</span> {item.decidedBy || 'Store Manager'} ({formatDateTime(item.decidedAt || item.submittedAt)})
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInvoice(item);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all min-h-[36px]"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    View & Print GST Bill
                  </button>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* COMPREHENSIVE DEAL DETAILS MODAL */}
      {viewingDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg">
                  {viewingDeal.id}
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

            {/* Approval / Rejection Audit Trail */}
            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-slate-500">
                Submitted by <span className="font-bold text-slate-800">{viewingDeal.salesPersonName}</span> on {formatDateTime(viewingDeal.submittedAt)}
              </div>
              {viewingDeal.status === 'approved' && (
                <div className="text-emerald-700 font-semibold">
                  Approved by {viewingDeal.decidedBy || 'Store Manager'} on {formatDateTime(viewingDeal.decidedAt || viewingDeal.submittedAt)}
                </div>
              )}
              {viewingDeal.status === 'rejected' && (
                <div className="text-rose-700 font-semibold">
                  Rejected by {viewingDeal.decidedBy || 'Store Manager'}: {viewingDeal.rejectionReason || 'Details mismatch'}
                </div>
              )}
            </div>

            {/* Customer & Product Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Information</span>
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
                <span className="font-bold text-slate-800">{viewingDeal.vasPlan || 'None'}</span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Free Gift</span>
                <span className="font-bold text-purple-700">{Array.isArray(viewingDeal.gifts) ? viewingDeal.gifts.join(', ') : (viewingDeal.gifts || 'None')}</span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Exchange Value</span>
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
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {viewingDeal.status === 'approved' && (
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
