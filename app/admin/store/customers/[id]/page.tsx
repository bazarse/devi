'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  Smartphone, 
  ShieldCheck, 
  CreditCard, 
  Copy, 
  Check, 
  Edit3, 
  Clock, 
  Target, 
  FileText, 
  Store as StoreIcon,
  Sparkles,
  Award,
  Wallet,
  Trash2,
  AlertTriangle,
  Printer,
  X
} from 'lucide-react';
import { 
  CustomerProfile, 
  getCustomerById, 
  saveCustomer, 
  subscribeToCustomers,
  deleteCustomer
} from '@/lib/customer-service';
import ErrorBoundary from '@/components/error-boundary';
import InvoiceModal from '@/components/invoice-modal';
import { InvoiceData, getHsnCodeForProduct } from '@/lib/invoice-generator';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [copiedImei, setCopiedImei] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'purchases' | 'leads' | 'khata'>('purchases');
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [noteSavedAlert, setNoteSavedAlert] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  const handleOpenInvoice = (purchase: any) => {
    if (!customer) return;
    const billNumber = purchase.invoiceNo?.startsWith('DEVI/') 
      ? purchase.invoiceNo 
      : `DEVI/26-27/${String(purchase.invoiceNo || '5741').replace(/[^0-9]/g, '') || '5741'}`;

    setSelectedInvoice({
      invoiceNo: billNumber,
      invoiceDate: (purchase.date || '').split('T')[0] || '2026-09-05',
      refNo: purchase.salesman || 'STAFF',
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || 'Ujjain (M.P.)',
      partyName: purchase.financeProvider || customer.name,
      productName: purchase.productName,
      category: 'Mobile Phone',
      hsnCode: getHsnCodeForProduct(purchase.productName),
      imeiNumber: purchase.imei,
      quantity: 1,
      rateInclTax: purchase.amount,
      basePrice: purchase.basePrice || purchase.mrp || purchase.amount,
      paymentMethod: purchase.paymentMethod || 'Cash',
      financeProvider: purchase.financeProvider || undefined,
      vasPlan: purchase.vasPlan
    });
  };


  useEffect(() => {
    async function load() {
      if (!customerId) return;
      const data = await getCustomerById(customerId);
      if (data) {
        setCustomer(data);
        setNotes(data.notes || '');
      }
    }
    load();


    const unsub = subscribeToCustomers(() => {
      load();
    });
    return unsub;
  }, [customerId]);

  const handleCopyImei = (imei: string) => {
    navigator.clipboard.writeText(imei);
    setCopiedImei(imei);
    setTimeout(() => setCopiedImei(null), 2000);
  };

  const handleSaveNotes = () => {
    if (!customer) return;
    setIsSavingNotes(true);
    const updated: CustomerProfile = {
      ...customer,
      notes: notes.trim()
    };
    saveCustomer(updated);
    setCustomer(updated);
    setIsSavingNotes(false);
    setNoteSavedAlert(true);
    setTimeout(() => setNoteSavedAlert(false), 2500);
  };

  const handleConfirmDelete = async () => {
    if (!customer) return;
    setIsDeleting(true);
    const res = await deleteCustomer(customer.id, customer.phone);
    setIsDeleting(false);
    if (res.success) {
      router.push('/admin/store/customers');
    } else {
      alert(res.error || 'Failed to delete customer profile');
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-4">
        <h2 className="text-xl font-black text-slate-800">Customer Profile Not Found</h2>
        <p className="text-xs text-slate-500">The customer ID or phone does not exist in the active directory.</p>
        <Link
          href="/admin/store/customers"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store Contacts</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans pb-20">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/store/customers"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store Contacts</span>
        </Link>

        <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-mono font-bold">
          Branch: {customer.primaryStoreId} ({customer.primaryStoreId === 'DM-02' ? 'Freeganj 2.0' : 'Kanthal Flagship'})
        </span>
      </div>

      {/* Customer 360 Header Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-brand-500/20">
              {customer.name ? customer.name[0].toUpperCase() : 'C'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{customer.name}</h1>
                {customer.totalSpent > 50000 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase flex items-center gap-1 border border-amber-200">
                    <Award className="w-3 h-3 text-amber-600" /> VIP Buyer
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> +91 {customer.phone}
                </span>
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {customer.address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Member since: {new Date(customer.firstSeen).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Communication Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href={`https://wa.me/91${String(customer.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${customer.name || 'Customer'}, this is Devi Mobile (${customer.primaryStoreId || 'DM-01'}). Regarding your purchase and warranty support, we are always happy to assist you!`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-md shadow-emerald-600/20 min-h-[44px]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>

            <a
              href={`tel:${customer.phone || ''}`}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors min-h-[44px]"
            >
              <Phone className="w-4 h-4 text-brand-600" />
              <span>Call</span>
            </a>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors min-h-[44px]"
              title="Delete Customer Profile"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>


        {/* 4 Key Customer Lifetime Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lifetime Spend</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">{formatINR(customer.totalSpent || 0)}</div>
            <span className="text-[10px] text-slate-400">Total bills transacted</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Devices Bought</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{customer.purchaseCount || 0} Items</div>
            <span className="text-[10px] text-slate-400">Smartphones & accessories</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Inquiries / Leads</span>
            <div className="text-xl sm:text-2xl font-black text-blue-700">{(customer.leads || []).length} Enquiries</div>
            <span className="text-[10px] text-slate-400">Walk-in prospect records</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Khata / Credit</span>
            <div className="text-xl sm:text-2xl font-black text-slate-700">₹0.00</div>
            <span className="text-[10px] text-emerald-600 font-bold">100% Clear Balance</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[40px] ${
            activeTab === 'purchases' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Device Purchases ({(customer.purchases || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[40px] ${
            activeTab === 'leads' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Walk-In Inquiries ({(customer.leads || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('khata')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[40px] ${
            activeTab === 'khata' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Khata / Credit Ledger</span>
        </button>
      </div>

      <ErrorBoundary title="Customer Record Details" description="Unable to render customer transactions or inquiries. Please retry.">
        {/* TAB 1: DEVICE PURCHASES */}
        {activeTab === 'purchases' && (
          <div className="space-y-4">
            {(customer.purchases || []).length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Purchases Recorded Yet</h3>
                <p className="text-xs text-slate-400">Jab is customer ka bill counter par banega, device details yahan show hongi.</p>
              </div>
            ) : (
              (customer.purchases || []).map(p => (
                <div key={p.id} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold">
                          {p.storeId}
                        </span>
                        <span className="text-xs font-bold text-brand-700 font-mono">Invoice: {p.invoiceNo}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{p.productName}</h3>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-lg font-black text-emerald-700">{formatINR(p.amount || 0)}</div>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(p.date || 0).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* IMEI Barcode Box */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">15-Digit IMEI</span>
                        <span className="font-mono font-black text-slate-900 text-sm tracking-wider">{p.imei}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyImei(p.imei)}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-brand-600 transition-colors"
                        title="Copy IMEI"
                      >
                        {copiedImei === p.imei ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method</span>
                      <span className="font-bold text-slate-800 block">{p.paymentMethod}</span>
                      {p.financeProvider && (
                        <span className="text-[11px] text-brand-700 font-semibold block">Finance: {p.financeProvider}</span>
                      )}
                    </div>

                    {/* VAS / Protection Plan & Salesman */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sold By & Protection</span>
                      <span className="font-bold text-slate-800 block">Salesman: {p.salesman}</span>
                      <span className="text-[11px] text-emerald-700 font-semibold block">VAS: {p.vasPlan || 'Standard Warranty'}</span>
                    </div>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenInvoice(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                      title="View & Print Official GST Tax Bill in Tally Format"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View / Print GST Invoice</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: WALK-IN INQUIRIES */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {(customer.leads || []).length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
                <Target className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Past Inquiries Logged</h3>
                <p className="text-xs text-slate-400">Jab salesman customer ki walk-in lead add karega, wo yahan display hogi.</p>
              </div>
            ) : (
              (customer.leads || []).map(l => (
                <div key={l.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-slate-900">{l.model}</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      l.status === 'Hot Lead' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Budget</span>
                      <span className="font-bold text-emerald-700">{formatINR(l.budget || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Logged At</span>
                      <span className="font-bold text-slate-800">{new Date(l.date || 0).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Salesman</span>
                      <span className="font-bold text-slate-800">{l.salesman}</span>
                    </div>
                  </div>
                  {l.notes && (
                    <p className="text-xs text-slate-600 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                      <span className="font-bold">Note:</span> {l.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: KHATA / CREDIT LEDGER */}
        {activeTab === 'khata' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Customer Khata & Credit Account</h3>
                <p className="text-xs text-slate-500">Store DM-01 & DM-02 Khata Ledger</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Balance</span>
                <span className="text-2xl font-black text-emerald-700">₹0.00</span>
              </div>
            </div>
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Customer has zero outstanding credit. All smartphone bills have been fully paid via Cash, UPI or Finance disbursement.</span>
            </div>
          </div>
        )}
      </ErrorBoundary>

      {/* Customer Preferences & Notes Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-brand-600" />
            <span>Customer Preferences & Private Staff Notes</span>
          </h3>
          {noteSavedAlert && (
            <span className="text-xs font-bold text-emerald-600 animate-fadeIn">Saved successfully!</span>
          )}
        </div>

        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Regular customer, prefers Vivo brand, likes fast EMI processing, interested in festival exchange offers..."
          className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <button
          type="button"
          onClick={handleSaveNotes}
          disabled={isSavingNotes}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all min-h-[40px]"
        >
          {isSavingNotes ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && customer && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">Delete Customer Profile?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-900">{customer.name}</strong> ({customer.phone})? You will be redirected back to the store customers directory.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Accounting & Ledger Safeguard</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Past tax invoices and IMEI records will be preserved for store auditing, but this customer profile will be unlinked and purged.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all min-h-[44px] flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Customer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 🖨️ A4 INVOICE MODAL PREVIEW ── */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={!!selectedInvoice}
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

    </div>
  );
}

