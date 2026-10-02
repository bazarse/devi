'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Crown, 
  Flame, 
  TrendingUp, 
  ShoppingBag, 
  Store as StoreIcon, 
  Calendar, 
  Award, 
  Sparkles, 
  Filter, 
  CheckCircle2, 
  Zap, 
  Medal, 
  Smartphone, 
  IndianRupee, 
  Users, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Eye, 
  History, 
  X, 
  Phone, 
  MessageSquare, 
  CreditCard, 
  Gift, 
  ShieldCheck, 
  ChevronRight, 
  ArrowUpDown, 
  Receipt,
  Building2,
  Clock,
  Check
} from 'lucide-react';
import { formatINR, formatDateTime, formatDate } from '@/lib/utils';
import { fetchSalesPipelineDeals, subscribeToPipeline, SalesDeal } from '@/lib/sales-pipeline';
import { getStaffUsers, StaffUser } from '@/lib/staff-service';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import { getStoreBillConfig } from '@/lib/bill-config-service';
import { InvoiceData, getHsnCodeForProduct } from '@/lib/invoice-generator';
import InvoiceModal from '@/components/invoice-modal';
import PaginationControls from '@/components/pagination-controls';
import confetti from 'canvas-confetti';

interface LeaderboardViewProps {
  initialStoreFilter?: string; // 'ALL', 'DM-01', 'DM-02'
  canSwitchStore?: boolean;
  roleTitle?: string;
}

export interface SalesmanRankItem {
  id: string;
  name: string;
  phone: string;
  storeId: string;
  storeName: string;
  unitsSold: number;
  totalRevenue: number;
  avgDealValue: number;
  topModel: string;
  deals: SalesDeal[];
}

// ── CSV Export Helper with UTF-8 BOM (Excel compatible) ──
function exportToCSV(filename: string, rows: (string | number)[][]) {
  const processCell = (cell: string | number | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = rows.map(row => row.map(processCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function LeaderboardView({
  initialStoreFilter = 'ALL',
  canSwitchStore = true,
  roleTitle = 'Store Performance Leaderboard'
}: LeaderboardViewProps) {
  const [selectedStore, setSelectedStore] = useState<string>(initialStoreFilter);
  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [stores, setStores] = useState<StoreBranch[]>(DEFAULT_STORES);
  const [isLoading, setIsLoading] = useState(true);

  // Leaderboard table controls
  const [searchSalesmanQuery, setSearchSalesmanQuery] = useState('');
  const [salesmanStatusFilter, setSalesmanStatusFilter] = useState<'all' | 'active' | 'zero'>('all');
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardPageSize, setLeaderboardPageSize] = useState(25);

  // Employee Sales History Drawer / Modal State
  const [selectedSalesman, setSelectedSalesman] = useState<SalesmanRankItem | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<string>('ALL');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // Invoice Preview Modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Keep selected store in sync when initialStoreFilter changes
  useEffect(() => {
    setSelectedStore(initialStoreFilter);
  }, [initialStoreFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const dealsFilter: { status: string; storeId?: string } = { status: 'approved' };
        if (initialStoreFilter && initialStoreFilter !== 'ALL') {
          dealsFilter.storeId = initialStoreFilter;
        }

        const [approvedDeals, staff, storeList] = await Promise.all([
          fetchSalesPipelineDeals(dealsFilter),
          getStaffUsers(),
          getActiveStores()
        ]);

        if (isMounted) {
          setDeals(approvedDeals);
          setStaffUsers(staff);
          setStores(storeList);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading leaderboard data:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    const unsub = subscribeToPipeline(() => {
      loadData();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [initialStoreFilter]);

  // Filter deals based on selected time period
  const filteredDealsByTime = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return deals.filter(d => {
      const dealTime = new Date(d.decidedAt || d.submittedAt || Date.now()).getTime();
      if (timePeriod === 'today') return dealTime >= startOfToday;
      if (timePeriod === 'week') return dealTime >= startOfWeek;
      if (timePeriod === 'month') return dealTime >= startOfMonth;
      return true; // 'all'
    });
  }, [deals, timePeriod]);

  // Aggregate ranking by salesman
  const rankedSalesmen: SalesmanRankItem[] = useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string;
      storeId: string;
      units: number;
      revenue: number;
      models: Record<string, number>;
      deals: SalesDeal[];
    }>();

    // Initialize with all registered salesmen
    staffUsers.forEach(staff => {
      if (staff.role === 'salesman') {
        const key = staff.phone || staff.full_name;
        map.set(key, {
          name: staff.full_name,
          phone: staff.phone,
          storeId: staff.store_id || 'DM-01',
          units: 0,
          revenue: 0,
          models: {},
          deals: []
        });
      }
    });

    // Populate with approved deals in current time period
    filteredDealsByTime.forEach(deal => {
      const key = deal.salesPersonPhone || deal.salesPersonName || 'Staff Salesman';
      const existing = map.get(key) || {
        name: deal.salesPersonName || 'Staff Salesman',
        phone: deal.salesPersonPhone || '',
        storeId: deal.storeId || 'DM-01',
        units: 0,
        revenue: 0,
        models: {},
        deals: []
      };

      existing.units += 1;
      existing.revenue += (deal.finalPrice || 0);
      existing.deals.push(deal);

      if (deal.productName) {
        existing.models[deal.productName] = (existing.models[deal.productName] || 0) + 1;
      }

      map.set(key, existing);
    });

    const list: SalesmanRankItem[] = Array.from(map.entries()).map(([id, val]) => {
      let topModelName = 'N/A';
      let maxCount = 0;
      Object.entries(val.models).forEach(([m, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topModelName = m;
        }
      });

      const storeObj = stores.find(s => s.code === val.storeId);
      const storeName = storeObj ? (val.storeId === 'DM-01' ? 'DM-01 Kanthal' : 'DM-02 Freeganj') : val.storeId;
      const avgDealValue = val.units > 0 ? Math.round(val.revenue / val.units) : 0;

      // Sort deals newest first
      const sortedDeals = [...val.deals].sort((a, b) => {
        const tA = new Date(a.decidedAt || a.submittedAt || 0).getTime();
        const tB = new Date(b.decidedAt || b.submittedAt || 0).getTime();
        return tB - tA;
      });

      return {
        id,
        name: val.name,
        phone: val.phone,
        storeId: val.storeId,
        storeName,
        unitsSold: val.units,
        totalRevenue: val.revenue,
        avgDealValue,
        topModel: topModelName,
        deals: sortedDeals
      };
    });

    // Filter by store if not 'ALL'
    const storeFiltered = selectedStore === 'ALL' 
      ? list 
      : list.filter(item => item.storeId === selectedStore);

    // Sort: Primary by Units Sold (DESC), Secondary by Total Revenue (DESC)
    return storeFiltered.sort((a, b) => {
      if (b.unitsSold !== a.unitsSold) {
        return b.unitsSold - a.unitsSold;
      }
      return b.totalRevenue - a.totalRevenue;
    });
  }, [filteredDealsByTime, staffUsers, stores, selectedStore]);

  // Keep selectedSalesman updated with latest deals when deals change
  useEffect(() => {
    if (selectedSalesman) {
      const refreshed = rankedSalesmen.find(s => s.id === selectedSalesman.id || (s.phone && s.phone === selectedSalesman.phone) || s.name === selectedSalesman.name);
      if (refreshed) {
        setSelectedSalesman(refreshed);
      }
    }
  }, [rankedSalesmen]);

  // Filtered salesmen for leaderboard table
  const filteredSalesmenList = useMemo(() => {
    const q = searchSalesmanQuery.toLowerCase().trim();
    return rankedSalesmen.filter(s => {
      const matchesSearch = !q || 
        s.name.toLowerCase().includes(q) || 
        s.phone.includes(q) || 
        s.storeName.toLowerCase().includes(q) ||
        s.topModel.toLowerCase().includes(q);

      const matchesStatus = 
        salesmanStatusFilter === 'all' ? true :
        salesmanStatusFilter === 'active' ? s.unitsSold > 0 :
        s.unitsSold === 0;

      return matchesSearch && matchesStatus;
    });
  }, [rankedSalesmen, searchSalesmanQuery, salesmanStatusFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setLeaderboardPage(1);
  }, [searchSalesmanQuery, salesmanStatusFilter, selectedStore, timePeriod]);

  // Paginated salesmen list for table
  const paginatedSalesmen = useMemo(() => {
    const from = (leaderboardPage - 1) * leaderboardPageSize;
    return filteredSalesmenList.slice(from, from + leaderboardPageSize);
  }, [filteredSalesmenList, leaderboardPage, leaderboardPageSize]);

  // Podium Top 3
  const top1 = rankedSalesmen[0];
  const top2 = rankedSalesmen[1];
  const top3 = rankedSalesmen[2];

  const totalUnitsInPeriod = rankedSalesmen.reduce((acc, s) => acc + s.unitsSold, 0);
  const totalRevenueInPeriod = rankedSalesmen.reduce((acc, s) => acc + s.totalRevenue, 0);
  const activeStaffCount = rankedSalesmen.filter(s => s.unitsSold > 0).length;

  // ── Open Salesman History Drawer ──
  const handleOpenSalesmanHistory = (salesman: SalesmanRankItem) => {
    setSelectedSalesman(salesman);
    setHistorySearchQuery('');
    setHistoryPeriodFilter('all');
    setHistoryPaymentFilter('ALL');
    setHistoryPage(1);
  };

  // ── Filtered Deals inside Employee History Modal ──
  const filteredEmployeeDeals = useMemo(() => {
    if (!selectedSalesman) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const q = historySearchQuery.toLowerCase().trim();

    return selectedSalesman.deals.filter(deal => {
      // 1. Time Filter
      const dealTime = new Date(deal.decidedAt || deal.submittedAt || Date.now()).getTime();
      if (historyPeriodFilter === 'today' && dealTime < startOfToday) return false;
      if (historyPeriodFilter === 'week' && dealTime < startOfWeek) return false;
      if (historyPeriodFilter === 'month' && dealTime < startOfMonth) return false;

      // 2. Payment Method Filter
      if (historyPaymentFilter !== 'ALL') {
        if (historyPaymentFilter === 'EMI' && deal.paymentMethod !== 'EMI') return false;
        if (historyPaymentFilter === 'Cash' && deal.paymentMethod !== 'Cash') return false;
        if (historyPaymentFilter === 'UPI' && deal.paymentMethod !== 'UPI') return false;
        if (historyPaymentFilter === 'Card' && deal.paymentMethod !== 'Card') return false;
      }

      // 3. Search query
      if (q) {
        const matchesToken = (deal.token || deal.id || '').toLowerCase().includes(q);
        const matchesCust = (deal.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (deal.customerPhone || '').includes(q);
        const matchesProd = (deal.productName || '').toLowerCase().includes(q);
        const matchesImei = (deal.imeiSerial || '').toLowerCase().includes(q);
        const matchesFinance = (deal.financeProvider || '').toLowerCase().includes(q);
        if (!matchesToken && !matchesCust && !matchesPhone && !matchesProd && !matchesImei && !matchesFinance) {
          return false;
        }
      }

      return true;
    });
  }, [selectedSalesman, historySearchQuery, historyPeriodFilter, historyPaymentFilter]);

  // Reset history page when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchQuery, historyPeriodFilter, historyPaymentFilter]);

  const paginatedEmployeeDeals = useMemo(() => {
    const from = (historyPage - 1) * historyPageSize;
    return filteredEmployeeDeals.slice(from, from + historyPageSize);
  }, [filteredEmployeeDeals, historyPage, historyPageSize]);

  // ── Open A4 Invoice Modal ──
  const handleOpenA4Invoice = (deal: SalesDeal) => {
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

  // ── 1. Export Leaderboard Summary CSV ──
  const handleExportLeaderboardSummary = () => {
    const periodLabel = timePeriod === 'today' ? 'Today' : timePeriod === 'week' ? 'This Week' : timePeriod === 'month' ? 'This Month' : 'All Time';
    const storeLabel = selectedStore === 'ALL' ? 'All Stores' : selectedStore === 'DM-01' ? 'DM-01 Kanthal' : 'DM-02 Freeganj';
    const dateStr = new Date().toISOString().split('T')[0];

    const headers = [
      'Rank',
      'Salesman Name',
      'Mobile Phone',
      'Store Branch',
      'Units Sold',
      'Total Revenue (INR)',
      'Average Deal Value (INR)',
      'Top Selling Model',
      'Reporting Period',
      'Store Filter',
      'Exported Date'
    ];

    const rows = rankedSalesmen.map((s, idx) => [
      idx + 1,
      s.name,
      s.phone || 'N/A',
      s.storeName,
      s.unitsSold,
      s.totalRevenue,
      s.avgDealValue,
      s.topModel,
      periodLabel,
      storeLabel,
      dateStr
    ]);

    exportToCSV(`Devi_Mobile_Leaderboard_${periodLabel.replace(/\s+/g, '_')}_${dateStr}.csv`, [headers, ...rows]);
  };

  // ── 2. Export Employee Sales History CSV ──
  const handleExportEmployeeDeals = (salesman: SalesmanRankItem) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const sanitizedName = salesman.name.replace(/[^a-zA-Z0-9]/g, '_');

    const headers = [
      'Deal Token',
      'Date & Time',
      'Salesman Name',
      'Salesman Phone',
      'Store Branch',
      'Customer Name',
      'Customer Phone',
      'Customer Address',
      'Product Model',
      'Category',
      'IMEI / Serial',
      'Base Price / MRP (INR)',
      'Final Price (INR)',
      'Discount (INR)',
      'Payment Method',
      'Finance Provider',
      'Gifts Attached',
      'VAS Plan',
      'Exchange Device',
      'Exchange Value (INR)',
      'Approved By',
      'Status'
    ];

    const rows = salesman.deals.map(d => [
      d.token || d.id,
      formatDateTime(d.decidedAt || d.submittedAt),
      d.salesPersonName,
      d.salesPersonPhone || '',
      d.storeId === 'DM-02' ? 'Freeganj (DM-02)' : 'Kanthal (DM-01)',
      d.customerName,
      d.customerPhone,
      d.customerAddress || 'Ujjain (M.P.)',
      d.productName,
      d.category,
      d.imeiSerial || 'N/A',
      d.basePrice || d.finalPrice,
      d.finalPrice,
      d.discount || 0,
      d.paymentMethod,
      d.financeProvider || 'N/A',
      d.gifts || 'None',
      d.vasPlan || 'None',
      d.oldDeviceName ? `${d.oldDeviceName} (${d.oldDeviceImei || ''})` : 'None',
      d.exchangeValue || 0,
      d.decidedBy || 'Store Admin',
      d.status
    ]);

    exportToCSV(`Devi_Sales_History_${sanitizedName}_${dateStr}.csv`, [headers, ...rows]);
  };

  // ── 3. Export All Deal Transactions Across Store/Chain ──
  const handleExportAllTransactions = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const periodLabel = timePeriod === 'today' ? 'Today' : timePeriod === 'week' ? 'This_Week' : timePeriod === 'month' ? 'This_Month' : 'All_Time';

    const headers = [
      'Deal Token',
      'Date & Time',
      'Store ID',
      'Salesman Name',
      'Salesman Phone',
      'Customer Name',
      'Customer Phone',
      'Product Model',
      'Category',
      'IMEI / Serial',
      'Base Price (INR)',
      'Final Price (INR)',
      'Discount (INR)',
      'Payment Mode',
      'Finance Provider',
      'Gifts',
      'VAS Plan',
      'Status'
    ];

    const rows = filteredDealsByTime.map(d => [
      d.token || d.id,
      formatDateTime(d.decidedAt || d.submittedAt),
      d.storeId,
      d.salesPersonName,
      d.salesPersonPhone || '',
      d.customerName,
      d.customerPhone,
      d.productName,
      d.category,
      d.imeiSerial || 'N/A',
      d.basePrice || d.finalPrice,
      d.finalPrice,
      d.discount || 0,
      d.paymentMethod,
      d.financeProvider || 'None',
      d.gifts || 'None',
      d.vasPlan || 'None',
      d.status
    ]);

    exportToCSV(`Devi_All_Transactions_${periodLabel}_${dateStr}.csv`, [headers, ...rows]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      
      {/* ── 1. HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Devi Mobile Champion League</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Sales Leaderboard & Performance Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Track top sales executives in real-time. View detailed employee deal history, invoice logs, and export performance reports.
            </p>
          </div>

          {/* Quick Metrics & Export Suite */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 p-3.5 sm:p-4 rounded-2xl text-center min-w-[100px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Units</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                {totalUnitsInPeriod}
              </div>
            </div>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 p-3.5 sm:p-4 rounded-2xl text-center min-w-[130px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Volume</div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                {formatINR(totalRevenueInPeriod)}
              </div>
            </div>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 p-3.5 sm:p-4 rounded-2xl text-center min-w-[90px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Active Staff</div>
              <div className="text-lg sm:text-xl font-black text-blue-400 mt-0.5">
                {activeStaffCount} / {rankedSalesmen.length}
              </div>
            </div>
          </div>
        </div>

        {/* Global Export Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Reports for Accounting & Audits:</span>
          </span>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportLeaderboardSummary}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all active:scale-95 shadow-sm min-h-[40px]"
              title="Download summary ranking of all staff in CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Leaderboard (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleExportAllTransactions}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 shadow-sm min-h-[40px]"
              title="Download full list of all sales deals in CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export All Deals ({filteredDealsByTime.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. CONTROLS: STORE FILTER & TIME PERIOD TABS ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Store Selector */}
        {canSwitchStore ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
              <StoreIcon className="w-3.5 h-3.5 text-brand-600" />
              <span>Store:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedStore('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] ${
                selectedStore === 'ALL'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Stores (Chain)
            </button>
            <button
              type="button"
              onClick={() => setSelectedStore('DM-01')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] ${
                selectedStore === 'DM-01'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              DM-01 (Kanthal)
            </button>
            <button
              type="button"
              onClick={() => setSelectedStore('DM-02')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] ${
                selectedStore === 'DM-02'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              DM-02 (Freeganj)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <StoreIcon className="w-4 h-4 text-brand-600" />
            <span>Store: {selectedStore === 'DM-02' ? 'DM-02 Freeganj' : 'DM-01 Kanthal'}</span>
          </div>
        )}

        {/* Time Period Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          {(['today', 'week', 'month', 'all'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setTimePeriod(period)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] capitalize ${
                timePeriod === period
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>

      </div>

      {/* ── 3. PODIUM SHOWCASE (TOP 3 PERFORMERS) ── */}
      {rankedSalesmen.length > 0 && totalUnitsInPeriod > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* RANK #2 (Silver) */}
          <div className="order-2 md:order-1 bg-gradient-to-b from-slate-100 to-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm flex flex-col items-center text-center relative overflow-hidden md:mt-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-black text-lg mb-3 shadow-inner">
              🥈 #2
            </div>
            {top2 ? (
              <>
                <h3 className="text-lg font-black text-slate-900">{top2.name}</h3>
                <span className="text-xs font-semibold text-slate-500 mb-4">{top2.storeName}</span>
                
                <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Units Sold</span>
                    <strong className="text-slate-900 text-sm font-black">{top2.unitsSold} Units</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Volume</span>
                    <strong className="text-emerald-700 font-bold">{formatINR(top2.totalRevenue)}</strong>
                  </div>
                  {top2.topModel !== 'N/A' && (
                    <div className="text-[10px] text-slate-400 truncate pt-1 border-t border-slate-200/60">
                      Top: {top2.topModel}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenSalesmanHistory(top2)}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 min-h-[40px]"
                  >
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Deals History ({top2.deals.length})</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 my-auto py-8">No Salesman at #2</div>
            )}
          </div>

          {/* RANK #1 (Gold Champion) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-amber-50 to-white p-6 sm:p-8 rounded-3xl border-2 border-amber-400 shadow-xl shadow-amber-500/10 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              <span>Rank 1</span>
            </div>

            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-amber-300 flex items-center justify-center text-slate-950 font-black text-2xl mb-3 shadow-lg shadow-amber-500/30">
              🥇
            </div>

            {top1 ? (
              <>
                <h3 className="text-xl font-black text-slate-900">{top1.name}</h3>
                <span className="text-xs font-bold text-amber-700 mb-4">{top1.storeName}</span>
                
                <div className="w-full bg-amber-100/60 p-4 rounded-2xl border border-amber-300/80 space-y-2.5 mt-auto">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-900 font-bold">Units Sold</span>
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-base font-black shadow-sm">
                      {top1.unitsSold} Units
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-900/80 font-bold">Total Sales</span>
                    <strong className="text-emerald-800 text-sm font-black">{formatINR(top1.totalRevenue)}</strong>
                  </div>
                  {top1.topModel !== 'N/A' && (
                    <div className="text-[11px] text-amber-800 font-semibold truncate pt-1.5 border-t border-amber-200">
                      🔥 Top Model: {top1.topModel}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenSalesmanHistory(top1)}
                    className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 min-h-[44px]"
                  >
                    <History className="w-4 h-4" />
                    <span>View Gold Deals History ({top1.deals.length})</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 my-auto py-8">No Sales Recorded</div>
            )}
          </div>

          {/* RANK #3 (Bronze) */}
          <div className="order-3 bg-gradient-to-b from-orange-50/50 to-white p-6 rounded-3xl border-2 border-amber-700/30 shadow-sm flex flex-col items-center text-center relative overflow-hidden md:mt-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-700/30 flex items-center justify-center text-amber-900 font-black text-lg mb-3 shadow-inner">
              🥉 #3
            </div>
            {top3 ? (
              <>
                <h3 className="text-lg font-black text-slate-900">{top3.name}</h3>
                <span className="text-xs font-semibold text-slate-500 mb-4">{top3.storeName}</span>
                
                <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Units Sold</span>
                    <strong className="text-slate-900 text-sm font-black">{top3.unitsSold} Units</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Volume</span>
                    <strong className="text-emerald-700 font-bold">{formatINR(top3.totalRevenue)}</strong>
                  </div>
                  {top3.topModel !== 'N/A' && (
                    <div className="text-[10px] text-slate-400 truncate pt-1 border-t border-slate-200/60">
                      Top: {top3.topModel}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenSalesmanHistory(top3)}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 min-h-[40px]"
                  >
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Deals History ({top3.deals.length})</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 my-auto py-8">No Salesman at #3</div>
            )}
          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
            🏆
          </div>
          <h3 className="text-lg font-black text-slate-900">
            No Approved Sales in Selected Period
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once salesmen create deals from POS and managers approve them, the live unit-wise ranking and Top 3 podium will appear automatically!
          </p>
        </div>
      )}

      {/* ── 4. COMPLETE RANKING TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">Complete Leaderboard Standings</h2>
              <p className="text-xs text-slate-500">Click &quot;View History&quot; on any employee to inspect every deal submitted</p>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setSalesmanStatusFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                salesmanStatusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Staff ({rankedSalesmen.length})
            </button>
            <button
              type="button"
              onClick={() => setSalesmanStatusFilter('active')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                salesmanStatusFilter === 'active'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Sellers ({activeStaffCount})
            </button>
            <button
              type="button"
              onClick={() => setSalesmanStatusFilter('zero')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                salesmanStatusFilter === 'zero'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Zero Sales ({rankedSalesmen.length - activeStaffCount})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee by name, phone number, branch, or top model..."
            value={searchSalesmanQuery}
            onChange={(e) => setSearchSalesmanQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          />
        </div>

        {/* Table Container with mobile horizontal scroll */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-14 text-center">Rank</th>
                <th className="py-3.5 px-4">Sales Executive</th>
                <th className="py-3.5 px-4">Store Branch</th>
                <th className="py-3.5 px-4 text-center">Units Sold</th>
                <th className="py-3.5 px-4 text-right">Total Revenue (₹)</th>
                <th className="py-3.5 px-4 text-right">Avg Deal Value</th>
                <th className="py-3.5 px-4">Top Sold Model</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSalesmen.length > 0 ? (
                paginatedSalesmen.map((salesman) => {
                  // Find original rank index in rankedSalesmen
                  const originalIndex = rankedSalesmen.findIndex(s => s.id === salesman.id);
                  const rank = originalIndex !== -1 ? originalIndex + 1 : 1;
                  const isTop1 = rank === 1 && salesman.unitsSold > 0;
                  const isTop2 = rank === 2 && salesman.unitsSold > 0;
                  const isTop3 = rank === 3 && salesman.unitsSold > 0;

                  return (
                    <tr 
                      key={salesman.id}
                      className={`hover:bg-brand-50/40 transition-colors ${
                        isTop1 ? 'bg-amber-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-black">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-950 text-xs shadow-sm">
                            🥇 1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 text-xs">
                            🥈 2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-200 text-amber-900 text-xs">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">#{rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{salesman.name}</span>
                          {salesman.unitsSold >= 5 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-black">
                              🔥 Star
                            </span>
                          )}
                        </div>
                        {salesman.phone && (
                          <div className="text-[11px] text-slate-400 font-mono">{salesman.phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span>{salesman.storeName}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                          salesman.unitsSold > 0 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {salesman.unitsSold} {salesman.unitsSold === 1 ? 'Unit' : 'Units'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm font-mono">
                        {formatINR(salesman.totalRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-600 text-xs font-mono">
                        {formatINR(salesman.avgDealValue)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {salesman.topModel !== 'N/A' ? (
                          <span className="font-medium text-slate-800">{salesman.topModel}</span>
                        ) : (
                          <span className="text-slate-400 italic">No sales yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenSalesmanHistory(salesman)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 transition-all active:scale-95 shadow-xs min-h-[38px]"
                            title="Inspect all deals submitted by this employee"
                          >
                            <History className="w-3.5 h-3.5 text-brand-600" />
                            <span>View History ({salesman.deals.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportEmployeeDeals(salesman)}
                            disabled={salesman.deals.length === 0}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Export this employee's deals to CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No salesmen records matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS FOR LEADERBOARD ── */}
        <PaginationControls
          currentPage={leaderboardPage}
          totalItems={filteredSalesmenList.length}
          pageSize={leaderboardPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          itemLabel="sales executives"
          onPageChange={setLeaderboardPage}
          onPageSizeChange={(size) => {
            setLeaderboardPageSize(size);
            setLeaderboardPage(1);
          }}
        />
      </div>

      {/* ── 5. EMPLOYEE SALES HISTORY SLIDE-OVER DRAWER / MODAL ── */}
      {selectedSalesman && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp my-auto">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
                  {selectedSalesman.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                      Staff Sales Audit Trail
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                      {selectedSalesman.storeName}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {selectedSalesman.name}
                  </h2>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Phone: {selectedSalesman.phone || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Modal Header Actions */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleExportEmployeeDeals(selectedSalesman)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 min-h-[40px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Export History (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSalesman(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="Close History Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Salesman Performance KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Units Sold</span>
                <span className="text-lg font-black text-slate-900">{selectedSalesman.unitsSold} Units</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sales Value</span>
                <span className="text-lg font-black text-emerald-700">{formatINR(selectedSalesman.totalRevenue)}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Average Ticket Size</span>
                <span className="text-lg font-black text-brand-700">{formatINR(selectedSalesman.avgDealValue)}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Top Selling Model</span>
                <span className="text-xs font-black text-slate-800 line-clamp-1">{selectedSalesman.topModel}</span>
              </div>
            </div>

            {/* Filter Bar inside Modal */}
            <div className="p-4 sm:p-5 bg-white border-b border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by customer, phone, device model, IMEI, or deal token..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {/* Period Filter */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                    {(['all', 'today', 'week', 'month'] as const).map((pf) => (
                      <button
                        key={pf}
                        type="button"
                        onClick={() => setHistoryPeriodFilter(pf)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all capitalize ${
                          historyPeriodFilter === pf
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {pf === 'all' ? 'All Time' : pf === 'today' ? 'Today' : pf === 'week' ? 'Week' : 'Month'}
                      </button>
                    ))}
                  </div>

                  {/* Payment Method Filter */}
                  <select
                    value={historyPaymentFilter}
                    onChange={(e) => setHistoryPaymentFilter(e.target.value)}
                    className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 text-xs focus:outline-none shrink-0 min-h-[36px]"
                  >
                    <option value="ALL">All Payment Modes</option>
                    <option value="Cash">Cash Only</option>
                    <option value="UPI">UPI Only</option>
                    <option value="Card">Card Only</option>
                    <option value="EMI">EMI / Finance</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Showing {filteredEmployeeDeals.length} of {selectedSalesman.deals.length} total deals submitted</span>
              </div>
            </div>

            {/* Scrollable Deals History Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {filteredEmployeeDeals.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                    🔍
                  </div>
                  <h3 className="text-base font-black text-slate-800">No Deals Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No approved sale transactions match the current search or date criteria for {selectedSalesman.name}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-3 px-3">Date & Time</th>
                          <th className="py-3 px-3">Deal Token</th>
                          <th className="py-3 px-3">Customer Details</th>
                          <th className="py-3 px-3">Product & IMEI</th>
                          <th className="py-3 px-3 text-right">Price / Discount</th>
                          <th className="py-3 px-3">Payment & Finance</th>
                          <th className="py-3 px-3">Gifts & VAS</th>
                          <th className="py-3 px-3 text-center">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedEmployeeDeals.map((deal) => {
                          const billNo = `25-26/${String(deal.token || deal.id).replace('SA-', '')}/DEVI`;
                          const cleanPhone = String(deal.customerPhone || '').replace(/\D/g, '');

                          return (
                            <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-bold text-slate-900 text-xs">
                                  {formatDate(deal.decidedAt || deal.submittedAt)}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {new Date(deal.decidedAt || deal.submittedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="px-2 py-1 rounded bg-slate-100 text-slate-800 font-mono font-bold text-[11px]">
                                  {deal.token || deal.id}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{deal.customerName}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <a
                                    href={`tel:${deal.customerPhone}`}
                                    className="text-[11px] text-brand-600 hover:underline font-mono font-bold"
                                  >
                                    {deal.customerPhone}
                                  </a>
                                  {cleanPhone && (
                                    <a
                                      href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${deal.customerName}, greeting from Devi Mobile! Regarding your purchase of ${deal.productName}, please contact us for any service support.`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                                      title="WhatsApp Customer"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-800 max-w-[200px] truncate">{deal.productName}</div>
                                <div className="text-[10px] text-slate-400">{deal.category}</div>
                                {deal.imeiSerial && deal.imeiSerial.length >= 6 && (
                                  <div className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                    IMEI: {deal.imeiSerial}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="font-black text-slate-900 text-sm font-mono">
                                  {formatINR(deal.finalPrice)}
                                </div>
                                {deal.discount && deal.discount > 0 ? (
                                  <div className="text-[10px] text-emerald-600 font-bold">
                                    Disc: -{formatINR(deal.discount)}
                                  </div>
                                ) : null}
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-block w-fit bg-slate-100 text-slate-800">
                                    {deal.paymentMethod}
                                  </span>
                                  {deal.financeProvider && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block w-fit mt-0.5">
                                      🏦 {deal.financeProvider}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-xs max-w-[150px]">
                                {deal.gifts && deal.gifts !== 'None' ? (
                                  <div className="text-amber-800 font-bold text-[11px] truncate flex items-center gap-1">
                                    <Gift className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span className="truncate">{deal.gifts}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                                {deal.vasPlan && deal.vasPlan !== 'None' && (
                                  <div className="text-emerald-700 font-bold text-[10px] truncate flex items-center gap-1 mt-0.5">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{deal.vasPlan}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenA4Invoice(deal)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 font-bold text-xs border border-slate-200 transition-all active:scale-95"
                                  title="View Official A4 GST Tax Invoice"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Bill</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
                    {paginatedEmployeeDeals.map((deal) => {
                      const cleanPhone = String(deal.customerPhone || '').replace(/\D/g, '');

                      return (
                        <div
                          key={deal.id}
                          className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                              {deal.token || deal.id}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              {formatDateTime(deal.decidedAt || deal.submittedAt)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black text-slate-900">{deal.customerName}</h4>
                              <span className="text-sm font-black text-emerald-700 font-mono">
                                {formatINR(deal.finalPrice)}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-brand-700 flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5 text-brand-600" />
                              <span>{deal.productName}</span>
                            </div>
                            {deal.imeiSerial && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                IMEI: {deal.imeiSerial}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Payment Mode</span>
                              <span className="font-bold text-slate-800">{deal.paymentMethod}</span>
                              {deal.financeProvider && (
                                <span className="block text-[10px] font-bold text-amber-800">
                                  {deal.financeProvider}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Discount</span>
                              <span className="font-bold text-slate-700">
                                {deal.discount ? formatINR(deal.discount) : '₹0'}
                              </span>
                            </div>
                          </div>

                          {deal.gifts && deal.gifts !== 'None' && (
                            <div className="text-xs bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-900 font-bold flex items-center gap-1.5">
                              <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Gifts: {deal.gifts}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${deal.customerName}, greeting from Devi Mobile!`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs min-h-[40px]"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            <a
                              href={`tel:${deal.customerPhone}`}
                              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 min-h-[40px]"
                            >
                              <Phone className="w-3.5 h-3.5 text-brand-600" />
                              <span>Call</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleOpenA4Invoice(deal)}
                              className="py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 flex items-center justify-center gap-1 min-h-[40px]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Bill</span>
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls inside Modal */}
                  <PaginationControls
                    currentPage={historyPage}
                    totalItems={filteredEmployeeDeals.length}
                    pageSize={historyPageSize}
                    pageSizeOptions={[10, 20, 50]}
                    itemLabel="deals"
                    onPageChange={setHistoryPage}
                    onPageSizeChange={(sz) => {
                      setHistoryPageSize(sz);
                      setHistoryPage(1);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                Staff ID: {selectedSalesman.id} • Registered Store: {selectedSalesman.storeName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedSalesman(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors min-h-[40px]"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 6. A4 INVOICE MODAL PREVIEW ── */}
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
