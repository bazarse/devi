'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Phone, 
  MessageSquare, 
  ChevronRight, 
  ShoppingBag, 
  Calendar, 
  Smartphone, 
  CreditCard, 
  Sparkles, 
  Store as StoreIcon,
  ArrowUpRight,
  Filter,
  UserCheck,
  Building2,
  Crown,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { 
  CustomerProfile, 
  fetchCloudCustomers, 
  subscribeToCustomers,
  deleteCustomer
} from '@/lib/customer-service';

export default function SuperCustomersPage() {
  const [selectedStore, setSelectedStore] = useState<'ALL' | 'DM-01' | 'DM-02'>('ALL');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'spent' | 'purchases'>('recent');
  const [customerToDelete, setCustomerToDelete] = useState<CustomerProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);


  useEffect(() => {
    let isMounted = true;
    async function load() {
      const list = await fetchCloudCustomers(selectedStore === 'ALL' ? undefined : selectedStore);
      if (isMounted) setCustomers(list);
    }
    load();

    const unsub = subscribeToCustomers(() => {
      load();
    });
    return unsub;
  }, [selectedStore]);


  const filtered = customers
    .filter(c => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q || 
        (c.name || '').toLowerCase().includes(q) || 
        (c.phone || '').includes(q) || 
        (c.address && (c.address || '').toLowerCase().includes(q)) ||
        (c.purchases || []).some(p => (p.imei || '').includes(q) || (p.productName || '').toLowerCase().includes(q));
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
      if (sortBy === 'purchases') return b.purchaseCount - a.purchaseCount;
      return new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime();
    });

  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalPurchasesAll = customers.reduce((sum, c) => sum + c.purchaseCount, 0);
  const totalDueAll = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    const res = await deleteCustomer(customerToDelete.id, customerToDelete.phone);
    setIsDeleting(false);
    if (res.success) {
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
      setDeleteSuccessToast(`Customer ${customerToDelete.name} deleted successfully.`);
      setCustomerToDelete(null);
      setTimeout(() => setDeleteSuccessToast(null), 4000);
    } else {
      alert(res.error || 'Failed to delete customer');
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans pb-16">
      {/* Toast alert */}
      {deleteSuccessToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-fadeIn">
          <span>{deleteSuccessToast}</span>
          <button type="button" onClick={() => setDeleteSuccessToast(null)} className="p-1 hover:bg-emerald-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                HQ Central Customer CRM
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                Multi-Branch Live View
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Chain Customer Directory</h1>
          </div>
        </div>

        {/* Store Filter Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedStore('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedStore === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Branches
          </button>
          <button
            type="button"
            onClick={() => setSelectedStore('DM-01')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedStore === 'DM-01' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            DM-01 Kanthal
          </button>
          <button
            type="button"
            onClick={() => setSelectedStore('DM-02')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedStore === 'DM-02' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            DM-02 Freeganj
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Total Chain Customers</div>
          <div className="text-2xl font-black text-slate-900">{customers.length} Profiles</div>
          <div className="text-[10px] text-slate-400">Registered across stores</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Devices Transacted</div>
          <div className="text-2xl font-black text-brand-600">{totalPurchasesAll} Phones</div>
          <div className="text-[10px] text-slate-400">Combined device ledger</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="text-xs font-bold text-amber-700 uppercase">Total Customer Spend</div>
          <div className="text-2xl font-black text-amber-700">{formatINR(totalSpentAll)}</div>
          <div className="text-[10px] text-amber-600 font-semibold">Total revenue generated</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-rose-50/40 to-white">
          <div className="text-xs font-bold text-rose-700 uppercase">Total Due (Udhaari)</div>
          <div className="text-2xl font-black text-rose-700">{formatINR(totalDueAll)}</div>
          <div className="text-[10px] text-rose-600 font-semibold">Outstanding balance</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Average Customer LTV</div>
          <div className="text-2xl font-black text-slate-900">
            {formatINR(customers.length > 0 ? Math.round(totalSpentAll / customers.length) : 0)}
          </div>
          <div className="text-[10px] text-slate-400">Lifetime value per buyer</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, device model or IMEI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400">Sort:</span>
          {(['recent', 'spent', 'purchases'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
                sortBy === s ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'recent' ? 'Recently Added' : s === 'spent' ? 'Top Spenders' : 'Most Purchases'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">No Customers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Jaise hi kisi bhi store me sale complete hogi ya walk-in lead generate hogi, customer profile yahan live reflect hogi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(customer => (
            <div
              key={customer.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Top Bar: Initial avatar & Phone */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-base shadow-sm">
                      {customer.name ? customer.name[0].toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">{customer.name}</h3>
                      <div className="text-xs font-mono font-bold text-slate-500">{customer.phone}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(customer.totalDue || 0) > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black animate-pulse">
                        🚨 Due: {formatINR(customer.totalDue || 0)}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
                      {customer.primaryStoreId}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Lifetime Spend</span>
                    <span className="font-black text-emerald-700 text-[11px]">{formatINR(customer.totalSpent)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Devices</span>
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-0.5">
                      <ShoppingBag className="w-3 h-3 text-slate-400" /> {customer.purchaseCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Due (Udhaari)</span>
                    <span className={`font-black text-[11px] ${(customer.totalDue || 0) > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                      {formatINR(customer.totalDue || 0)}
                    </span>
                  </div>
                </div>

                {/* Latest Purchase Preview */}
                {customer.purchases.length > 0 ? (
                  <div className="text-xs bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block">Recent Device</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1 truncate">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{customer.purchases[0].productName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      IMEI: {customer.purchases[0].imei}
                    </div>
                  </div>
                ) : customer.leads.length > 0 ? (
                  <div className="text-xs bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Walk-In Inquiry</span>
                    <div className="font-bold text-slate-900 truncate">
                      Interested in: {customer.leads[0].model}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Budget: {formatINR(customer.leads[0].budget)} • {customer.leads[0].status}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No previous transaction record</div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${customer.name}, greeting from Devi Mobile HQ Management. We value your relationship with us!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm min-h-[40px]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${customer.phone}`}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
                  >
                    <Phone className="w-3.5 h-3.5 text-brand-600" />
                    <span>Call</span>
                  </a>

                  <Link
                    href={`/admin/super/customers/${customer.id}`}
                    className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-1 transition-colors min-h-[44px]"
                  >
                    <span>Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setCustomerToDelete(customer)}
                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">Delete Customer Profile?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-900">{customerToDelete.name}</strong> ({customerToDelete.phone})? This will remove their record from the CRM customer directory.
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
                onClick={() => setCustomerToDelete(null)}
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

    </div>
  );
}

