import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const STORE_CODE_TO_UUID: Record<string, string> = {
  'DM-01': '3be59f85-2859-476c-b402-31c552a83146',
  'DM-02': '7705c16a-2e91-4ef5-93bc-00084848db6a'
};

const DEFAULT_STAFF_UUID = 'ca750241-055e-43a4-9a6e-13da57a9110a'; // Salesman

const STATUS_UI_TO_DB: Record<string, string> = {
  'Hot Lead': 'Interested',
  'Warm Lead': 'Contacted',
  'Follow Up': 'Follow_Up',
  'Converted': 'Converted',
  'Lost': 'Not_Interested'
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      customerName, 
      customerPhone, 
      interestedModel, 
      category, 
      budget, 
      expectedDate, 
      status, 
      notes, 
      storeId 
    } = body;

    if (!customerName || !customerPhone) {
      return NextResponse.json({ success: false, error: 'Customer Name and Phone are required' }, { status: 400 });
    }

    const cleanPhone = String(customerPhone).replace(/\D/g, '').slice(-10);
    const storeUuid = STORE_CODE_TO_UUID[storeId] || (storeId?.includes('7705') ? STORE_CODE_TO_UUID['DM-02'] : STORE_CODE_TO_UUID['DM-01']);

    const supabase = createServerSupabaseClient();

    const dbStatus = STATUS_UI_TO_DB[status] || 'Interested';

    const { data, error } = await supabase
      .from('leads')
      .insert({
        store_id: storeUuid,
        sales_person_id: DEFAULT_STAFF_UUID,
        customer_name: customerName,
        customer_phone: cleanPhone,
        interest_category: category || 'Mobile Phone',
        product_of_interest: interestedModel || 'Smartphone',
        budget: Number(budget) || 0,
        status: dbStatus,
        follow_up_date: expectedDate && expectedDate.length === 10 ? expectedDate : new Date(Date.now() + 86400000).toISOString().split('T')[0],
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase lead create error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    console.error('Lead create API error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
