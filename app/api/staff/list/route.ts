import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';

const STORE_UUID_TO_CODE: Record<string, string> = {
  '3be59f85-2859-476c-b402-31c552a83146': 'DM-01',
  '7705c16a-2e91-4ef5-93bc-00084848db6a': 'DM-02'
};

const staffServerCache = new Map<string, { timestamp: number; staff: any[] }>();
const SERVER_STAFF_TTL = 30000; // 30 seconds

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    const cacheKey = storeId || 'ALL';
    const now = Date.now();
    const cached = staffServerCache.get(cacheKey);
    if (cached && (now - cached.timestamp < SERVER_STAFF_TTL)) {
      return NextResponse.json(
        { success: true, staff: cached.staff },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
      );
    }

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('profiles')
      .select('*, stores(code, name)')
      .order('created_at', { ascending: true });

    if (storeId && storeId !== 'ALL') {
      const targetUuid = storeId === 'DM-01' 
        ? '3be59f85-2859-476c-b402-31c552a83146'
        : storeId === 'DM-02'
        ? '7705c16a-2e91-4ef5-93bc-00084848db6a'
        : storeId;
      query = query.eq('store_id', targetUuid);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching staff list:', error);
      return NextResponse.json({ success: false, error: error.message, staff: [] }, { status: 500 });
    }

    const staff = (data || []).map((u: any) => {
      const storeCode = u.stores?.code || STORE_UUID_TO_CODE[u.store_id] || (u.store_id?.includes('7705') ? 'DM-02' : 'DM-01');
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

    staffServerCache.set(cacheKey, { timestamp: now, staff });
    if (staffServerCache.size > 10) {
      const oldest = staffServerCache.keys().next().value;
      if (oldest) staffServerCache.delete(oldest);
    }

    return NextResponse.json(
      { success: true, staff },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (err: any) {
    console.error('Server error in staff list route:', err);
    return NextResponse.json({ success: false, error: err?.message, staff: [] }, { status: 500 });
  }
}
