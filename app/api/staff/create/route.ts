import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, passcode, full_name, role, store_id, commission_rate, monthly_sales_target } = body;

    if (!phone || !full_name) {
      return NextResponse.json({ success: false, error: 'Phone and full name are required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const supabase = createServerSupabaseClient();


    // 1. Resolve Store UUID if store_id is 'DM-01' or 'DM-02'
    let resolvedStoreUuid = null;
    if (store_id && store_id !== 'ALL') {
      const { data: stores } = await supabase.from('stores').select('id, code');
      if (stores && stores.length > 0) {
        const found = stores.find(s => s.code === store_id || s.id === store_id);
        resolvedStoreUuid = found ? found.id : stores[0].id;
      }
    }

    // 2. Create Auth User or Find Existing
    const dummyEmail = `sales.${cleanPhone}@devi.com`;
    let userId: string;

    const { data: newUser, error: createAuthErr } = await supabase.auth.admin.createUser({
      email: dummyEmail,
      password: `Devi@${passcode || '0000'}123`,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        phone: cleanPhone,
        role: role || 'salesman'
      }
    });

    if (newUser?.user) {
      userId = newUser.user.id;
    } else {
      // User might already exist in auth, let's query profiles or generate UUID fallback
      const { data: existingProf } = await supabase.from('profiles').select('id').eq('phone', cleanPhone).maybeSingle();
      if (existingProf) {
        userId = existingProf.id;
      } else {
        return NextResponse.json({ success: false, error: createAuthErr?.message || 'Failed to create auth user' }, { status: 500 });
      }
    }

    // 3. Insert or Update profiles table
    const profilePayload: any = {
      id: userId,
      full_name: full_name.trim(),
      phone: cleanPhone,
      role: role || 'salesman',
      store_id: resolvedStoreUuid,
      passcode: (passcode || '0000').trim(),
      is_active: true
    };

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (profErr) {
      console.error('Error in profiles upsert:', profErr);
      return NextResponse.json({ success: false, error: profErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      staff: {
        id: profile.id,
        phone: profile.phone,
        passcode: profile.passcode,
        full_name: profile.full_name,
        role: profile.role,
        store_id: store_id || 'DM-01',
        is_active: profile.is_active,
        commission_rate: commission_rate || 1.0,
        monthly_sales_target: monthly_sales_target || 500000,
        sales_today_count: 0,
        month_sales_amount: 0,
        created_at: profile.created_at
      }
    });
  } catch (error: any) {
    console.error('Staff creation failed:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
