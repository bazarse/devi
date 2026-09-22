import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const STORE_CODE_TO_UUID: Record<string, string> = {
  'DM-01': '3be59f85-2859-476c-b402-31c552a83146',
  'DM-02': '7705c16a-2e91-4ef5-93bc-00084848db6a'
};

const UUID_TO_STORE_CODE: Record<string, string> = {
  '3be59f85-2859-476c-b402-31c552a83146': 'DM-01',
  '7705c16a-2e91-4ef5-93bc-00084848db6a': 'DM-02'
};

const STATUS_DB_TO_UI: Record<string, string> = {
  'New': 'Hot Lead',
  'Interested': 'Hot Lead',
  'Contacted': 'Warm Lead',
  'Follow_Up': 'Follow Up',
  'Converted': 'Converted',
  'Not_Interested': 'Lost'
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    const supabase = createServerSupabaseClient();
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (storeId && storeId !== 'ALL') {
      const targetUuid = STORE_CODE_TO_UUID[storeId] || storeId;
      query = query.eq('store_id', targetUuid);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch leads error:', error);
      return NextResponse.json({ success: false, leads: [] }, { status: 500 });
    }

    const leads = (data || []).map((row: any) => {
      const storeCode = UUID_TO_STORE_CODE[row.store_id] || (row.store_id?.includes('7705') ? 'DM-02' : 'DM-01');
      return {
        id: row.id,
        token: `LD-${row.id.slice(0, 6)}`,
        storeId: storeCode,
        storeName: storeCode === 'DM-02' ? 'Devi Mobile 2.0 (Freeganj)' : 'Devi Mobile (Kanthal Flagship)',
        salesmanName: 'Sales Executive',
        salesmanPhone: '',
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        interestedModel: row.product_of_interest || 'Smartphone',
        category: row.interest_category || 'Mobile Phone',
        budget: Number(row.budget) || 0,
        expectedDate: row.follow_up_date || 'Soon',
        status: STATUS_DB_TO_UI[row.status] || 'Hot Lead',
        notes: row.notes || '',
        createdAt: row.created_at
      };
    });

    return NextResponse.json(
      { success: true, leads },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error: any) {
    console.error('Leads API error:', error);
    return NextResponse.json({ success: false, leads: [] }, { status: 500 });
  }
}
