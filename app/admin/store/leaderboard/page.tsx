'use client';

import React, { useState, useEffect } from 'react';
import LeaderboardView from '@/components/leaderboard-view';

export default function StoreAdminLeaderboardPage() {
  const [storeId, setStoreId] = useState('DM-01');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id');
      if (stored) setStoreId(stored);
    }
  }, []);

  return (
    <LeaderboardView 
      initialStoreFilter={storeId}
      canSwitchStore={false}
      roleTitle="Store Performance Leaderboard"
    />
  );
}
