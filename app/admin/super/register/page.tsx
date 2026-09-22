'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  IndianRupee, 
  CreditCard, 
  Smartphone, 
  QrCode, 
  Landmark, 
  ShieldCheck,
  Building2,
  Gift,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Repeat,
  Trash2
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import { fetchSalesPipelineDeals, subscribeToPipeline, deleteSaleDeal, SalesDeal } from '@/lib/sales-pipeline';
import InvoiceModal from '@/components/invoice-modal';
import { InvoiceData, getHsnCodeForProduct } from '@/lib/invoice-generator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Evaluates dates strictly in Indian Standard Time ('Asia/Kolkata')
function getIstDateString(dateInput?: string | number | Date): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput).split('T')[0] || '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export default function SuperAdminRegisterPage() {
  const [approvedDeals, setApprovedDeals] = useState<SalesDeal[]>([]);
  const [storesList, setStoresList] = useState<StoreBranch[]>(DEFAULT_STORES);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'Today' | 'Yesterday' | 'ThisMonth' | 'All' | 'Custom'>('Today');
  const [customDate, setCustomDate] = useState(getIstDateString(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rowToDelete, setRowToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadStores() {
      const stores = await getActiveStores();
      setStoresList(stores);
    }
    loadStores();
  }, []);

  const loadRegister = async (silent = false) => {
    if (!silent) setIsLoading(true);
    const deals = await fetchSalesPipelineDeals({ status: 'approved' });
    setApprovedDeals(deals);
    if (!silent) setIsLoading(false);
  };

  useEffect(() => {
    loadRegister(false);
    const unsub = subscribeToPipeline(() => {
      loadRegister(true);
    });
    return () => unsub();
  }, []);

  // Filter Deals by Store, Date (evaluated strictly in Indian Standard Time 'Asia/Kolkata'), and Search Query
  const filteredDeals = useMemo(() => {
    const today = getIstDateString(new Date());
    const yesterdayDate = getIstDateString(new Date(Date.now() - 86400000));
    const currentMonth = today.slice(0, 7);

    return approvedDeals.filter(d => {
      // 1. Store Filter
      if (selectedStoreFilter !== 'ALL') {
        const cleanFilter = selectedStoreFilter.toUpperCase();
        const cleanDealStore = (d.storeId || '').toUpperCase();
        const match = cleanDealStore === cleanFilter ||
          (cleanFilter === 'DM-01' && (cleanDealStore.includes('01') || cleanDealStore.includes('KANTHAL') || cleanDealStore.includes('3BE5') || cleanDealStore.includes('STORE-DM-01'))) ||
          (cleanFilter === 'DM-02' && (cleanDealStore.includes('02') || cleanDealStore.includes('FREEGANJ') || cleanDealStore.includes('7705') || cleanDealStore.includes('STORE-DM-02')));
        if (!match) return false;
      }

      // 2. Date Filter
      const dealDate = getIstDateString(d.decidedAt || d.submittedAt);
      if (dateFilter === 'Today' && dealDate !== today) return false;
      if (dateFilter === 'Yesterday' && dealDate !== yesterdayDate) return false;
      if (dateFilter === 'ThisMonth' && !dealDate.startsWith(currentMonth)) return false;
      if (dateFilter === 'Custom' && dealDate !== customDate) return false;

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const billNo = `25-26/${String(d.token || d.id || '').replace('SA-', '')}/DEVI`.toLowerCase();
        const match = 
          billNo.includes(q) ||
          (d.customerName || '').toLowerCase().includes(q) ||
          (d.customerPhone || '').includes(q) ||
          (d.productName || '').toLowerCase().includes(q) ||
          (d.imeiSerial || '').includes(q) ||
          (d.salesPersonName || '').toLowerCase().includes(q) ||
          (d.storeName || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [approvedDeals, selectedStoreFilter, dateFilter, customDate, searchQuery]);

  // Audited Financial Records
  const registerData = useMemo(() => {
    return filteredDeals.map((d, index) => {
      const billNumber = `25-26/${String(d.token || d.id || '').replace('SA-', '')}/DEVI`;

      const isEmi = d.paymentMethod === 'EMI';

      const cashTotal = isEmi ? (d.downPaymentCash || 0) : (d.cashAmount || 0);
      const upiTotal = isEmi ? (d.downPaymentUpi || 0) : (d.upiAmount || 0);
      const cardTotal = isEmi ? (d.downPaymentCard || 0) : (d.cardAmount || 0);
      const neftTotal = (d as any).neftAmount || 0;
      const disbursement = isEmi ? (d.disbursementAmount || 0) : 0;
      const exchange = d.exchangeValue || 0;

      // Include exchange in totalCollected so exchange deals don't inflate physical cash
      const totalCollected = cashTotal + upiTotal + cardTotal + neftTotal + disbursement + exchange;
      const adjustedCash = (!isEmi && totalCollected === 0) ? d.finalPrice : cashTotal;

      return {
        id: d.id,
        date: d.decidedAt || d.submittedAt,
        storeId: d.storeId,
        storeName: d.storeName || (d.storeId === 'DM-02' ? 'Freeganj 2.0' : 'Kanthal Flagship'),
        billNumber,
        customerName: d.customerName,
        phone: d.customerPhone,
        customerAddress: d.customerAddress || 'Ujjain (M.P.)',
        productName: d.productName,
        category: d.category || 'Mobile Phone',
        imeiSerial: d.imeiSerial,
        mrp: (d.basePrice && d.basePrice > d.finalPrice) ? d.basePrice : (d.finalPrice + (d.discount || 0)),
        discount: d.discount || 0,
        finalAmount: d.finalPrice,
        paymentType: d.paymentMethod,
        financeProvider: d.financeProvider || (isEmi ? 'Bajaj Finance Limited' : null),
        cash: adjustedCash,
        upi: upiTotal,
        card: cardTotal,
        neft: neftTotal,
        disbursement,
        exchange,
        vasPlan: d.vasPlan || 'None',
        gifts: d.gifts || 'None',
        salesman: d.salesPersonName || 'Salesman',
        approvedBy: d.decidedBy || 'Super Admin HQ'
      };
    });
  }, [filteredDeals]);

  // Compute 8 Financial Balance Metrics
  const totalRecords = registerData.length;
  const totalSales = registerData.reduce((acc, r) => acc + r.finalAmount, 0);
  const totalCash = registerData.reduce((acc, r) => acc + r.cash, 0);
  const totalUpi = registerData.reduce((acc, r) => acc + r.upi, 0);
  const totalCard = registerData.reduce((acc, r) => acc + r.card, 0);
  const totalNeft = registerData.reduce((acc, r) => acc + (r.neft || 0), 0);
  const totalFinance = registerData.reduce((acc, r) => acc + r.disbursement, 0);
  const totalExchange = registerData.reduce((acc, r) => acc + r.exchange, 0);

  const handlePrintPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('DEVI MOBILE ACCESSORIES', 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Chain-Wide Master Financial Register & Cash Reconciliation Audit', 14, 21);
    doc.text(`Store Filter: ${selectedStoreFilter} | Date: ${dateFilter} | Exported: ${new Date().toLocaleString('en-IN')}`, 14, 26);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 30, 269, 14, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Bills: ${totalRecords}`, 16, 38);
    doc.text(`Net: Rs. ${totalSales.toLocaleString('en-IN')}`, 50, 38);
    doc.text(`Cash: Rs. ${totalCash.toLocaleString('en-IN')}`, 95, 38);
    doc.text(`UPI: Rs. ${totalUpi.toLocaleString('en-IN')}`, 135, 38);
    doc.text(`Card: Rs. ${totalCard.toLocaleString('en-IN')}`, 175, 38);
    doc.text(`NEFT: Rs. ${totalNeft.toLocaleString('en-IN')}`, 210, 38);
    doc.text(`Finance: Rs. ${totalFinance.toLocaleString('en-IN')}`, 245, 38);

    const tableRows = registerData.map((row, i) => [
      i + 1,
      row.billNumber,
      row.storeName,
      row.customerName,
      row.phone,
      row.productName,
      (row.imeiSerial && !['vivo', 'oppo', 'samsung', 'realme', 'none', 'na', 'n/a'].includes(row.imeiSerial.toLowerCase()) && row.imeiSerial.length >= 6) ? row.imeiSerial : '-',
      `Rs. ${row.finalAmount.toLocaleString('en-IN')}`,
      row.paymentType,
      row.financeProvider || (row.paymentType === 'EMI' ? 'Bajaj Finance Limited' : '-'),
      row.cash > 0 ? `Rs. ${row.cash.toLocaleString('en-IN')}` : '-',
      row.upi > 0 ? `Rs. ${row.upi.toLocaleString('en-IN')}` : '-',
      row.card > 0 ? `Rs. ${row.card.toLocaleString('en-IN')}` : '-',
      row.neft > 0 ? `Rs. ${row.neft.toLocaleString('en-IN')}` : '-',
      row.disbursement > 0 ? `Rs. ${row.disbursement.toLocaleString('en-IN')}` : '-',
      row.exchange > 0 ? `Rs. ${row.exchange.toLocaleString('en-IN')}` : '-',
      row.vasPlan !== 'None' ? row.vasPlan : '-',
      row.gifts !== 'None' ? row.gifts : '-',
      row.salesman,
      row.approvedBy,
    ]);

    (doc as any).autoTable({
      startY: 48,
      head: [['#', 'Bill No', 'Store Branch', 'Customer', 'Phone', 'Product Model', 'IMEI / Serial', 'Final Amount', 'Mode', 'Financer (Bank)', 'Cash', 'UPI', 'Card', 'NEFT', 'Finance Loan', 'Exchange', 'VAS Plan', 'Gift', 'Salesman', 'Approved By']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.5 },
      styles: { cellPadding: 1.6 },
    });

    doc.save(`Devi_Master_Register_${selectedStoreFilter}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleOpenRowInvoice = (row: any) => {
    setSelectedInvoice({
      invoiceNo: row.billNumber,
      invoiceDate: (row.date || '').split('T')[0],
      refNo: row.salesman || 'STAFF',
      customerName: row.customerName,
      customerPhone: row.phone,
      customerAddress: row.customerAddress || 'Ujjain (M.P.)',
      partyName: row.financeProvider || row.customerName,
      productName: row.productName,
      category: row.category,
      hsnCode: getHsnCodeForProduct(row.productName, row.category),
      imeiNumber: row.imeiSerial,
      quantity: 1,
      rateInclTax: row.finalAmount,
      basePrice: row.mrp || 0,
      paymentMethod: row.paymentType,
      financeProvider: row.financeProvider || undefined,
      storeName: 'DEVI MOBILE ACCESSORIES',
      storeAddress: row.storeId === 'DM-02' ? 'Freeganj Main Road, Ujjain' : '206/1, Kanthal Chauraha, Ankpat Marg, Ujjain 456006',
      storeGstin: '23ALGPK9135M1ZT',
      storePhone: '9713001600, 6262335656, 9893264192',
      gifts: row.gifts,
      vasPlan: row.vasPlan
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider">Super Admin HQ • Master Cashier Desk</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Chain-Wide Master Sales Register</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Store Branch Filter */}
          <select
            value={selectedStoreFilter}
            onChange={(e) => setSelectedStoreFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">🏢 All Store Branches (Chain-Wide)</option>
            {storesList.map(s => (
              <option key={s.code || s.id} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>


          {/* Date Selector Pills */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl">
            {(['Today', 'Yesterday', 'ThisMonth', 'All', 'Custom'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDateFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
                  dateFilter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'ThisMonth' ? 'This Month' : tab === 'All' ? 'All Time' : tab}
              </button>
            ))}
          </div>

          {/* Custom Date Input */}
          {dateFilter === 'Custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white min-h-[36px]"
            />
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={() => loadRegister(false)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handlePrintPDF}
            disabled={registerData.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-sm active:scale-95 transition-all min-h-[40px]"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Export Master PDF</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Bill No, Customer Name, Mobile (+91), Product Model, IMEI Serial, Salesman, or Branch..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* 8 Core KPI Summary Cards (Full Accounting Balance) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        
        {/* Total Bills */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Chain Bills</div>
          <div className="text-xl font-black text-slate-900">{totalRecords}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">100% Verified</div>
        </div>

        {/* Net Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Total Sales (Gross)</div>
          <div className="text-xl font-black text-emerald-700">{formatINR(totalSales)}</div>
          <div className="text-[10px] text-slate-400">Total Chain Revenue</div>
        </div>

        {/* Cash in Hand */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-purple-700 uppercase flex items-center gap-1">
            <IndianRupee className="w-3 h-3" /> Cash in Hand
          </div>
          <div className="text-xl font-black text-purple-800">{formatINR(totalCash)}</div>
          <div className="text-[10px] text-slate-400">All Counters Cash</div>
        </div>

        {/* UPI QR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-indigo-700 uppercase flex items-center gap-1">
            <QrCode className="w-3 h-3" /> UPI (QR)
          </div>
          <div className="text-xl font-black text-indigo-800">{formatINR(totalUpi)}</div>
          <div className="text-[10px] text-slate-400">Direct QR Bank</div>
        </div>

        {/* Card POS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-teal-700 uppercase flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Card POS
          </div>
          <div className="text-xl font-black text-teal-800">{formatINR(totalCard)}</div>
          <div className="text-[10px] text-slate-400">Card Swiped</div>
        </div>

        {/* NEFT / Bank */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-sky-700 uppercase flex items-center gap-1">
            <Landmark className="w-3 h-3" /> NEFT / Bank
          </div>
          <div className="text-xl font-black text-sky-800">{formatINR(totalNeft)}</div>
          <div className="text-[10px] text-slate-400">Bank Transfer</div>
        </div>

        {/* Finance Loan */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">
            <Landmark className="w-3 h-3" /> Finance Loan
          </div>
          <div className="text-xl font-black text-amber-800">{formatINR(totalFinance)}</div>
          <div className="text-[10px] text-slate-400">Bajaj / Banks</div>
        </div>

        {/* Device Exchange */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
            <Repeat className="w-3 h-3" /> Exchange Value
          </div>
          <div className="text-xl font-black text-rose-800">{formatINR(totalExchange)}</div>
          <div className="text-[10px] text-slate-400">Trade-in Credit</div>
        </div>

      </div>

      {/* Audited Financial Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="text-sm font-black text-slate-900">
            Chain-Wide Audited Transactions ({registerData.length})
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Cash Drawer Total = <span className="font-black text-purple-700">{formatINR(totalCash)}</span>
          </div>
        </div>

        {registerData.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-700">No transactions recorded for this filter</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Approved bills from all branches will automatically appear here with full financial breakdown.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider bg-slate-50/50">
                  <th className="p-3">#</th>
                  <th className="p-3">Bill No</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Product Model</th>
                  <th className="p-3">IMEI / Serial</th>
                  <th className="p-3">Total MRP</th>
                  <th className="p-3">Final Net</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 bg-amber-50 text-amber-950 font-black whitespace-nowrap">🏦 Financer (Bank)</th>
                  <th className="p-3">Cash (Hand)</th>
                  <th className="p-3">UPI (QR)</th>
                  <th className="p-3">Card POS</th>
                  <th className="p-3">NEFT / Bank</th>
                  <th className="p-3">Finance Loan</th>
                  <th className="p-3">Exchange</th>
                  <th className="p-3">VAS Plan</th>
                  <th className="p-3">Gift Item</th>
                  <th className="p-3">Salesman</th>
                  <th className="p-3">Approved By</th>
                  <th className="p-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registerData.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-400">{index + 1}</td>
                    <td className="p-3 font-mono font-bold text-amber-600">{row.billNumber}</td>
                    <td className="p-3 font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-700 font-black">
                        {row.storeId}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{row.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{row.phone}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{row.productName}</div>
                      <span className="text-[10px] text-slate-400">{row.category}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">
                      {(row.imeiSerial && !['vivo', 'oppo', 'samsung', 'realme', 'none', 'na', 'n/a'].includes(row.imeiSerial.toLowerCase()) && row.imeiSerial.length >= 6) ? row.imeiSerial : '-'}
                    </td>
                    <td className="p-3 font-mono text-slate-500 line-through text-[11px]">{formatINR(row.mrp)}</td>
                    <td className="p-3 font-bold text-emerald-700 font-mono text-sm">{formatINR(row.finalAmount)}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        row.paymentType === 'EMI' 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : row.paymentType === 'UPI'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {row.paymentType}
                      </span>
                    </td>
                    <td className="p-3 bg-amber-50/30">
                      {(row.financeProvider || row.paymentType === 'EMI') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 font-black text-xs border border-amber-300 shadow-sm whitespace-nowrap">
                          🏦 {row.financeProvider || 'Bajaj Finance Limited'}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-semibold text-purple-800">{row.cash > 0 ? formatINR(row.cash) : '-'}</td>
                    <td className="p-3 font-mono font-semibold text-indigo-800">{row.upi > 0 ? formatINR(row.upi) : '-'}</td>
                    <td className="p-3 font-mono font-semibold text-teal-800">{row.card > 0 ? formatINR(row.card) : '-'}</td>
                    <td className="p-3 font-mono font-semibold text-sky-800">{row.neft > 0 ? formatINR(row.neft) : '-'}</td>
                    <td className="p-3 font-mono font-semibold text-amber-800">
                      {row.disbursement > 0 ? (
                        <div>
                          <div className="font-black text-amber-950 font-mono">{formatINR(row.disbursement)}</div>
                          <div className="text-[10px] text-amber-800 font-bold whitespace-nowrap">
                            {row.financeProvider || (row.paymentType === 'EMI' ? 'Bajaj Finance Limited' : '')}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-3 font-mono font-semibold text-rose-800">{row.exchange > 0 ? formatINR(row.exchange) : '-'}</td>
                    <td className="p-3">
                      {row.vasPlan && row.vasPlan !== 'None' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] whitespace-nowrap">
                          🛡️ {row.vasPlan}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {row.gifts && row.gifts !== 'None' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-bold text-[10px] whitespace-nowrap">
                          🎁 {row.gifts}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-600">{row.salesman}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[10px] whitespace-nowrap">
                        ✅ {row.approvedBy}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenRowInvoice(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Bill</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRowToDelete(row)}
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-colors"
                          title="Delete Bill & Void Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal for View / Print */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          data={selectedInvoice}
        />
      )}

      {/* Delete Confirmation Modal */}
      {rowToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Bill & Void Record?</h3>
                <p className="text-xs text-slate-500 font-medium">Permanently delete from register, ledgers, and database.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Bill No:</span>
                <span className="font-mono font-bold text-brand-700">{rowToDelete.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Store Branch:</span>
                <span className="font-bold text-slate-900">{rowToDelete.storeName || rowToDelete.storeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{rowToDelete.customerName} ({rowToDelete.phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Product:</span>
                <span className="font-bold text-slate-900">{rowToDelete.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Amount:</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{formatINR(rowToDelete.finalAmount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRowToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteSaleDeal(rowToDelete.id);
                    if (rowToDelete.billNumber) {
                      await deleteSaleDeal(rowToDelete.billNumber);
                    }
                    setRowToDelete(null);
                    await loadRegister(true);
                  } catch (err) {
                    console.error('Failed to delete row:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
