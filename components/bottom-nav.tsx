'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Store, 
  ShoppingCart, 
  Wrench, 
  FileSpreadsheet, 
  CheckCircle2 
} from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Store', icon: Store },
    { href: '/pos', label: 'New Sale', icon: ShoppingCart },
    { href: '/pos/approvals', label: 'Approvals', icon: CheckCircle2 },
    { href: '/repair-tracking', label: 'Repair', icon: Wrench },
    { href: '/admin/store/register', label: 'Register', icon: FileSpreadsheet },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg px-2 py-1 pb-safe">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-all ${
                isActive
                  ? 'text-brand-600 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-brand-50 text-brand-600' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
