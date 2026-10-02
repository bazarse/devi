'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Tag, 
  Plus, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Trash2, 
  Pencil, 
  FileText, 
  IndianRupee, 
  Phone,
  Sparkles,
  Check
} from 'lucide-react';
import { 
  BrandDetail, 
  getStoredBrandDetails, 
  saveOrUpdateBrand, 
  deleteBrand 
} from '@/lib/brand-service';
import { formatINR } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface BrandManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandSelected?: (brand: BrandDetail) => void;
}

export default function BrandManagementModal({
  isOpen,
  onClose,
  onBrandSelected
}: BrandManagementModalProps) {
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

  const loadBrands = () => {
    setBrands(getStoredBrandDetails());
  };

  useEffect(() => {
    if (isOpen) {
      loadBrands();
    }
  }, [isOpen]);

  // Handle Edit Brand
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

    const saved = saveOrUpdateBrand({
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
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    setTimeout(() => {
      setSaveSuccessMsg(false);
      handleResetForm();
      if (onBrandSelected) {
        onBrandSelected(saved);
      }
    }, 700);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete brand "${name}"?`)) {
      deleteBrand(id);
      loadBrands();
    }
  };

  // Due status calculation
  const getDueStatus = (dueDateStr?: string, paymentStatus?: string) => {
    if (paymentStatus === 'paid') {
      return { text: 'Paid ✅', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
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
      return { text: `Overdue by ${Math.abs(diffDays)}d 🚨`, badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse' };
    }
    if (diffDays === 0) {
      return { text: 'Due Today ⚠️', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
    if (diffDays <= 3) {
      return { text: `Due in ${diffDays}d ⏳`, badgeClass: 'bg-amber-100 text-amber-900 border-amber-200' };
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

  // KPI Metrics
  const totalBrandsCount = brands.length;
  const pendingBillsCount = brands.filter(b => b.paymentStatus === 'pending' && (b.billAmount || 0) > 0).length;
  const totalDueAmount = brands
    .filter(b => b.paymentStatus === 'pending')
    .reduce((sum, b) => sum + (b.billAmount || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>Brands & Supplier Bills Master</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  ब्रांड एवं सप्लायर बिल
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage all smartphone/electronics brands, default distributors, purchase invoices & payment due dates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Brands</span>
              <div className="text-2xl font-black text-slate-900">{totalBrandsCount} Brands</div>
              <span className="text-[10px] text-slate-500 font-semibold">Ready for 1-click Inward</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-amber-200 bg-amber-50/40 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending Supplier Invoices</span>
              <div className="text-2xl font-black text-amber-900">{pendingBillsCount} Invoices</div>
              <span className="text-[10px] text-amber-700 font-bold">Awaiting Distributor Payment</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-200 bg-rose-50/40 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Total Supplier Outstanding</span>
              <div className="text-2xl font-black text-rose-900">{formatINR(totalDueAmount)}</div>
              <span className="text-[10px] text-rose-700 font-bold">Creditors Payable Balance</span>
            </div>
          </div>

          {/* Action Bar & Add Form Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brand, supplier name, or bill no..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  All ({brands.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Paid
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (showAddForm) handleResetForm();
                  else setShowAddForm(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm active:scale-95 transition-all whitespace-nowrap min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddForm ? 'Close Form' : '+ Add Brand & Bill'}</span>
              </button>
            </div>
          </div>

          {/* Add / Edit Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleSaveSubmit} className="bg-white p-5 rounded-3xl border border-amber-200 shadow-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    {editingBrand ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </div>
                  <span className="font-black text-slate-900 text-sm">
                    {editingBrand ? `Edit Brand: ${editingBrand.name}` : 'Add New Brand & Supplier Details'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {/* Brand Name */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand Name (ब्रांड का नाम) *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Vivo, Nothing, Motorola"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Supplier Name */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Distributor / Supplier (पार्टी का नाम)</label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="e.g. Vivo MP Televentures"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Supplier Phone */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier Contact Phone</label>
                  <input
                    type="tel"
                    value={formSupplierPhone}
                    onChange={(e) => setFormSupplierPhone(e.target.value)}
                    placeholder="e.g. 9826012345"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Purchase Bill / Invoice No */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier Bill / Invoice No (बिल नं.)</label>
                  <input
                    type="text"
                    value={formBillNo}
                    onChange={(e) => setFormBillNo(e.target.value)}
                    placeholder="e.g. INV-2026-9841"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Bill Amount */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bill Amount / Cost (₹ राशि)</label>
                  <input
                    type="number"
                    value={formBillAmount}
                    onChange={(e) => setFormBillAmount(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Payment Due Date */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Due Date (भुगतान की तारीख)</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Status</label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'pending', label: '⏳ Pending / Unpaid' },
                      { id: 'paid', label: '✅ Paid Fully' },
                      { id: 'partial', label: '⚠️ Partial' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFormStatus(st.id as any)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold border text-xs transition-all ${
                          formStatus === st.id 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Notes / Distributor Remarks</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. 30 days credit limit, Authorized direct billing"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all min-h-[40px] flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{saveSuccessMsg ? 'Saved Successfully!' : (editingBrand ? 'Update Brand' : 'Save Brand & Supplier')}</span>
                </button>
              </div>
            </form>
          )}

          {/* Brands Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Brand Name</th>
                    <th className="py-3 px-4">Supplier / Distributor</th>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4 text-right">Bill Amount</th>
                    <th className="py-3 px-4 text-center">Payment Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBrands.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                        No brands found matching your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredBrands.map((b, idx) => {
                      const dueStatus = getDueStatus(b.dueDate, b.paymentStatus);

                      return (
                        <tr key={b.id || b.name} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                          
                          {/* Brand Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 font-black flex items-center justify-center text-xs shadow-xs">
                                {b.name[0]?.toUpperCase()}
                              </span>
                              <div>
                                <span className="font-black text-slate-900 text-sm block">{b.name}</span>
                                {b.notes && <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">{b.notes}</span>}
                              </div>
                            </div>
                          </td>

                          {/* Supplier */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{b.supplierName || 'Standard Authorized Distributor'}</span>
                            </div>
                            {b.supplierPhone && (
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" /> {b.supplierPhone}
                              </div>
                            )}
                          </td>

                          {/* Bill No */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {b.supplierBillNo || '-'}
                          </td>

                          {/* Bill Amount */}
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                            {b.billAmount ? formatINR(b.billAmount) : '-'}
                          </td>

                          {/* Due Date */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${dueStatus.badgeClass}`}>
                              <Calendar className="w-3 h-3" />
                              <span>{dueStatus.text}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
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
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onBrandSelected && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onBrandSelected(b);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
                                  title="Select Brand for Inward Stock"
                                >
                                  Select
                                </button>
                              )}
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

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-semibold">
            {filteredBrands.length} of {totalBrandsCount} brands listed • Changes sync across all shop devices
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs min-h-[40px] transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
