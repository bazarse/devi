'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Building2, 
  KeyRound, 
  CheckCircle2, 
  Search, 
  TrendingUp, 
  Plus, 
  Lock, 
  MapPin, 
  Phone, 
  X,
  Store,
  Sparkles,
  Trash2
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getStaffUsers, createStaffAccount, updateStaffPasscode, toggleStaffActive, deleteStaffAccount, StaffUser } from '@/lib/staff-service';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import confetti from 'canvas-confetti';
import ErrorBoundary from '@/components/error-boundary';

export default function SuperAdminStaffHierarchyPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [storesList, setStoresList] = useState<StoreBranch[]>(DEFAULT_STORES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [showMasterPinModal, setShowMasterPinModal] = useState(false);

  // Selected staff for action
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [newPin, setNewPin] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [masterSuccess, setMasterSuccess] = useState(false);

  // New Staff Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [passcode, setPasscode] = useState('0000');
  const [role, setRole] = useState<'salesman' | 'store_admin'>('salesman');
  const [assignedStore, setAssignedStore] = useState('DM-01');
  const [commissionRate, setCommissionRate] = useState('1.0');
  const [salesTarget, setSalesTarget] = useState('500000');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [users, stores] = await Promise.all([
        getStaffUsers(),
        getActiveStores()
      ]);
      setStaffList(users);
      setStoresList(stores);
    }
    loadData();
  }, []);

  const [addError, setAddError] = useState('');
  const [togglingPhone, setTogglingPhone] = useState<string | null>(null);

  // Handle Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!fullName.trim()) {
      setAddError('Staff full name is required');
      return;
    }
    if (cleanPhone.length !== 10) {
      setAddError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (staffList.some(s => (s.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone)) {
      setAddError(`Staff with mobile ${cleanPhone} already exists in directory.`);
      return;
    }

    setIsSaving(true);
    try {
      const newStaff = await createStaffAccount({
        phone: cleanPhone,
        passcode: passcode.trim() || '0000',
        full_name: fullName.trim(),
        role: role,
        store_id: assignedStore,
        commission_rate: Number(commissionRate) || 1.0,
        monthly_sales_target: Number(salesTarget) || 500000,
        is_active: true,
      });

      setStaffList(prev => [...prev.filter(s => s.phone !== newStaff.phone), newStaff]);
      setShowAddStaffModal(false);

      // Reset Form
      setFullName('');
      setPhone('');
      setPasscode('0000');
      setAddError('');

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create staff account. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Toggle Active Status
  const handleToggleActiveStatus = async (staff: StaffUser) => {
    setTogglingPhone(staff.phone);
    const nextState = !(staff.is_active ?? true);
    const success = await toggleStaffActive(staff.phone, nextState);
    if (success) {
      setStaffList(prev => prev.map(s => s.phone === staff.phone ? { ...s, is_active: nextState } : s));
    } else {
      alert('Failed to update status on server. Please try again.');
    }
    setTogglingPhone(null);
  };

  // Handle PIN Reset
  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !selectedStaff) return;

    await updateStaffPasscode(selectedStaff.phone, newPin);
    setStaffList(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, passcode: newPin } : s));
    setShowResetPinModal(false);
    setNewPin('');
    setSelectedStaff(null);
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
  };

  // Handle Master Super Admin PIN Update
  const handleMasterPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPin.length !== 4) return;

    await updateStaffPasscode('9893264192', masterPin);
    setMasterSuccess(true);
    setTimeout(() => {
      setMasterSuccess(false);
      setShowMasterPinModal(false);
      setMasterPin('');
    }, 1200);
  };

  const filteredStaff = staffList.filter(s => {
    if (!s) return false;
    const q = (searchQuery || '').toLowerCase();
    const fullName = String(s.full_name || '').toLowerCase();
    const phone = String(s.phone || '');
    const matchesSearch = !q || fullName.includes(q) || phone.includes(searchQuery || '');
    const matchesStore = selectedStoreFilter === 'ALL' || s.store_id === selectedStoreFilter;
    const matchesRole = selectedRoleFilter === 'ALL' || s.role === selectedRoleFilter;
    return matchesSearch && matchesStore && matchesRole;
  });

  const handleDeleteStaff = async (staffToDelete: StaffUser) => {
    if (staffToDelete.phone === '9893264192') {
      alert('Cannot delete Super Admin HQ profile!');
      return;
    }
    if (confirm(`Are you sure you want to delete user "${staffToDelete.full_name}" (+91 ${staffToDelete.phone}) permanently?`)) {
      const ok = await deleteStaffAccount(staffToDelete.id || staffToDelete.phone);
      if (ok) {
        setStaffList(prev => prev.filter(s => s.phone !== staffToDelete.phone));
      } else {
        alert('Failed to delete user from the server. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Super Admin HQ • Global Staff Governance</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Multi-Store Staff & Admin Hierarchy</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Master Super Admin PIN */}
          <button
            type="button"
            onClick={() => setShowMasterPinModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors min-h-[44px]"
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Super Admin PIN</span>
          </button>

          {/* Add Staff / Admin Button */}
          <button
            type="button"
            onClick={() => setShowAddStaffModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create Admin / Salesman</span>
          </button>
        </div>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Total Chain Staff</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{staffList.length} Members</div>
          <div className="text-[10px] sm:text-xs text-slate-500">Across {storesList.length} store locations</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Store Managers / Admins</span>
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-800 mt-1">
            {staffList.filter(s => s && s.role === 'store_admin').length} Managers
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500">Authorized approval desks</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Floor Salesmen</span>
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {staffList.filter(s => s && s.role === 'salesman').length} Sales Staff
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500">Generating daily revenue</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase">Sales Performance</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {formatINR(staffList.reduce((acc, s) => acc + (s.month_sales_amount || 0), 0))}
          </div>
          <div className="text-[10px] sm:text-xs text-emerald-600 font-semibold">Current month volume</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name or mobile number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          />
        </div>

        {/* Store Branch Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Store:</span>
          <select
            value={selectedStoreFilter}
            onChange={(e) => setSelectedStoreFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none"
          >
            <option value="ALL">All Stores ({storesList.length})</option>
            {storesList.map(st => (
              <option key={st.code} value={st.code}>{st.code}: {st.name}</option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {['ALL', 'store_admin', 'salesman'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRoleFilter(r)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                selectedRoleFilter === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r === 'store_admin' ? 'Store Admins' : 'Salesmen'}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <ErrorBoundary title="Global Staff Hierarchy" description="Unable to load global staff hierarchy due to a localized render issue. Please retry or refresh.">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Staff Name</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Assigned Store</th>
                  <th className="px-4 py-3.5">Mobile (Username)</th>
                  <th className="px-4 py-3.5">PIN / Passcode</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">{staff.full_name}</div>
                      <div className="text-[11px] text-slate-400">{staff.email || 'staff@devi.com'}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-md ${
                        staff.role === 'super_admin'
                          ? 'bg-purple-100 text-purple-800'
                          : staff.role === 'store_admin'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-brand-700'
                      }`}>
                        {staff.role === 'super_admin' ? '👑 Super Admin' : staff.role === 'store_admin' ? '🏬 Store Admin' : '🛒 Sales Staff'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {staff.store_id}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-mono font-bold text-slate-900">
                      {staff.phone}
                    </td>

                    <td className="px-4 py-4 font-mono font-bold text-slate-400 tracking-widest text-sm">
                      ••••
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-700">
                      {staff.role === 'super_admin' ? 'HQ Central' : staff.role === 'store_admin' ? 'Store Management' : 'Floor Sales'}
                    </td>

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={togglingPhone === staff.phone}
                        onClick={() => handleToggleActiveStatus(staff)}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all min-h-[32px] ${
                          (staff.is_active ?? true)
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title="Click to toggle Active / Inactive"
                      >
                        <CheckCircle2 className={`w-3 h-3 ${(staff.is_active ?? true) ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{(staff.is_active ?? true) ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaff(staff);
                            setShowResetPinModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs font-bold transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                          <span>Reset PIN</span>
                        </button>

                        {staff.phone !== '9893264192' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staff)}
                            className="inline-flex items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ErrorBoundary>

      {/* MODAL 1: ADD NEW STORE ADMIN OR SALESMAN */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Create Staff or Store Admin</h3>
                  <p className="text-xs text-slate-500">Assign role and store branch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">User Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="salesman">🛒 Salesman / Sales Counter</option>
                    <option value="store_admin">🏬 Store Admin / Manager</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Store Branch *</label>
                  <select
                    value={assignedStore}
                    onChange={(e) => setAssignedStore(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {storesList.map((st) => (
                      <option key={st.code} value={st.code}>{st.code} - {st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Soni"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">10-Digit Mobile (Username) *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    placeholder="9826011223"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial 4-Digit PIN *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="1234"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl animate-fadeIn">
                  {addError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all"
                >
                  {isSaving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET ANY USER PIN */}
      {showResetPinModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">Reset Staff PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetPinModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
              Setting new PIN for <span className="font-bold text-slate-900">{selectedStaff.full_name}</span> ({selectedStaff.phone})
            </div>

            <form onSubmit={handleResetPinSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New 4-Digit PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPER ADMIN MASTER PIN UPDATE */}
      {showMasterPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">Change Super Admin Master PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMasterPinModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {masterSuccess ? (
              <div className="p-4 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm font-black text-emerald-900">Super Admin PIN Updated!</div>
                <div className="text-xs text-emerald-700">New 4-digit PIN is active now.</div>
              </div>
            ) : (
              <form onSubmit={handleMasterPinSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">New 4-Digit Master PIN *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMasterPinModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Update Master PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
