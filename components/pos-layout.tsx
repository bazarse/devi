'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Smartphone, 
  ShoppingCart, 
  FileSpreadsheet, 
  Store as StoreIcon, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  User, 
  Users,
  KeyRound,
  MapPin, 
  ChevronRight, 
  Receipt, 
  Package, 
  Target, 
  Lock, 
  Sparkles, 
  UploadCloud,
  Boxes,
  CheckCircle2,
  Gift,
  Trophy,
  Building2,
  CreditCard,
  Contact2,
  ArrowDownToLine
} from 'lucide-react';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import { updateStaffPasscode } from '@/lib/staff-service';
import { isRunningInApp, getInstalledAppVersion, isAppUpdateRequired } from '@/lib/utils';
import NotificationCenter from '@/components/notification-center';
import confetti from 'canvas-confetti';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storesList, setStoresList] = useState<StoreBranch[]>(DEFAULT_STORES);
  
  // Hard-locked store for salesman / manager
  const [selectedBranch, setSelectedBranch] = useState('DM-01');

  // Native App Detection State
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [appUpdate, setAppUpdate] = useState<{ current: string; latest: string } | null>(null);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);

  const LOCAL_APK_URL = '/downloads/Devi-Mobile-POS.apk';
  const MIRROR_APK_URL = 'https://tinyurl.com/2ck25rre';

  const triggerAppUpdateDownload = (targetUrl = LOCAL_APK_URL) => {
    setIsDownloadingUpdate(true);
    
    const absoluteUrl = targetUrl.startsWith('http')
      ? targetUrl
      : `${typeof window !== 'undefined' ? window.location.origin : 'https://devi-mobile.vercel.app'}${targetUrl}`;

    // 1. Try native bridge if available
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidApp?.openExternalBrowser) {
        (window as any).AndroidApp.openExternalBrowser(absoluteUrl);
        return;
      }
    } catch (_) {}

    // 2. External URL navigation forwards to Android system Chrome browser
    try {
      window.location.href = absoluteUrl;
    } catch (_) {}

    // 3. Fallback: window.open with _system
    setTimeout(() => {
      try {
        window.open(absoluteUrl, '_system');
      } catch (_) {}
    }, 600);
  };

  // Self PIN Change Modal State
  const [showSelfPinModal, setShowSelfPinModal] = useState(false);

  const [newSelfPin, setNewSelfPin] = useState('');
  const [confirmSelfPin, setConfirmSelfPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  // Authenticated User Session State
  const [userRole, setUserRole] = useState<'salesman' | 'store_admin' | 'super_admin'>('store_admin');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Check if current route is the login screen
  const isLoginPage = pathname === '/' || pathname === '/login';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 🧹 Auto-purge legacy demo notification caches once
    try {
      const isPurged = localStorage.getItem('devi_demo_data_purged_v5');
      if (!isPurged) {
        localStorage.removeItem('devi_app_notifications_v1');
        localStorage.removeItem('devi_app_notifications_v2');
        localStorage.removeItem('devi_app_notifications_v3');
        localStorage.removeItem('devi_app_notifications_v4_clean');
        localStorage.setItem('devi_demo_data_purged_v5', 'true');
      }
    } catch (e) {}

    // Detect if running inside Capacitor Android APK or PWA standalone
    if (isRunningInApp()) {
      setIsNativeApp(true);
    }

    // Check if user is on an older version of the Android App (< 2.5.0)
    if (isAppUpdateRequired('2.5.0')) {
      const installedVer = getInstalledAppVersion() || '2.4.0';
      setAppUpdate({ current: installedVer, latest: '2.5.0' });
    }

    // Load actual authenticated credentials from session or storage
    const storedRole = (sessionStorage.getItem('devi_user_role') || localStorage.getItem('devi_user_role')) as any;
    const storedName = sessionStorage.getItem('devi_user_name') || localStorage.getItem('devi_user_name');
    const storedPhone = sessionStorage.getItem('devi_user_phone') || localStorage.getItem('devi_user_phone');

    const effectiveRole: 'salesman' | 'store_admin' | 'super_admin' =
      storedRole === 'super_admin' ? 'super_admin' :
      storedRole === 'store_admin' ? 'store_admin' : 'salesman';

    setUserRole(effectiveRole);
    if (storedName) {
      setUserName(storedName);
      try {
        if (typeof window !== 'undefined' && (window as any).AndroidApp?.saveUserProfile) {
          (window as any).AndroidApp.saveUserProfile(storedName, storedPhone || '', effectiveRole);
        }
      } catch (_) {}
    }
    if (storedPhone) setUserPhone(storedPhone);

    // 🛡️ STRICT ROLE-BASED ACCESS CONTROL (RBAC) GUARD
    if (!isLoginPage) {
      if (effectiveRole === 'salesman' && pathname.startsWith('/admin')) {
        // ❌ Salesman trying to access Admin dashboard -> BLOCK & REDIRECT IMMEDIATELY
        setIsAccessDenied(true);
        router.replace('/pos');
        return;
      }
      if (effectiveRole === 'store_admin' && pathname.startsWith('/admin/super')) {
        // ❌ Store Admin trying to access Super Admin dashboard -> BLOCK & REDIRECT IMMEDIATELY
        setIsAccessDenied(true);
        router.replace('/admin/store');
        return;
      }
    }

    setIsAccessDenied(false);
  }, [pathname, isLoginPage, router]);

  // Derived role flags from ACTUAL AUTHENTICATED SESSION (NEVER from URL alone!)
  const isSuperAdmin = userRole === 'super_admin';
  const isStoreAdmin = userRole === 'store_admin';
  const isSalesman = userRole === 'salesman';

  // Active User Info
  const activeUser = isSuperAdmin
    ? { name: userName || 'Dilip Kishnani', roleName: 'Super Admin (HQ Owner)', phone: userPhone || '9893264192', tag: 'HQ Master' }
    : isStoreAdmin
    ? { name: userName || (selectedBranch === 'DM-02' ? 'Manav Sharma' : 'Prince Verma'), roleName: 'Store Admin (Manager)', phone: userPhone || (selectedBranch === 'DM-02' ? '7828915933' : '9926598700'), tag: selectedBranch === 'DM-02' ? 'DM-02 Freeganj' : 'DM-01 Kanthal' }
    : { name: userName || 'Sales Staff', roleName: 'Sales Counter Staff', phone: userPhone || '', tag: 'Floor Sales' };

  useEffect(() => {
    async function loadStores() {
      const stores = await getActiveStores();
      setStoresList(stores);
    }
    loadStores();
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        {children}
      </main>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white font-sans">
        <div className="bg-slate-800 p-8 rounded-3xl border border-rose-500/30 text-center max-w-md w-full space-y-4 shadow-2xl animate-scaleUp">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">403 Access Denied</h2>
          <p className="text-xs text-slate-300">
            You are logged in with a Salesman account. You do not have permission to access the Manager / Admin dashboard.
          </p>
          <div className="pt-2">
            <Link
              href="/pos"
              className="inline-block w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg"
            >
              Back to Sales Counter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fallbackStore: StoreBranch = (DEFAULT_STORES && DEFAULT_STORES[0]) ? DEFAULT_STORES[0] : {
    id: 'dm-01-default',
    code: 'DM-01',
    name: 'Store DM-01 (Kanthal Flagship)',
    subtitle: 'Kanthal Chauraha, Ujjain',
    address: 'Kanthal Chauraha, Malipura, Ujjain',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    pincode: '456006',
    phone: '+91 98932 64192',
    email: 'devi_intex@rediffmail.com',
    gstin: '23ALGPK9135M1ZT',
    manager_name: 'Prince Verma',
    is_active: true
  };
  const activeStore = (storesList && storesList.length > 0)
    ? (storesList.find(s => s && s.code === selectedBranch) || storesList[0] || fallbackStore)
    : fallbackStore;

  // Handle Self PIN Change Submit
  const handleSelfPinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (newSelfPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (newSelfPin !== confirmSelfPin) {
      setPinError('PINs do not match');
      return;
    }

    await updateStaffPasscode(activeUser.phone, newSelfPin);
    setPinSuccess(true);
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });

    setTimeout(() => {
      setPinSuccess(false);
      setShowSelfPinModal(false);
      setNewSelfPin('');
      setConfirmSelfPin('');
    }, 1200);
  };

  // 1. DEDICATED SALESMAN MENU ITEMS
  const salesmanNavItems = [
    { href: '/pos', label: 'POS Billing', icon: ShoppingCart },
    { href: '/salesman/history', label: 'Approvals & History', icon: Receipt },
    { href: '/salesman/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/salesman/leads', label: 'Leads', icon: Target },
  ];

  // 2. STORE ADMIN MENU ITEMS
  const storeAdminNavItems = [
    { href: '/admin/store', label: 'Approvals', icon: StoreIcon },
    { href: '/admin/store/bills', label: 'Bills', icon: Receipt },
    { href: '/admin/store/inventory', label: 'Inventory', icon: Boxes },
    { href: '/admin/store/register', label: 'Register (Day Book)', icon: FileSpreadsheet },
    { href: '/admin/store/finance', label: 'Finance / Banks', icon: CreditCard },
    { href: '/admin/store/customers', label: 'Contacts', icon: Contact2 },
    { href: '/admin/store/leads', label: 'Leads', icon: Target },
    { href: '/admin/store/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/admin/store/staff', label: 'Staff & Users', icon: Users },
  ];

  // 3. SUPER ADMIN MENU ITEMS
  const superAdminNavItems = [
    { href: '/admin/super', label: 'Stores Overview', icon: Building2 },
    { href: '/admin/super/approvals', label: 'Approvals', icon: StoreIcon },
    { href: '/admin/super/bills', label: 'Bills', icon: Receipt },
    { href: '/admin/super/inventory', label: 'Inventory', icon: Boxes },
    { href: '/admin/super/register', label: 'Register (Day Book)', icon: FileSpreadsheet },
    { href: '/admin/super/customers', label: 'Contacts', icon: Contact2 },
    { href: '/admin/super/leads', label: 'Leads', icon: Target },
    { href: '/admin/super/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/admin/super/staff', label: 'Staff & Users', icon: Users },
  ];

  const currentNavItems = isSuperAdmin 
    ? superAdminNavItems 
    : isStoreAdmin 
    ? storeAdminNavItems 
    : salesmanNavItems;

  const handleLogout = () => {
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidApp?.clearUserProfile) {
        (window as any).AndroidApp.clearUserProfile();
      }
    } catch (_) {}
    sessionStorage.clear();
    localStorage.removeItem('devi_user_role');
    localStorage.removeItem('devi_user_name');
    localStorage.removeItem('devi_user_phone');
    localStorage.removeItem('devi_store_id');
    localStorage.removeItem('devi_notifications_v5');
    localStorage.removeItem('devi_read_notif_ids_v5');
    document.cookie = 'devi_user_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'devi_user_phone=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'devi_user_name=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'devi_store_id=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    router.push('/login');
  };


  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* 1. BRIGHT DESKTOP & TABLET LEFT SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white text-slate-800 shrink-0 border-r border-slate-200 select-none shadow-sm">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900">DEVI MOBILE</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 block">
              {isSuperAdmin ? 'Super Admin HQ' : isStoreAdmin ? 'Store Manager' : 'Salesman Terminal'}
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 px-3 pb-1 tracking-wider">
            {isSuperAdmin ? 'HQ Governance' : isStoreAdmin ? 'Store Management' : 'Sales Operations'}
          </div>

          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all min-h-[46px] ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-brand-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'}`} />
                  <span className="text-xs font-bold">{item.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-500'}`} />
              </Link>
            );
          })}
        </nav>
      </aside>


      {/* 2. BRIGHT MOBILE TOPBAR */}
      <header className="md:hidden sticky top-0 z-40 bg-white text-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/salesman/profile" className="text-left group">
            <div className="text-sm font-black text-slate-900 group-hover:text-brand-600">DEVI MOBILE POS</div>
            <div className="text-[10px] text-brand-600 font-bold">
              {activeUser.name} • {activeStore?.code || 'DM-01'}
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <NotificationCenter 
            userRole={userRole} 
            userPhone={activeUser.phone} 
            userStoreId={activeStore?.code || 'DM-01'} 
          />
          <button
            type="button"
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:text-rose-600 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-transform"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. BRIGHT MOBILE SIDEBAR DRAWER */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/40 backdrop-blur-sm flex">
          <div className="w-72 bg-white text-slate-900 h-full flex flex-col p-4 space-y-4 shadow-2xl animate-slideRight">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-sm font-black">DEVI MOBILE POS</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile in Mobile Drawer */}
            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-slate-900">{activeUser.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">📞 {activeUser.phone}</div>
                <span className="inline-block text-[9px] font-bold text-brand-700 bg-white px-2 py-0.5 rounded mt-1">
                  {activeUser.tag}
                </span>
              </div>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 overflow-y-auto space-y-1.5">
              {currentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold ${
                      isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold min-h-[44px] active:scale-95 transition-transform"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>

          </div>

          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* 4. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
        
        {/* TOP DESKTOP NAVIGATION BAR (WITH POS SHORTCUT & NOTIFICATIONS) */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <StoreIcon className="w-4 h-4 text-brand-600" />
                <span>{isSuperAdmin ? '👑 Central HQ Command' : `${activeStore?.name || 'Devi Mobile'} (${activeStore?.code || 'DM-01'})`}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick POS Billing Shortcut ONLY for Admins when outside POS */}
            {(isSuperAdmin || isStoreAdmin) && pathname !== '/pos' && (
              <Link
                href="/pos"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all active:scale-95 min-h-[44px]"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>+ POS Billing Desk</span>
              </Link>
            )}

            {/* 🔔 Single Top-Right Notification Center */}
            <NotificationCenter 
            userRole={userRole} 
            userPhone={activeUser.phone} 
            userStoreId={activeStore?.code || 'DM-01'} 
          />

            {/* User Profile Chip (Click to open Profile & PIN) */}
            <Link
              href="/salesman/profile"
              className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:bg-slate-50 p-1.5 rounded-xl transition-all cursor-pointer group min-h-[44px]"
              title="Click to open My Profile & Security PIN"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-900 group-hover:bg-brand-600 text-white flex items-center justify-center font-bold text-xs transition-colors shadow-sm">
                {activeUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-slate-900 leading-tight group-hover:text-brand-600 transition-colors">{activeUser.name}</div>
                <div className="text-[10px] text-slate-400 font-semibold">{activeUser.tag}</div>
              </div>
            </Link>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* 5. ROLE-AWARE MOBILE BOTTOM QUICK BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-1.5 py-1 flex items-center justify-around text-[10px] text-slate-500 shadow-lg">
        {isSuperAdmin ? (
          <>
            <Link
              href="/admin/super"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/super' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <Building2 className="w-5 h-5" />
              <span className="text-[10px] leading-tight">HQ</span>
            </Link>
            <Link
              href="/admin/super/approvals"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/super/approvals' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <StoreIcon className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Approvals</span>
            </Link>
            <Link
              href="/admin/super/inventory"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/super/inventory' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <Boxes className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Stock</span>
            </Link>
            <Link
              href="/admin/super/register"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/super/register' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Register</span>
            </Link>
            <Link
              href="/admin/super/bills"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/super/bills' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <Receipt className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Bills</span>
            </Link>
          </>
        ) : isStoreAdmin ? (
          <>
            <Link
              href="/admin/store"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/store' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <StoreIcon className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Store</span>
            </Link>
            <Link
              href="/admin/store/inventory"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/store/inventory' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <Boxes className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Stock</span>
            </Link>
            <Link
              href="/admin/store/register"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/store/register' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Register</span>
            </Link>
            <Link
              href="/admin/store/bills"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/admin/store/bills' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <Receipt className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Bills</span>
            </Link>
            <Link
              href="/pos"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/pos' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-[10px] leading-tight">POS</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/pos"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/pos' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-[10px] leading-tight">POS</span>
            </Link>
            <Link
              href="/salesman/leads"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/salesman/leads' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <Target className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Leads</span>
            </Link>
            <Link
              href="/salesman/history"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/salesman/history' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <Receipt className="w-5 h-5" />
              <span className="text-[10px] leading-tight">History</span>
            </Link>
            <Link
              href="/salesman/profile"
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 font-bold transition-colors ${pathname === '/salesman/profile' ? 'text-brand-600 font-black' : 'hover:text-slate-900'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] leading-tight">Profile</span>
            </Link>
          </>
        )}
      </nav>

      {/* 6. UNIVERSAL CHANGE MY PIN MODAL (FOR ALL ROLES: SALESMAN, STORE ADMIN, SUPER ADMIN) */}
      {showSelfPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Change My PIN</h3>
                  <p className="text-[11px] text-slate-500">{activeUser.name} ({activeUser.phone})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSelfPinModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pinSuccess ? (
              <div className="p-4 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm font-black text-emerald-900">Passcode PIN Updated!</div>
                <div className="text-xs text-emerald-700">Use your new 4-digit PIN for your next login.</div>
              </div>
            ) : (
              <form onSubmit={handleSelfPinChange} className="space-y-3 text-xs">
                {pinError && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-center">
                    {pinError}
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Enter New 4-Digit PIN *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={newSelfPin}
                    onChange={(e) => setNewSelfPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Confirm New 4-Digit PIN *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={confirmSelfPin}
                    onChange={(e) => setConfirmSelfPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSelfPinModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20"
                  >
                    Save New PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FORCE APP UPDATE MODAL FOR USERS ON OLDER APKS (< 2.5.0) */}
      {appUpdate && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 space-y-4 shadow-2xl text-center border-2 border-amber-500 animate-scaleUp">
            
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
              <ArrowDownToLine className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                🚨 Mandatory App Update Required
              </span>
              <h3 className="text-lg font-black text-slate-900">
                Devi Mobile POS v{appUpdate.latest}
              </h3>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Aapke phone me purana version (<span className="font-bold text-slate-900 font-mono">v{appUpdate.current}</span>) chal raha hai. Printing, notifications aur naye features ke liye update karna compulsory hai.
              </p>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-700 text-left space-y-1">
                <div className="font-bold text-slate-900">What&apos;s new in v{appUpdate.latest}:</div>
                <div>• Direct Bluetooth Thermal & A4 GST Invoice Printing</div>
                <div>• Real-time salesman approval push notifications</div>
                <div>• Day Book NEFT payments & Customer Due (Udhaari) tracking</div>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => triggerAppUpdateDownload(LOCAL_APK_URL)}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all min-h-[48px]"
              >
                <ArrowDownToLine className="w-4 h-4 animate-bounce" />
                <span>{isDownloadingUpdate ? 'Starting Download in Chrome...' : `Download & Install Update (v${appUpdate.latest})`}</span>
              </button>

              <button
                type="button"
                onClick={() => triggerAppUpdateDownload(MIRROR_APK_URL)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-[11px] border border-slate-300 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🌐 Direct Download via Mirror 2</span>
              </button>

              {isDownloadingUpdate && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 font-medium animate-fadeIn text-left">
                  ✅ <b>Download started!</b> Phone ki notification bar niche karke <b>Devi-Mobile-POS.apk</b> tap karein aur Install dabayein.
                </div>
              )}

              <a
                href="https://devi-rho.vercel.app/download"
                target="_blank"
                rel="noreferrer"
                className="block text-[11px] font-bold text-brand-600 hover:text-brand-800 underline"
              >
                Tap here to open download page in browser
              </a>
            </div>

            <div className="text-[10px] text-slate-400 font-medium">
              Note: Download hone ke baad notification bar se file open karke Install dabayein. Aapka data ya login delete nahi hoga.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

