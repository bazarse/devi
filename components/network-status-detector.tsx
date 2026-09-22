'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertTriangle } from 'lucide-react';

export default function NetworkStatusDetector() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnectedBanner(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnectedBanner(true);
      const timer = setTimeout(() => {
        setShowReconnectedBanner(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <>
      {/* 🔴 Full Screen / Top Persistent Alert when Offline */}
      {isOffline && (
        <div className="fixed inset-x-0 top-0 z-[9999] bg-rose-600 text-white px-4 py-3 shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <WifiOff className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-black tracking-wide flex items-center justify-center sm:justify-start gap-1.5">
                  <span>⚠️ Aapka Internet Band Hai (Offline Mode)</span>
                </div>
                <div className="text-xs text-rose-100 font-medium">
                  Devi POS 100% Cloud par chalta hai. Naye bill aur approvals ke liye kripya WiFi ya Mobile Data on karein.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (navigator.onLine) {
                  window.location.reload();
                } else {
                  alert('Abhi bhi internet connect nahi hua hai. Kripya apna WiFi ya Mobile Data check karein.');
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-rose-700 hover:bg-rose-50 text-xs font-black rounded-xl shadow-sm transition-all active:scale-95 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry / Online Aao</span>
            </button>
          </div>
        </div>
      )}

      {/* 🟢 Temporary Success Banner when Back Online */}
      {showReconnectedBanner && !isOffline && (
        <div className="fixed inset-x-0 top-0 z-[9999] bg-emerald-600 text-white px-4 py-2.5 shadow-xl animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-black">
            <Wifi className="w-4 h-4 text-emerald-200" />
            <span>Internet Connected! Aap wapas Online hain — Cloud Sync Active hai.</span>
          </div>
        </div>
      )}
    </>
  );
}
