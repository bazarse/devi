'use client';

import React from 'react';
import LeaderboardView from '@/components/leaderboard-view';

export default function SuperAdminLeaderboardPage() {
  return (
    <LeaderboardView 
      initialStoreFilter="ALL"
      canSwitchStore={true}
      roleTitle="Super Admin HQ • Chain Leaderboard"
    />
  );
}
