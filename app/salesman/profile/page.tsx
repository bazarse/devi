'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Smartphone, 
  KeyRound, 
  ShoppingBag, 
  TrendingUp, 
  MapPin, 
  Phone, 
  Sparkles, 
  CheckCircle2
} from 'lucide-react';
import { updateStaffPasscode } from '@/lib/staff-service';
import confetti from 'canvas-confetti';

export default function SalesmanProfilePage() {
  const [salesmanInfo, setSalesmanInfo] = useState({
    name: 'Sales Staff',
    phone: '',
    role: 'Sales Executive',
    storeId: 'DM-01',
    storeName: 'Devi Mobile Kanthal (Ujjain)',
    mobilesSoldLifetime: 0,
    accessoriesSoldLifetime: 0,
    todaySalesCount: 0,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = sessionStorage.getItem('devi_user_name') || localStorage.getItem('devi_user_name') || 'Sales Staff';
      const storedPhone = sessionStorage.getItem('devi_user_phone') || localStorage.getItem('devi_user_phone') || '';
      const storedStore = sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id') || 'DM-01';
      setSalesmanInfo(prev => ({
        ...prev,
        name: storedName,
        phone: storedPhone,
        storeId: storedStore,
        storeName: storedStore === 'DM-02' ? 'Devi Mobile 2.0 Freeganj (Ujjain)' : 'Devi Mobile Kanthal (Ujjain)'
      }));
    }
  }, []);

  // PIN Change State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (newPin.length !== 4) {
      setPinError('New PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and Confirm PIN do not match');
      return;
    }

    setIsUpdating(true);
    await updateStaffPasscode(salesmanInfo.phone, newPin);
    setIsUpdating(false);
    setPinSuccess(true);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    setTimeout(() => {
      setPinSuccess(false);
      setNewPin('');
      setConfirmPin('');
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      
      {/* 1. SALESMAN IDENTITY CARD */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-500 p-[2px] shadow-md shrink-0">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-brand-600 font-black text-2xl">
              {salesmanInfo.name.charAt(0)}
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200 mb-1">
              <Sparkles className="w-3 h-3 text-brand-600" />
              <span>{salesmanInfo.role}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">{salesmanInfo.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-1">
              <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                <Phone className="w-3.5 h-3.5 text-brand-600" /> {salesmanInfo.phone}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {salesmanInfo.storeId} ({salesmanInfo.storeName})
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/pos"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-black shadow-md shadow-brand-500/20 active:scale-95 transition-all self-stretch sm:self-auto justify-center min-h-[44px]"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>New Sale (POS)</span>
        </Link>
      </div>

      {/* 2. SIMPLE PERFORMANCE RECORD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Mobiles Sold</span>
            <Smartphone className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{salesmanInfo.mobilesSoldLifetime} Phones</div>
          <div className="text-[10px] text-emerald-600 font-bold">Lifetime Sales Record</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Accessories</span>
            <ShoppingBag className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{salesmanInfo.accessoriesSoldLifetime} Units</div>
          <div className="text-[10px] text-slate-400">Earbuds & Chargers</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Today&apos;s Billed</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{salesmanInfo.todaySalesCount} Units</div>
          <div className="text-[10px] text-emerald-600 font-semibold">Today&apos;s Counter Sales</div>
        </div>
      </div>

      {/* 3. LIVE PASSCODE PIN CHANGER CARD */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Change Terminal Passcode PIN</h3>
            <p className="text-xs text-slate-500">Update your 4-digit security PIN for POS counter login</p>
          </div>
        </div>

        {pinSuccess ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-black text-sm">Passcode PIN Updated Successfully!</div>
              <div>Your new 4-digit PIN is active across all terminals immediately.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePinUpdate} className="space-y-4 text-xs">
            {pinError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl text-center">
                ⚠️ {pinError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Enter New 4-Digit PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Confirm New 4-Digit PIN *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              {isUpdating ? 'Updating PIN in Supabase...' : 'Save & Sync New PIN'}
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
