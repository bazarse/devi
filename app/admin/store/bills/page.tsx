'use client';

import React, { useEffect, useState } from 'react';
import BillsManagementView from '@/components/bills-management-view';

export default function StoreAdminBillsPage() {
  // Derive the store admin's own store instead of hardcoding DM-01, so a
  // Freeganj (DM-02) admin never starts on the Kanthal view.
  const [storeId, setStoreId] = useState<'DM-01' | 'DM-02'>('DM-01');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id');
    setStoreId(stored === 'DM-02' ? 'DM-02' : 'DM-01');
    setReady(true);
  }, []);

  // Wait until the real store is resolved to avoid a flash of the wrong store.
  if (!ready) return null;

  return <BillsManagementView userRole="store_admin" defaultStoreId={storeId} />;
}
