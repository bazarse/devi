'use client';

import { useEffect } from 'react';

/**
 * CacheCleaner:
 * 1. Automatically flushes stale CacheStorage (Cache API) entries in the browser.
 * 2. Unregisters legacy caching service workers.
 * 3. Synchronizes persistent auth credentials to long-life cookies so the user never gets logged out.
 */
export default function CacheCleaner() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 🛑 1. Block PWA install prompt cleanly
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Run deep cache purge only once per tab session to avoid unregister cycles
    if (!sessionStorage.getItem('devi_cache_cleared_v1')) {
      sessionStorage.setItem('devi_cache_cleared_v1', 'true');

      // 2. Clear non-essential browser Cache Storage entries
      if ('caches' in window) {
        window.caches.keys().then((names) => {
          names.forEach((name) => {
            if (!name.toLowerCase().includes('onesignal')) {
              window.caches.delete(name);
            }
          });
        }).catch(() => {});
      }

      // 3. Unregister legacy/rogue service workers (excluding OneSignal worker)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            const swUrl = registration.active?.scriptURL || '';
            if (!swUrl.includes('OneSignalSDKWorker.js')) {
              registration.unregister().catch(() => {});
            }
          });
        }).catch(() => {});
      }

      // 4. 🔥 Purge all offline / stale business data from localStorage
      try {
        const staleKeys = [
          'devi_real_sales_pipeline_v2',
          'devi_real_sales_pipeline',
          'devi_sales_pipeline',
          'devi_second_hand_stock',
          'devi_leads',
          'devi_real_leads_registry_v2',
          'devi_real_leads_registry_v1',
          'devi_tally_tracker_v1',
          'devi_demo_data_purged_v2',
          'devi_inventory_cache'
        ];
        staleKeys.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }


    // 4. Keep Login Cookie Alive (1 year persistence sync from localStorage)
    try {
      const savedRole = localStorage.getItem('devi_user_role');
      const savedPhone = localStorage.getItem('devi_user_phone');
      const savedName = localStorage.getItem('devi_user_name');
      const savedStore = localStorage.getItem('devi_store_id');

      if (savedRole && savedPhone) {
        const oneYear = 31536000; // 365 days in seconds
        document.cookie = `devi_user_role=${savedRole}; path=/; max-age=${oneYear}; SameSite=Lax`;
        document.cookie = `devi_user_phone=${savedPhone}; path=/; max-age=${oneYear}; SameSite=Lax`;
        if (savedName) {
          document.cookie = `devi_user_name=${encodeURIComponent(savedName)}; path=/; max-age=${oneYear}; SameSite=Lax`;
        }
        if (savedStore) {
          document.cookie = `devi_store_id=${savedStore}; path=/; max-age=${oneYear}; SameSite=Lax`;
        }
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}

