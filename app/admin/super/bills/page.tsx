'use client';

import React from 'react';
import BillsManagementView from '@/components/bills-management-view';

export default function SuperAdminBillsPage() {
  return <BillsManagementView userRole="super_admin" defaultStoreId="DM-01" />;
}
