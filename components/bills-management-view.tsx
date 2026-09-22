'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal, 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Building2, 
  Calendar, 
  Eye, 
  Check, 
  X, 
  Sparkles, 
  Smartphone, 
  CreditCard, 
  ArrowUpDown,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Trash2,
  Pencil,
  Gift
} from 'lucide-react';
import { formatINR, formatDateTime } from '@/lib/utils';
import { SalesDeal, fetchSalesPipelineDeals, subscribeToPipeline, deleteSaleDeal, editDealInPipeline } from '@/lib/sales-pipeline';
import { getStoreBillConfig, saveStoreBillConfig, StoreBillConfig, DEFAULT_BILL_CONFIGS } from '@/lib/bill-config-service';
import { getAllTallyStatuses, toggleTallyStatus, subscribeToTallyUpdates, TallyStatus, deleteTallyStatus, syncTallyStatusesFromDeals } from '@/lib/tally-tracker-service';
import InvoiceModal from '@/components/invoice-modal';
import { InvoiceData, getHsnCodeForProduct } from '@/lib/invoice-generator';
import confetti from 'canvas-confetti';

interface BillsManagementViewProps {
  userRole: 'store_admin' | 'super_admin';
  defaultStoreId?: string;
}

export default function BillsManagementView({ userRole, defaultStoreId = 'DM-01' }: BillsManagementViewProps) {
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState(defaultStoreId);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<'ALL' | 'DM-01' | 'DM-02'>(
    userRole === 'super_admin' ? 'ALL' : (defaultStoreId === 'DM-02' ? 'DM-02' : 'DM-01')
  );
  
  // Tally & Filter states
  const [tallyFilter, setTallyFilter] = useState<'ALL' | 'PENDING' | 'UPLOADED'>('ALL');
  const [dateFilter, setDateFilter] = useState<'Today' | 'Yesterday' | 'ThisMonth' | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [tallyMap, setTallyMap] = useState<Record<string, TallyStatus>>({});

  // Active Admin Name for Tally audit
  const [adminName, setAdminName] = useState('Store Admin');

  // Preview & Customization modals
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [editingStoreConfigId, setEditingStoreConfigId] = useState<'DM-01' | 'DM-02'>(
    userRole === 'super_admin' ? 'DM-01' : (defaultStoreId === 'DM-02' ? 'DM-02' : 'DM-01')
  );
  const [tempConfig, setTempConfig] = useState<StoreBillConfig>(DEFAULT_BILL_CONFIGS['DM-01']);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Point 15: Super Admin Bill & Gift Modification State
  const [modifyingDeal, setModifyingDeal] = useState<SalesDeal | null>(null);
  const [modifyForm, setModifyForm] = useState({
    gifts: '',
    vasPlan: '',
    customerName: '',
    customerPhone: '',
    adminNote: ''
  });
  const [isModifyingSaving, setIsModifyingSaving] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<SalesDeal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize Store & Admin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedStore = sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id') || defaultStoreId;
      const storedName = sessionStorage.getItem('devi_user_name') || (userRole === 'super_admin' ? 'Dilip Kishnani (Super Admin)' : 'Store Manager');
      setAdminName(storedName);
      if (userRole === 'store_admin') {
        const clean = storedStore === 'DM-02' ? 'DM-02' : 'DM-01';
        setActiveStoreId(clean);
        setSelectedStoreFilter(clean);
        setEditingStoreConfigId(clean);
      }
    }
  }, [userRole, defaultStoreId]);

  // Load Deals & Tally Map
  const refreshData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    // A store admin only fetches their own store's bills; super admin fetches all.
    const dealsFilter: { status: string; storeId?: string } = { status: 'approved' };
    if (userRole === 'store_admin' && activeStoreId && activeStoreId !== 'ALL') {
      dealsFilter.storeId = activeStoreId;
    }
    const approved = await fetchSalesPipelineDeals(dealsFilter);
    setDeals(approved);
    const syncedMap = syncTallyStatusesFromDeals(approved);
    setTallyMap(syncedMap);
    if (!silent) setIsLoading(false);
  };

  useEffect(() => {
    refreshData(false);
    const unsubPipeline = subscribeToPipeline(() => refreshData(true));
    const unsubTally = subscribeToTallyUpdates(() => setTallyMap(getAllTallyStatuses()));
    return () => {
      unsubPipeline();
      unsubTally();
    };
    // Re-fetch when the active store resolves (store admin store_id loads async).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, activeStoreId]);

  // When opening Customize modal, load current config
  const handleOpenCustomize = () => {
    const config = getStoreBillConfig(editingStoreConfigId);
    setTempConfig(config);
    setShowCustomizeModal(true);
  };

  const handleSwitchCustomizeStore = (storeId: 'DM-01' | 'DM-02') => {
    setEditingStoreConfigId(storeId);
    setTempConfig(getStoreBillConfig(storeId));
  };

  const handleSaveConfig = () => {
    saveStoreBillConfig(tempConfig);
    setSaveSuccessMsg(true);
    setTimeout(() => {
      setSaveSuccessMsg(false);
      setShowCustomizeModal(false);
    }, 1000);
  };

  // Toggle Tally Uploaded Checkbox (100% Cloud Synced to Supabase)
  const handleToggleTally = async (deal: SalesDeal) => {
    const currentUploaded = tallyMap[deal.id] ? Boolean(tallyMap[deal.id]?.isUploaded) : Boolean(deal.isTallyUploaded);
    const updated = await toggleTallyStatus(deal.id, adminName, currentUploaded);
    setTallyMap(prev => ({ ...prev, [deal.id]: updated }));
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, isTallyUploaded: updated.isUploaded } : d));
    if (updated.isUploaded) {
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.8 } });
    }
  };


  // Filtered Deals
  const filteredDeals = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    return deals.filter(d => {
      // 1. Store Filter
      if (selectedStoreFilter !== 'ALL' && d.storeId !== selectedStoreFilter) return false;

      // 2. Tally Status Filter
      const isTallyUploaded = tallyMap[d.id] ? Boolean(tallyMap[d.id]?.isUploaded) : Boolean(d.isTallyUploaded);
      if (tallyFilter === 'PENDING' && isTallyUploaded) return false;
      if (tallyFilter === 'UPLOADED' && !isTallyUploaded) return false;

      // 3. Date Filter
      const dealDate = (d.decidedAt || d.submittedAt || '').split('T')[0];
      if (dateFilter === 'Today' && dealDate !== today) return false;
      if (dateFilter === 'Yesterday' && dealDate !== yesterday) return false;
      if (dateFilter === 'ThisMonth' && !dealDate.startsWith(currentMonth)) return false;

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const billNo = `25-26/${String(d.token || d.id || '').replace('SA-', '')}/DEVI`.toLowerCase();
        const match = 
          billNo.includes(q) ||
          (d.customerName || '').toLowerCase().includes(q) ||
          (d.customerPhone || '').includes(q) ||
          (d.productName || '').toLowerCase().includes(q) ||
          (d.imeiSerial || '').includes(q) ||
          (d.salesPersonName || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [deals, selectedStoreFilter, tallyFilter, dateFilter, searchQuery, tallyMap]);

  // KPI Calculations
  const totalBills = filteredDeals.length;
  const totalRevenue = filteredDeals.reduce((sum, d) => sum + d.finalPrice, 0);
  const tallyUploadedCount = filteredDeals.filter(d => (tallyMap[d.id] ? Boolean(tallyMap[d.id]?.isUploaded) : Boolean(d.isTallyUploaded))).length;
  const tallyPendingCount = totalBills - tallyUploadedCount;

  // Open A4 Invoice Modal with Customized Store Settings
  const handleOpenA4Preview = (deal: SalesDeal) => {
    const billNumber = `25-26/${String(deal.token || deal.id || '').replace('SA-', '')}/DEVI`;
    const storeCfg = getStoreBillConfig(deal.storeId);

    setSelectedInvoice({
      invoiceNo: billNumber,
      invoiceDate: (deal.decidedAt || deal.submittedAt || '').split('T')[0],
      refNo: deal.salesPersonName || 'STAFF',
      customerName: deal.customerName,
      customerPhone: deal.customerPhone,
      customerAddress: deal.customerAddress || 'Ujjain (M.P.)',
      partyName: deal.financeProvider || deal.customerName,
      productName: deal.productName,
      category: deal.category,
      hsnCode: getHsnCodeForProduct(deal.productName, deal.category),
      imeiNumber: deal.imeiSerial,
      quantity: 1,
      rateInclTax: deal.finalPrice,
      basePrice: (deal.basePrice && deal.basePrice > 0) ? deal.basePrice : ((deal as any).product_price || (deal as any).mrp || 0),
      paymentMethod: deal.paymentMethod,
      financeProvider: deal.financeProvider || undefined,
      storeName: storeCfg.storeTitle,
      storeAddress: storeCfg.address,
      storeGstin: storeCfg.gstin,
      storePhone: storeCfg.phone,
      gifts: deal.gifts,
      vasPlan: deal.vasPlan
    });
  };

  // Point 15: Super Admin Modify Deal / Swap Gift Handler
  const handleOpenModifyModal = (deal: SalesDeal) => {
    setModifyingDeal(deal);
    setModifyForm({
      gifts: Array.isArray(deal.gifts) ? deal.gifts.join(', ') : (deal.gifts || ''),
      vasPlan: deal.vasPlan || 'None',
      customerName: deal.customerName || '',
      customerPhone: deal.customerPhone || '',
      adminNote: ''
    });
  };

  const handleSaveModify = async () => {
    if (!modifyingDeal) return;
    setIsModifyingSaving(true);
    try {
      await editDealInPipeline(modifyingDeal.id, {
        gifts: modifyForm.gifts,
        vasPlan: modifyForm.vasPlan,
        customerName: modifyForm.customerName,
        customerPhone: modifyForm.customerPhone,
        adminNote: modifyForm.adminNote || 'Gift / Details updated by Super Admin',
        editedBy: adminName,
      });

      setDeals(prev => prev.map(d => d.id === modifyingDeal.id ? {
        ...d,
        gifts: modifyForm.gifts,
        vasPlan: modifyForm.vasPlan,
        customerName: modifyForm.customerName,
        customerPhone: modifyForm.customerPhone,
      } : d));

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      setModifyingDeal(null);
    } catch (err) {
      console.error('Error modifying deal:', err);
    } finally {
      setIsModifyingSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black text-amber-700 tracking-wider">
                {userRole === 'super_admin' ? 'HQ Master Billing Desk' : `Branch ${activeStoreId} Billing Desk`}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                Tally Ready
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Bills & GST Invoices Hub
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Customise Bill Button */}
          <button
            type="button"
            onClick={handleOpenCustomize}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm active:scale-95 transition-all min-h-[44px]"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>Customise Bill Format</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bills</div>
          <div className="text-2xl font-black text-slate-900">{totalBills}</div>
          <div className="text-[11px] text-slate-500 font-semibold">Audited GST tax bills</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</div>
          <div className="text-2xl font-black text-emerald-700">{formatINR(totalRevenue)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Gross billing value</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 bg-emerald-50/40 shadow-sm space-y-1">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Uploaded to Tally</span>
          </div>
          <div className="text-2xl font-black text-emerald-800">{tallyUploadedCount} Bills</div>
          <div className="text-[11px] text-emerald-700 font-bold">Synced in company accounts</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-300 bg-amber-50/50 shadow-sm space-y-1">
          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Tally Pending</span>
          </div>
          <div className="text-2xl font-black text-amber-900">{tallyPendingCount} Bills</div>
          <div className="text-[11px] text-amber-800 font-bold">Needs voucher upload</div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER TRAY ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Tally Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setTallyFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tallyFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Bills ({totalBills})
            </button>
            <button
              type="button"
              onClick={() => setTallyFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tallyFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-100/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>⏳ Tally Pending ({tallyPendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTallyFilter('UPLOADED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tallyFilter === 'UPLOADED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>✅ Tally Uploaded ({tallyUploadedCount})</span>
            </button>
          </div>

          {/* Super Admin Store Filter */}
          {userRole === 'super_admin' && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value as any)}
                aria-label="Filter by Store Branch"
                className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">🏪 All Stores (Both Branches)</option>
                <option value="DM-01">🏪 Store DM-01 (Kanthal Flagship)</option>
                <option value="DM-02">🏢 Store DM-02 (Freeganj 2.0)</option>
              </select>
            </div>
          )}
        </div>

        {/* Search Bar & Date Chips */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone, bill no, product, IMEI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['All', 'Today', 'Yesterday', 'ThisMonth'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setDateFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  dateFilter === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'ThisMonth' ? 'This Month' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BILLS TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-bold">Loading approved store bills...</div>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-base font-bold text-slate-700">No bills found matching this filter!</div>
            <div className="text-xs text-slate-400">Try changing the Tally filter, date range, or search term.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-black">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Tally Upload</th>
                  <th className="py-3.5 px-4">Bill No & Date</th>
                  {userRole === 'super_admin' && <th className="py-3.5 px-4">Branch</th>}
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Product & IMEI</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDeals.map((deal, idx) => {
                  const billNumber = `25-26/${String(deal.token || deal.id || '').replace('SA-', '')}/DEVI`;
                  const isUploaded = tallyMap[deal.id] ? Boolean(tallyMap[deal.id]?.isUploaded) : Boolean(deal.isTallyUploaded);
                  const uploadDetail = tallyMap[deal.id];

                  return (
                    <tr 
                      key={deal.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isUploaded ? 'bg-white' : 'bg-amber-50/20'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-bold text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Tally Upload Checkbox & Status */}
                      <td className="py-3.5 px-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={isUploaded}
                            onChange={() => handleToggleTally(deal)}
                            className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600 transition-transform active:scale-90"
                          />

                          <div className="flex flex-col">
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              isUploaded
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}>
                              {isUploaded ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>Tally Done</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Pending Tally</span>
                                </>
                              )}
                            </span>
                            {isUploaded && uploadDetail?.uploadedAt && (
                              <span className="text-[9px] text-slate-400 font-mono pl-1">
                                {new Date(uploadDetail.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </label>
                      </td>

                      {/* Bill No & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-slate-900 text-xs">{billNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatDateTime(deal.decidedAt || deal.submittedAt)}
                        </div>
                      </td>

                      {/* Branch (Super Admin) */}
                      {userRole === 'super_admin' && (
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span>{deal.storeId === 'DM-02' ? 'Freeganj (DM-02)' : 'Kanthal (DM-01)'}</span>
                          </span>
                        </td>
                      )}

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{deal.customerName}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{deal.customerPhone}</div>
                      </td>

                      {/* Product & IMEI */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 line-clamp-1">{deal.productName}</div>
                        {deal.imeiSerial && !['vivo', 'oppo', 'samsung', 'realme', 'none', 'na', 'n/a'].includes(deal.imeiSerial.toLowerCase()) && deal.imeiSerial.length >= 6 ? (
                          <div className="font-mono text-[11px] text-slate-500">IMEI: {deal.imeiSerial}</div>
                        ) : (
                          <div className="font-mono text-[11px] text-slate-400">-</div>
                        )}
                      </td>

                      {/* Amount & Mode */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-slate-900 text-sm font-mono">
                          {formatINR(deal.finalPrice)}
                        </div>
                        <div className="flex flex-col items-end gap-0.5 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {deal.paymentMethod}
                          </span>
                          {(deal.financeProvider || deal.paymentMethod === 'EMI') && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 whitespace-nowrap">
                              🏦 {deal.financeProvider || 'Bajaj Finance'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions: A4 Preview, Modify & Delete */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenA4Preview(deal)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 font-bold text-xs border border-slate-200 transition-all active:scale-95"
                            title="View Official A4 GST Tax Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>A4 Preview</span>
                          </button>

                          {/* Point 15: Super Admin Modify Bill & Gift Option */}
                          {userRole === 'super_admin' && (
                            <button
                              type="button"
                              onClick={() => handleOpenModifyModal(deal)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-all active:scale-95"
                              title="Modify Gift (e.g. Neckband to Buds) or Customer Details"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-600" />
                              <span>Modify</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDealToDelete(deal)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all active:scale-95"
                            title="Permanently Delete Bill & Void Sale"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 🖨️ A4 INVOICE MODAL PREVIEW ── */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={!!selectedInvoice}
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ── ⚙️ CUSTOMISE BILL FORMAT MODAL ── */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Customise Store Bill Format</h3>
                  <div className="text-[10px] text-slate-400">Changes will instantly apply to A4 PDF invoices & printouts</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                aria-label="Close Customise Store Bill Format modal"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar text-xs">
              
              {/* Store Switcher for Super Admin */}
              {userRole === 'super_admin' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-amber-900 block">
                    Select Store Branch to Customise:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchCustomizeStore('DM-01')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                        editingStoreConfigId === 'DM-01'
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-white text-slate-700 border border-amber-200'
                      }`}
                    >
                      🏪 Store DM-01 (Kanthal Flagship)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchCustomizeStore('DM-02')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                        editingStoreConfigId === 'DM-02'
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-white text-slate-700 border border-amber-200'
                      }`}
                    >
                      🏢 Store DM-02 (Freeganj 2.0)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Customising Bill For:</span>
                  <span className="font-black text-slate-900">
                    {activeStoreId === 'DM-02' ? 'Freeganj 2.0 (DM-02)' : 'Kanthal Flagship (DM-01)'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Store Name Header</label>
                  <input
                    type="text"
                    value={tempConfig.storeTitle}
                    onChange={(e) => setTempConfig({ ...tempConfig, storeTitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Branch Tagline</label>
                  <input
                    type="text"
                    value={tempConfig.tagline}
                    onChange={(e) => setTempConfig({ ...tempConfig, tagline: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Branch Printed Address</label>
                <textarea
                  rows={2}
                  value={tempConfig.address}
                  onChange={(e) => setTempConfig({ ...tempConfig, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official GSTIN</label>
                  <input
                    type="text"
                    value={tempConfig.gstin}
                    onChange={(e) => setTempConfig({ ...tempConfig, gstin: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Support Phone Numbers</label>
                  <input
                    type="text"
                    value={tempConfig.phone}
                    onChange={(e) => setTempConfig({ ...tempConfig, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Terms & Conditions of Sale</label>
                <textarea
                  rows={4}
                  value={tempConfig.terms}
                  onChange={(e) => setTempConfig({ ...tempConfig, terms: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 font-mono text-[11px] leading-relaxed"
                  placeholder="1. Goods once sold will not be taken back..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Footer Greeting Note</label>
                <input
                  type="text"
                  value={tempConfig.footerGreeting}
                  onChange={(e) => setTempConfig({ ...tempConfig, footerGreeting: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center font-bold flex items-center justify-center gap-1.5 animate-bounce">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Bill format updated successfully!</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Store Format</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 🗑️ DELETE BILL CONFIRMATION MODAL ── */}
      {dealToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Bill & Void Sale?</h3>
                <p className="text-xs text-slate-500 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Bill No:</span>
                <span className="font-mono font-bold text-brand-700">
                  {`25-26/${String(dealToDelete.token || dealToDelete.id || '').replace('SA-', '')}/DEVI`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{dealToDelete.customerName} ({dealToDelete.customerPhone})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Product:</span>
                <span className="font-bold text-slate-900">{dealToDelete.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Amount:</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{formatINR(dealToDelete.finalPrice)}</span>
              </div>
            </div>

            <p className="text-xs text-rose-700 font-semibold bg-rose-100/50 p-3 rounded-xl">
              ⚠️ Deleting this bill will permanently remove it from the Register, Day Books, Approvals Pipeline, Tally Tracking, and Cloud Database across all stores.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDealToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  const target = dealToDelete;
                  if (!target) return;
                  setIsDeleting(true);
                  
                  // 1. Instantly remove from UI in 0.01s (Optimistic UI)
                  setDeals(prev => prev.filter(d => d.id !== target.id && d.token !== target.token && d.id !== target.token));
                  setDealToDelete(null);

                  try {
                    const billNo = `25-26/${String(target.token || target.id || '').replace('SA-', '')}/DEVI`;
                    await deleteSaleDeal(target.id);
                    if (target.token) {
                      await deleteSaleDeal(target.token);
                    }
                    deleteTallyStatus(billNo);
                    deleteTallyStatus(target.id);
                    await refreshData(true);
                  } catch (e) {
                    console.error('Delete bill failed:', e);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Permanently Delete'}</span>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ── ✏️ POINT 15: SUPER ADMIN MODIFY BILL & SWAP GIFT MODAL ── */}
      {modifyingDeal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-scaleUp max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Modify Approved Bill</h3>
                  <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Super Admin HQ Override</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModifyingDeal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary Badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Bill No:</span>
                <span className="font-mono font-bold text-brand-700">
                  {`25-26/${String(modifyingDeal.token || modifyingDeal.id || '').replace('SA-', '')}/DEVI`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Product:</span>
                <span className="font-bold text-slate-900">{modifyingDeal.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Final In-Hand Price:</span>
                <span className="font-bold text-emerald-700 font-mono">{formatINR(modifyingDeal.finalPrice)}</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              
              {/* Gift Swap (Special Focus for Point 15) */}
              <div className="space-y-1.5 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
                <label className="font-black text-slate-800 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <span>Gift Item Given to Customer:</span>
                </label>
                <input
                  type="text"
                  value={modifyForm.gifts}
                  onChange={(e) => setModifyForm(prev => ({ ...prev, gifts: e.target.value }))}
                  placeholder="e.g. Neckband, Earbuds, Fast Charger..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                
                {/* 1-Click Quick Preset Chips */}
                <div className="pt-1">
                  <div className="text-[10px] text-amber-800 font-bold mb-1">Quick Select / Swap:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Buds / TWS Earbuds',
                      'Neckband',
                      'Fast Charger 33W',
                      'Tempered Glass',
                      'Back Cover',
                      'None'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setModifyForm(prev => ({ ...prev, gifts: preset === 'None' ? '' : preset }))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                          modifyForm.gifts === preset || (preset === 'None' && !modifyForm.gifts)
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Customer Name:</label>
                  <input
                    type="text"
                    value={modifyForm.customerName}
                    onChange={(e) => setModifyForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mobile Number:</label>
                  <input
                    type="text"
                    value={modifyForm.customerPhone}
                    onChange={(e) => setModifyForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* VAS Plan */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">VAS Protection Plan:</label>
                <select
                  value={modifyForm.vasPlan}
                  onChange={(e) => setModifyForm(prev => ({ ...prev, vasPlan: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="None">None</option>
                  <option value="Screen Protection">Screen Protection</option>
                  <option value="Complete Protection">Complete Protection</option>
                  <option value="Extended Warranty 1 Year">Extended Warranty 1 Year</option>
                </select>
              </div>

              {/* Admin Note */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reason / Admin Note:</label>
                <input
                  type="text"
                  value={modifyForm.adminNote}
                  onChange={(e) => setModifyForm(prev => ({ ...prev, adminNote: e.target.value }))}
                  placeholder="e.g. Customer exchanged Neckband for Earbuds after bill"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModifyingDeal(null)}
                disabled={isModifyingSaving}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModify}
                disabled={isModifyingSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isModifyingSaving ? (
                  <span>Saving Updates...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save & Update Bill</span>
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
