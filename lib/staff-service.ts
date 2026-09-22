import { createClient } from './supabase/client';

export interface StaffUser {
  id: string;
  phone: string;
  passcode: string;
  full_name: string;
  role: 'salesman' | 'store_admin' | 'super_admin';
  store_id: string;
  email?: string;
  commission_rate?: number;
  monthly_sales_target?: number;
  is_active: boolean;
  sales_today_count?: number;
  month_sales_amount?: number;
  created_at?: string;
}

// NOTE: All staff data is sourced exclusively from Supabase. There is no
// local cache and no hardcoded fallback directory — this prevents deleted or
// deactivated users from lingering on any device.

// Fetch all staff users STRICTLY from Supabase (via /api/staff/list on the
// client, or a direct query on the server). No local cache / no hardcoded
// fallback: the directory always reflects the live Supabase `profiles` table.
export async function getStaffUsers(storeId?: string): Promise<StaffUser[]> {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams();
      if (storeId && storeId !== 'ALL') params.set('storeId', storeId);
      const res = await fetch(`/api/staff/list?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.staff)) {
        return json.staff;
      }
      // API reachable but returned an error -> surface an empty directory
      // rather than stale local data.
      return [];
    }

    const supabase = createClient();
    let query = supabase
      .from('profiles')
      .select('*, stores(code, name)')
      .order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    const resolvedList: StaffUser[] = data.map((u: any) => {
      const storeCode = u.stores?.code || (u.store_id?.includes('7705') ? 'DM-02' : 'DM-01');
      return {
        id: u.id,
        phone: u.phone,
        passcode: u.passcode || '0000',
        full_name: u.full_name,
        role: u.role,
        store_id: storeCode,
        email: `${u.full_name?.toLowerCase().replace(/\s+/g, '') || 'staff'}@devi.com`,
        commission_rate: 1.0,
        monthly_sales_target: 500000,
        is_active: u.is_active ?? true,
        sales_today_count: 0,
        month_sales_amount: 0,
        created_at: u.created_at,
      };
    });

    if (storeId && storeId !== 'ALL') {
      return resolvedList.filter(u => u.store_id === storeId);
    }
    return resolvedList;
  } catch (err) {
    console.warn('getStaffUsers failed:', err);
    return [];
  }
}

// Create a new staff account (Super Admin / Store Admin).
// Persisted ONLY in Supabase via the server route. Throws on failure so the
// caller/UI can surface a real error instead of silently caching locally.
export async function createStaffAccount(staff: Omit<StaffUser, 'id'>): Promise<StaffUser> {
  const res = await fetch('/api/staff/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staff),
  });

  const resData = await res.json();
  if (res.ok && resData.success && resData.staff) {
    return resData.staff as StaffUser;
  }

  throw new Error(resData?.error || 'Failed to create staff account');
}

// Update Staff PIN / Passcode in Supabase only.
export async function updateStaffPasscode(phone: string, newPin: string): Promise<boolean> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const cleanPin = newPin.trim();

  try {
    const res = await fetch('/api/staff/update-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, newPin: cleanPin }),
    });
    const data = await res.json();
    return res.ok && data.success === true;
  } catch (err) {
    console.warn('Failed to update PIN via API:', err);
    return false;
  }
}


// Toggle Staff active status in Supabase only.
export async function toggleStaffActive(phone: string, isActive: boolean): Promise<boolean> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  try {
    const res = await fetch('/api/staff/toggle-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, isActive }),
    });
    const data = await res.json();
    return res.ok && data.success === true;
  } catch (err) {
    console.warn('Failed to toggle active status via API:', err);
    return false;
  }
}

// Delete Staff account permanently from Supabase.
// Returns true only when the server confirms deletion.
export async function deleteStaffAccount(phoneOrId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/staff/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneOrId }),
    });
    const data = await res.json();
    return res.ok && data.success === true;
  } catch (err) {
    console.warn('API staff delete failed:', err);
    return false;
  }
}
