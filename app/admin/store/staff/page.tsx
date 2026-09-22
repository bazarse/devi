'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  Phone, 
  KeyRound, 
  ShieldCheck, 
  UserPlus, 
  CheckCircle2, 
  Search, 
  Edit3, 
  Lock, 
  TrendingUp, 
  Percent, 
  X,
  Smartphone,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getStaffUsers, createStaffAccount, updateStaffPasscode, toggleStaffActive, deleteStaffAccount, StaffUser } from '@/lib/staff-service';
import confetti from 'canvas-confetti';
import ErrorBoundary from '@/components/error-boundary';

export default function StoreAdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSalesmanModal, setShowAddSalesmanModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showMyPasswordModal, setShowMyPasswordModal] = useState(false);

  // Selected User for PIN Change
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Manager Self Password State
  const [currentManagerPin, setCurrentManagerPin] = useState('');
  const [newManagerPin, setNewManagerPin] = useState('');
  const [myPinSuccess, setMyPinSuccess] = useState(false);

  // New Salesman Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [passcode, setPasscode] = useState('0000');
  const [commissionRate, setCommissionRate] = useState('1.0');
  const [salesTarget, setSalesTarget] = useState('500000');
  const [isSaving, setIsSaving] = useState(false);

  // Store and Manager State
  const [activeStoreId, setActiveStoreId] = useState('DM-01');
  const [managerName, setManagerName] = useState('Prince Verma');
  const [managerPhone, setManagerPhone] = useState('9926598700');

  // Load Store-specific staff
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userPhone = sessionStorage.getItem('devi_user_phone') || localStorage.getItem('devi_user_phone') || '';
      const isFreeganj = userPhone === '7828915933' || (sessionStorage.getItem('devi_store_id') === 'DM-02');
      const store = isFreeganj ? 'DM-02' : 'DM-01';
      const name = isFreeganj ? 'Manav Sharma' : 'Prince Verma';
      const phoneNum = isFreeganj ? '7828915933' : '9926598700';
      setActiveStoreId(store);
      setManagerName(name);
      setManagerPhone(phoneNum);

      const loadStaff = async () => {
        const users = await getStaffUsers(store);
        setStaffList(users);
      };
      loadStaff();
    }
  }, []);

  const [addError, setAddError] = useState('');
  const [togglingPhone, setTogglingPhone] = useState<string | null>(null);

  // Handle Add Salesman
  const handleAddSalesmanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!fullName.trim()) {
      setAddError('Salesman full name is required');
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
        role: 'salesman',
        store_id: activeStoreId,
        commission_rate: Number(commissionRate) || 1.0,
        monthly_sales_target: Number(salesTarget) || 500000,
        is_active: true,
      });

      setStaffList(prev => [...prev.filter(s => s.phone !== newStaff.phone), newStaff]);
      setShowAddSalesmanModal(false);

      // Reset
      setFullName('');
      setPhone('');
      setPasscode('0000');
      setAddError('');

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create salesman account. Please try again.');
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

  // Handle PIN Update
  const handleUpdatePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (newPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    if (selectedStaff) {
      await updateStaffPasscode(selectedStaff.phone, newPin);
      setStaffList(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, passcode: newPin } : s));
      setShowChangePinModal(false);
      setNewPin('');
      setConfirmPin('');
      setSelectedStaff(null);
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    }
  };

  // Handle Manager Self PIN Update
  const handleMyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newManagerPin.length !== 4) return;

    await updateStaffPasscode(managerPhone, newManagerPin);
    setMyPinSuccess(true);
    setTimeout(() => {
      setMyPinSuccess(false);
      setShowMyPasswordModal(false);
      setCurrentManagerPin('');
      setNewManagerPin('');
    }, 1500);
  };

  const handleDeleteStaff = async (staffToDelete: StaffUser) => {
    if (staffToDelete.role === 'store_admin' || staffToDelete.phone === '9926598700' || staffToDelete.phone === '7828915933') {
      alert('Store Admin profiles can only be managed by Super Admin HQ!');
      return;
    }
    if (confirm(`Are you sure you want to delete salesman "${staffToDelete.full_name}" (+91 ${staffToDelete.phone})?`)) {
      const ok = await deleteStaffAccount(staffToDelete.id || staffToDelete.phone);
      if (ok) {
        setStaffList(prev => prev.filter(s => s.phone !== staffToDelete.phone));
      } else {
        alert('Failed to delete salesman from the server. Please try again.');
      }
    }
  };

  const filteredStaff = staffList.filter(s => {
    if (!s) return false;
    const q = (searchQuery || '').toLowerCase();
    const fullName = String(s.full_name || '').toLowerCase();
    const phone = String(s.phone || '');
    return fullName.includes(q) || phone.includes(searchQuery || '');
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold mb-1 border border-brand-200">
            <Users className="w-3.5 h-3.5" />
            <span>Store Admin {activeStoreId} ({activeStoreId === 'DM-02' ? 'Freeganj Branch' : 'Kanthal Flagship'})</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Store Staff & Salesmen Management</h1>
          <p className="text-xs text-slate-500">Manage floor salesmen, create accounts, assign targets & reset PINs</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Change My Own Password */}
          <button
            type="button"
            onClick={() => setShowMyPasswordModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors min-h-[44px]"
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Change My PIN</span>
          </button>

          {/* Add Salesman Button */}
          <button
            type="button"
            onClick={() => setShowAddSalesmanModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Salesman</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Active Salesmen on Floor</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {staffList.filter(s => s && s.role === 'salesman').length} Sales Staff
          </div>
          <div className="text-xs text-slate-500">Assigned to Store {activeStoreId}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Monthly Store Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {formatINR(staffList.reduce((acc, s) => acc + (s?.month_sales_amount || 0), 0))}
          </div>
          <div className="text-xs text-emerald-600 font-semibold">Combined floor volume</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Store Manager</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-black text-slate-900 mt-1">{managerName}</div>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span>Branch {activeStoreId}</span>
            <span>•</span>
            <span className="font-mono tracking-widest text-slate-400">PIN: ••••</span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search salesman by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:block">
          {filteredStaff.length} Staff members
        </span>
      </div>

      {/* Staff Table */}
      <ErrorBoundary title="Store Staff Directory" description="Unable to load staff directory due to a render error. Please retry or contact administration.">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Staff Name & Role</th>
                  <th className="px-4 py-3.5">Mobile (Username)</th>
                  <th className="px-4 py-3.5">Passcode PIN</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">{staff.full_name}</div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                        staff.role === 'store_admin' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-blue-100 text-brand-700'
                      }`}>
                        {staff.role === 'store_admin' ? 'Store Manager' : 'Sales Counter'}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-mono font-semibold text-slate-800">
                      {staff.phone}
                    </td>

                    <td className="px-4 py-4 font-mono font-bold text-slate-400 tracking-widest text-sm">
                      ••••
                    </td>

                    <td className="px-4 py-4 font-black text-emerald-700">
                      {staff.role === 'salesman' ? 'Floor Sales Desk' : 'Store Operations'}
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
                            setShowChangePinModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs font-bold transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                          <span>Reset PIN</span>
                        </button>

                        {staff.role === 'salesman' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staff)}
                            className="inline-flex items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Salesman"
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

      {/* MODAL 1: ADD NEW SALESMAN MODAL */}
      {showAddSalesmanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Salesman</h3>
                  <p className="text-xs text-slate-500">Create floor sales counter login for Store DM-01</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSalesmanModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSalesmanSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Salesman Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aakash Verma"
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
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    placeholder="9893012345"
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
                  onClick={() => setShowAddSalesmanModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all"
                >
                  {isSaving ? 'Creating...' : 'Create Sales Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET SALESMAN PIN MODAL */}
      {showChangePinModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">Change Salesman PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePinModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
              Updating PIN for <span className="font-bold text-slate-900">{selectedStaff.full_name}</span> ({selectedStaff.phone})
            </div>

            {pinError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                {pinError}
              </div>
            )}

            <form onSubmit={handleUpdatePinSubmit} className="space-y-3 text-xs">
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
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Confirm 4-Digit PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
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

      {/* MODAL 3: STORE ADMIN CHANGE MY OWN PIN MODAL */}
      {showMyPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-black text-slate-900">Change Store Manager PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMyPasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {myPinSuccess ? (
              <div className="p-4 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm font-black text-emerald-900">Manager PIN Updated!</div>
                <div className="text-xs text-emerald-700">Use your new 4-digit PIN on your next login.</div>
              </div>
            ) : (
              <form onSubmit={handleMyPinSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Enter New 4-Digit PIN *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={newManagerPin}
                    onChange={(e) => setNewManagerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMyPasswordModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20"
                  >
                    Update My PIN
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
