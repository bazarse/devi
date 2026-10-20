import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const STORE_CODE_TO_UUID: Record<string, string> = {
  'DM-01': '3be59f85-2859-476c-b402-31c552a83146',
  'DM-02': '7705c16a-2e91-4ef5-93bc-00084848db6a'
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, storeId } = body;

    if (!phone || !storeId) {
      return NextResponse.json({ success: false, error: 'Phone and target storeId are required' }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const targetUuid = STORE_CODE_TO_UUID[storeId] || (storeId.includes('7705') ? STORE_CODE_TO_UUID['DM-02'] : STORE_CODE_TO_UUID['DM-01']);

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        store_id: targetUuid,
        updated_at: new Date().toISOString()
      })
      .eq('phone', cleanPhone)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase staff transfer error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, staff: data });
  } catch (err: any) {
    console.error('Staff transfer server exception:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
