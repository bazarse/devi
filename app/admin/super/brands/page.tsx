'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Tag, 
  Plus, 
  Search, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  IndianRupee, 
  Phone, 
  Pencil, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Boxes, 
  TrendingUp, 
  ArrowLeft,
  X,
  FileText
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { 
  BrandDetail, 
  getStoredBrandDetails, 
  saveOrUpdateBrand, 
  deleteBrand, 
  fetchAllBrands 
} from '@/lib/brand-service';
import PaginationControls from '@/components/pagination-controls';
import confetti from 'canvas-confetti';

export default function SuperAdminBrandsPage() {
  const [brands, setBrands] = useState<BrandDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'paid' | 'overdue'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDetail | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formSupplierPhone, setFormSupplierPhone] = useState('');
  const [formBillNo, setFormBillNo] = useState('');
  const [formBillAmount, setFormBillAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formStatus, setFormStatus] = useState<'pending' | 'paid' | 'partial'>('pending');
  const [formNotes, setFormNotes] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadBrands = () => {
    setBrands(getStoredBrandDetails());
  };

  useEffect(() => {
    loadBrands();
    fetchAllBrands().then(() => {
      loadBrands();
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleOpenEdit = (b: BrandDetail) => {
    setEditingBrand(b);
    setFormName(b.name);
    setFormSupplier(b.supplierName || '');
    setFormSupplierPhone(b.supplierPhone || '');
    setFormBillNo(b.supplierBillNo || '');
    setFormBillAmount(b.billAmount ? String(b.billAmount) : '');
    setFormDueDate(b.dueDate || '');
    setFormStatus(b.paymentStatus || 'pending');
    setFormNotes(b.notes || '');
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    setEditingBrand(null);
    setFormName('');
    setFormSupplier('');
    setFormSupplierPhone('');
    setFormBillNo('');
    setFormBillAmount('');
    setFormDueDate('');
    setFormStatus('pending');
    setFormNotes('');
    setShowAddForm(false);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    saveOrUpdateBrand({
      id: editingBrand?.id,
      name: formName.trim(),
      supplierName: formSupplier.trim() || undefined,
      supplierPhone: formSupplierPhone.trim() || undefined,
      supplierBillNo: formBillNo.trim() || undefined,
      billAmount: formBillAmount ? Number(formBillAmount) : undefined,
      dueDate: formDueDate || undefined,
      paymentStatus: formStatus,
      notes: formNotes.trim() || undefined,
    });

    loadBrands();
    setSaveSuccessMsg(true);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => {
      setSaveSuccessMsg(false);
      handleResetForm();
    }, 700);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete brand "${name}"?`)) {
      deleteBrand(id);
      loadBrands();
    }
  };

  const getDueStatus = (dueDateStr?: string, paymentStatus?: string) => {
    if (paymentStatus === 'paid') {
      return { text: 'Paid', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
    if (!dueDateStr) {
      return { text: 'No Due Date', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 font-black' };
    }
    if (diffDays === 0) {
      return { text: 'Due Today', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-black' };
    }
    if (diffDays <= 3) {
      return { text: `Due in ${diffDays}d`, badgeClass: 'bg-amber-100 text-amber-900 border-amber-200' };
    }
    return { text: `Due: ${dueDateStr}`, badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' };
  };

  // Filtered Brands
  const filteredBrands = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return brands.filter(b => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        b.name.toLowerCase().includes(q) || 
        (b.supplierName && b.supplierName.toLowerCase().includes(q)) ||
        (b.supplierBillNo && b.supplierBillNo.toLowerCase().includes(q));
      if (!matchQuery) return false;

      if (statusFilter === 'pending' && b.paymentStatus !== 'pending') return false;
      if (statusFilter === 'paid' && b.paymentStatus !== 'paid') return false;
      if (statusFilter === 'overdue') {
        if (b.paymentStatus === 'paid' || !b.dueDate) return false;
        const due = new Date(b.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() >= today.getTime()) return false;
      }
      return true;
    });
  }, [brands, searchQuery, statusFilter]);

  // Paginated Brands
  const paginatedBrands = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredBrands.slice(from, from + pageSize);
  }, [filteredBrands, currentPage, pageSize]);

  // KPI Metrics
  const totalBrandsCount = brands.length;
  const pendingBillsCount = brands.filter(b => b.paymentStatus === 'pending' && (b.billAmount || 0) > 0).length;
  const totalDueAmount = brands
    .filter(b => b.paymentStatus === 'pending')
    .reduce((sum, b) => sum + (b.billAmount || 0), 0);
  const overdueBillsCount = brands.filter(b => {
    if (b.paymentStatus === 'paid' || !b.dueDate) return false;
    const due = new Date(b.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  }).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
                Super Admin HQ • Master Catalog
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Brands & Supplier Invoices Master</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/super/inventory"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors min-h-[44px]"
          >
            <Boxes className="w-4 h-4 text-brand-600" />
            <span>HQ Inventory</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              if (showAddForm) handleResetForm();
              else setShowAddForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Form' : '+ Add Brand & Bill'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Brands</span>
          <div className="text-2xl font-black text-slate-900">{totalBrandsCount} Brands</div>
          <span className="text-xs text-slate-500 font-semibold">Configured for 1-Click Inward</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200 bg-amber-50/40 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending Invoices</span>
          <div className="text-2xl font-black text-amber-900">{pendingBillsCount} Invoices</div>
          <span className="text-xs text-amber-700 font-bold">Awaiting Distributor Payment</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-rose-200 bg-rose-50/40 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Total Creditors Payable</span>
          <div className="text-2xl font-black text-rose-900">{formatINR(totalDueAmount)}</div>
          <span className="text-xs text-rose-700 font-bold">Outstanding Supplier Balance</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-indigo-200 bg-indigo-50/40 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Overdue Bills</span>
          <div className="text-2xl font-black text-indigo-900">{overdueBillsCount} Overdue</div>
          <span className="text-xs text-indigo-700 font-bold">Immediate Follow-up Required</span>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSaveSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-amber-200 shadow-md space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                {editingBrand ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {editingBrand ? `Edit Brand Record: ${editingBrand.name}` : 'Add Brand & Default Supplier Details'}
                </h3>
                <p className="text-xs text-slate-500">Auto-links distributor and invoice data during stock inwarding</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetForm}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Brand Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Vivo, Samsung, Apple, OnePlus"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Distributor / Supplier Name</label>
              <input
                type="text"
                value={formSupplier}
                onChange={(e) => setFormSupplier(e.target.value)}
                placeholder="e.g. Vivo MP Televentures"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Supplier Phone Number</label>
              <input
                type="tel"
                value={formSupplierPhone}
                onChange={(e) => setFormSupplierPhone(e.target.value)}
                placeholder="e.g. 9826012345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Supplier Invoice / Bill No.</label>
              <input
                type="text"
                value={formBillNo}
                onChange={(e) => setFormBillNo(e.target.value)}
                placeholder="e.g. INV-2026-9841"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Bill Amount (₹)</label>
              <input
                type="number"
                value={formBillAmount}
                onChange={(e) => setFormBillAmount(e.target.value)}
                placeholder="e.g. 185000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Payment Due Date</label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Payment Status</label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'pending', label: 'Pending / Unpaid' },
                  { id: 'paid', label: 'Paid Fully' },
                  { id: 'partial', label: 'Partial Payment' }
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFormStatus(st.id as any)}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold border text-xs transition-all min-h-[40px] ${
                      formStatus === st.id 
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Remarks / Payment Terms</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. 30 days credit limit, Authorized direct billing"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-7 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px] flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{saveSuccessMsg ? 'Saved Successfully!' : (editingBrand ? 'Update Brand' : 'Save Brand Record')}</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by brand name, supplier or bill number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold w-full md:w-auto overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[38px] ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            All Brands ({brands.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[38px] ${statusFilter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600'}`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('overdue')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[38px] ${statusFilter === 'overdue' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'}`}
          >
            Overdue
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[38px] ${statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
          >
            Paid
          </button>
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Brand Name</th>
                <th className="py-3.5 px-4">Supplier / Distributor</th>
                <th className="py-3.5 px-4">Bill No</th>
                <th className="py-3.5 px-4 text-right">Bill Amount</th>
                <th className="py-3.5 px-4 text-center">Payment Due Date</th>
                <th className="py-3.5 px-4 text-center">Payment Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedBrands.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold space-y-2">
                    <Tag className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>No brands found matching your filter or search query.</div>
                  </td>
                </tr>
              ) : (
                paginatedBrands.map((b, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const dueStatus = getDueStatus(b.dueDate, b.paymentStatus);

                  return (
                    <tr key={b.id || b.name} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 font-bold">{globalIdx}</td>
                      
                      {/* Brand Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                            {b.name[0]?.toUpperCase()}
                          </span>
                          <div>
                            <span className="font-black text-slate-900 text-sm block">{b.name}</span>
                            {b.notes && <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">{b.notes}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{b.supplierName || 'Standard Authorized Distributor'}</span>
                        </div>
                        {b.supplierPhone && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {b.supplierPhone}
                          </div>
                        )}
                      </td>

                      {/* Bill No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {b.supplierBillNo || '-'}
                      </td>

                      {/* Bill Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                        {b.billAmount ? formatINR(b.billAmount) : '-'}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${dueStatus.badgeClass}`}>
                          <Calendar className="w-3 h-3" />
                          <span>{dueStatus.text}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          b.paymentStatus === 'paid' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : b.paymentStatus === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {b.paymentStatus || 'pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/super/inventory?brand=${encodeURIComponent(b.name)}`}
                            className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-[10px] transition-colors"
                            title="View Stock"
                          >
                            Stock
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-colors"
                            title="Edit Brand & Supplier Details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id, b.name)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                            title="Delete Brand"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredBrands.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredBrands.length}
          pageSize={pageSize}
          itemLabel="brands"
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

    </div>
  );
}
