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
    const { name, phone, address, storeId, amountSpent, email } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const storeUuid = STORE_CODE_TO_UUID[storeId] || (storeId?.includes('7705') ? STORE_CODE_TO_UUID['DM-02'] : STORE_CODE_TO_UUID['DM-01']);

    const supabase = createServerSupabaseClient();

    // Check if customer already exists
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existing) {
      const newTotal = (Number(existing.total_spent) || 0) + (Number(amountSpent) || 0);
      const { data: updated, error: uErr } = await supabase
        .from('customers')
        .update({
          name: name || existing.name,
          address: address || existing.address,
          total_spent: newTotal,
          primary_store_id: storeUuid || existing.primary_store_id,
          email: email || existing.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (uErr) return NextResponse.json({ success: false, error: uErr.message }, { status: 500 });
      return NextResponse.json({ success: true, customer: updated });
    } else {
      const { data: created, error: cErr } = await supabase
        .from('customers')
        .insert({
          name: name || 'Valued Customer',
          phone: cleanPhone,
          address: address || null,
          email: email || null,
          primary_store_id: storeUuid,
          total_spent: Number(amountSpent) || 0,
          credit_balance: 0
        })
        .select()
        .single();

      if (cErr) return NextResponse.json({ success: false, error: cErr.message }, { status: 500 });
      return NextResponse.json({ success: true, customer: created });
    }
  } catch (error: any) {
    console.error('Customer upsert error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
