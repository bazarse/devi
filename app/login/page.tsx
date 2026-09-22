'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Smartphone, 
  Phone, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff 
} from 'lucide-react';
export default function BrightLoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const passcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const clearSession = () => {
      ['devi_user_role', 'devi_user_name', 'devi_user_phone', 'devi_store_id'].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
        document.cookie = `${k}=; path=/; max-age=0; SameSite=Lax`;
      });
    };

    const revalidate = async () => {
      const savedRole = localStorage.getItem('devi_user_role') || sessionStorage.getItem('devi_user_role');
      const savedPhone = localStorage.getItem('devi_user_phone') || sessionStorage.getItem('devi_user_phone');

      if (!savedRole || !savedPhone) {
        phoneInputRef.current?.focus();
        return;
      }

      // Re-check against Supabase before auto-redirecting. A deleted or
      // deactivated user must NOT be let back in from a stale session.
      try {
        const res = await fetch('/api/staff/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ phone: savedPhone }),
        });
        const data = await res.json();

        if (cancelled) return;

        if (data.valid === false) {
          clearSession();
          setErrorMessage(
            data.reason === 'deactivated'
              ? 'This account is deactivated. Please contact Store Admin.'
              : 'This account no longer exists. Please contact Super Admin.'
          );
          phoneInputRef.current?.focus();
          return;
        }
      } catch {
        // Network error: fail safe by staying on login rather than trusting stale session.
        if (cancelled) return;
        phoneInputRef.current?.focus();
        return;
      }

      if (cancelled) return;

      if (savedRole === 'super_admin') {
        router.replace('/admin/super');
      } else if (savedRole === 'store_admin') {
        router.replace('/admin/store');
      } else {
        router.replace('/pos');
      }
    };

    revalidate();
    return () => {
      cancelled = true;
    };
  }, [router]);



  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(cleanDigits);
    setErrorMessage('');
    
    if (cleanDigits.length === 10) {
      passcodeInputRef.current?.focus();
    }
  };

  const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPasscode(cleanDigits);
    setErrorMessage('');
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (phoneNumber.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      phoneInputRef.current?.focus();
      return;
    }
    if (passcode.length < 4) {
      setErrorMessage('Please enter 4-digit security PIN');
      passcodeInputRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);

      // Authenticate STRICTLY against Supabase via server route.
      // No local cache, no hardcoded fallback accounts. A deleted or
      // deactivated user is rejected by the server.
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ phone: cleanPhone, passcode: passcode.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        setIsLoading(false);
        setErrorMessage(data?.error || 'This mobile number is not authorized. Please contact Super Admin.');
        phoneInputRef.current?.focus();
        return;
      }

      const matchedStaff = data.user;

      // Successful Auth -> Set User Profile & Session
      const role = matchedStaff.role;
      const name = matchedStaff.full_name;
      const phone = matchedStaff.phone;
      const storeId = matchedStaff.store_id || 'DM-01';

      let targetPath = '/pos';
      if (role === 'super_admin') {
        targetPath = '/admin/super';
      } else if (role === 'store_admin') {
        targetPath = '/admin/store';
      } else {
        targetPath = '/pos';
      }

      sessionStorage.setItem('devi_user_role', role);
      sessionStorage.setItem('devi_user_name', name);
      sessionStorage.setItem('devi_user_phone', phone);
      sessionStorage.setItem('devi_store_id', storeId);
      localStorage.setItem('devi_user_role', role);
      localStorage.setItem('devi_user_name', name);
      localStorage.setItem('devi_user_phone', phone);
      localStorage.setItem('devi_store_id', storeId);

      // Session cookies (30 days). Re-validated against Supabase on each app open.
      const THIRTY_DAYS = 2592000;
      document.cookie = `devi_user_role=${role}; path=/; max-age=${THIRTY_DAYS}; SameSite=Lax`;
      document.cookie = `devi_user_phone=${phone}; path=/; max-age=${THIRTY_DAYS}; SameSite=Lax`;
      document.cookie = `devi_user_name=${encodeURIComponent(name)}; path=/; max-age=${THIRTY_DAYS}; SameSite=Lax`;
      document.cookie = `devi_store_id=${storeId}; path=/; max-age=${THIRTY_DAYS}; SameSite=Lax`;

      // Sync user profile to Native Android SharedPreferences (for notification actions)
      try {
        if (typeof window !== 'undefined' && (window as any).AndroidApp?.saveUserProfile) {
          (window as any).AndroidApp.saveUserProfile(name, phone, role);
        }
      } catch (_) {}

      setIsLoading(false);
      
      // Force instant full navigation
      if (typeof window !== 'undefined') {
        window.location.href = targetPath;
      } else {
        router.push(targetPath);
      }


    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Authentication error. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 select-none font-sans overflow-hidden">
      
      {/* AMBIENT GLOWS */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-400/15 blur-[130px] pointer-events-none" />

      {/* Decorative Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)`,
          backgroundSize: '28px 28px'
        }}
      />

      <div className="relative z-10 w-full max-w-[430px] mx-auto space-y-6">
        
        {/* BRAND HEADER */}
        <div className="text-center space-y-2.5">
          <div className="relative inline-block">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-brand-600 to-blue-500 p-[3px] shadow-xl shadow-brand-500/20 mx-auto">
              <div className="w-full h-full bg-white rounded-[21px] flex items-center justify-center text-brand-600">
                <Smartphone className="w-9 h-9" />
              </div>
            </div>
            <span className="absolute bottom-0 right-0 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/80 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span className="text-[11px] font-black text-brand-700 tracking-wider uppercase">
                DEVI MOBILE • UJJAIN
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Retail POS Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Authorized Management Sign In
            </p>
          </div>
        </div>

        {/* BRIGHT CLEAN LOGIN CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/60 space-y-5">
          
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* 1. MOBILE NUMBER INPUT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-600" />
                  <span>Mobile Number</span>
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  phoneNumber.length === 10 ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {phoneNumber.length}/10 {phoneNumber.length === 10 && '✓'}
                </span>
              </div>

              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm border-r border-slate-200 pr-2.5">
                  +91
                </div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  required
                  placeholder="Enter registered 10-digit number"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="w-full pl-16 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-900 text-base sm:text-lg font-mono font-bold tracking-wider placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
            </div>

            {/* 2. 4-DIGIT PASSCODE PIN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>Security PIN</span>
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  passcode.length === 4 ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {passcode.length}/4 PIN {passcode.length === 4 && '✓'}
                </span>
              </div>

              <div className="relative">
                <input
                  ref={passcodeInputRef}
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={passcode}
                  onChange={handlePasscodeChange}
                  className="w-full pl-4 pr-12 py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-900 text-base sm:text-xl font-mono font-bold tracking-widest placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all text-center sm:text-left"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. SIGN IN BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-black tracking-wide shadow-lg shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[52px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>

        {/* FOOTER */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-slate-600 font-bold">
            Devi Mobile Accessories • Ujjain
          </p>
          <p className="text-[10px] text-slate-400">
            DM-01 Kanthal Chauraha (456001) • DM-02 Freeganj (456010)
          </p>
        </div>

      </div>

    </div>
  );
}


