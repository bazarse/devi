'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Smartphone, 
  ShoppingCart, 
  Wrench, 
  FileSpreadsheet, 
  Store as StoreIcon, 
  ShieldCheck, 
  Menu, 
  X, 
  UserCircle,
  MapPin,
  Target,
  Boxes,
  Users,
  TrendingUp,
  CreditCard,
  Contact2,
  ArrowDownToLine
} from 'lucide-react';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import { isRunningInApp } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('DM-01');
  const [storesList, setStoresList] = useState<StoreBranch[]>(DEFAULT_STORES);


  useEffect(() => {
    if (isRunningInApp()) {
      setIsNativeApp(true);
    }

    async function loadStores() {
      const stores = await getActiveStores();
      setStoresList(stores);
    }
    loadStores();
  }, []);

  const navLinks = [
    { href: '/pos', label: 'POS Billing', icon: ShoppingCart },
    { href: '/pos/approvals', label: 'Approvals', icon: FileSpreadsheet },
    { href: '/admin/store', label: 'Store Admin', icon: StoreIcon },
    { href: '/admin/store/finance', label: 'Finance & Banks', icon: CreditCard },
    { href: '/admin/super/customers', label: 'Contacts CRM', icon: Contact2 },
    { href: '/admin/store/register', label: 'Day Book & Register', icon: FileSpreadsheet },
    { href: '/admin/super', label: 'Super Admin HQ', icon: ShieldCheck },
    { href: '/admin/super/leads', label: 'Leads CRM', icon: Target },
    { href: '/admin/super/leaderboard', label: 'Leaderboard', icon: TrendingUp },
    { href: '/repair-tracking', label: 'Repair Desk', icon: Wrench },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-blue-800">
                DEVI MOBILE
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Store & POS System
              </span>
            </div>
          </Link>

          {/* Branch Switcher (Desktop) */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <MapPin className="w-4 h-4 text-brand-600 ml-2 mr-1" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 py-1 pr-3 focus:outline-none cursor-pointer max-w-[260px] truncate"
            >
              {storesList.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.code}: {st.name} ({st.city})
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Role Badge & Mobile Menu Button */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-200 transition-colors"
            >
              <UserCircle className="w-4 h-4 text-brand-600" />
              <span>Staff Login</span>
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1.5 animate-fadeIn">
          {/* Branch Switcher Mobile */}
          <div className="flex items-center bg-slate-100 p-2 rounded-lg mb-2">
            <MapPin className="w-4 h-4 text-brand-600 mr-2" />
            <span className="text-xs font-semibold text-slate-500 mr-2">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 flex-1 focus:outline-none"
            >
              {storesList.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.code}: {st.name} ({st.city})
                </option>
              ))}
            </select>
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5 text-brand-600" />
                {link.label}
              </Link>
            );
          })}
          
          <div className="pt-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/20"
            >
              <UserCircle className="w-4 h-4" />
              Staff Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

