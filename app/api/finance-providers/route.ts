import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function mapRow(r: any) {
  return {
    id: r.id,
    name: r.name,
    code: r.code || '',
    storeId: r.store_id || 'DM-01',
    merchantId: r.merchant_id || undefined,
    contactPerson: r.contact_person || undefined,
    contactPhone: r.contact_phone || undefined,
    isActive: r.is_active !== false,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  };
}

// GET /api/finance-providers?storeId=DM-01  -> central list (all devices)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const supabase = createServerSupabaseClient();

    let query = supabase.from('finance_providers').select('*').order('name', { ascending: true });
    if (storeId && storeId !== 'ALL') query = query.eq('store_id', storeId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, providers: [], error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { success: true, providers: (data || []).map(mapRow) },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, providers: [], error: e?.message }, { status: 500 });
  }
}

// POST: create/update a provider. Body: { id?, name, code?, storeId, merchantId?, contactPerson?, contactPhone?, isActive?, notes? }
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const name = String(b?.name ?? '').trim();
    const storeId = String(b?.storeId ?? '').trim();
    if (!name || !storeId) {
      return NextResponse.json({ success: false, error: 'name and storeId required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const row: any = {
      name,
      code: b.code || null,
      store_id: storeId,
      merchant_id: b.merchantId || null,
      contact_person: b.contactPerson || null,
      contact_phone: b.contactPhone || null,
      is_active: b.isActive !== false,
      notes: b.notes || null,
    };
    // If a uuid id is provided, update that row; else insert new.
    const isUuid = typeof b.id === 'string' && /^[0-9a-f-]{36}$/i.test(b.id);
    if (isUuid) row.id = b.id;

    const { data, error } = await supabase
      .from('finance_providers')
      .upsert(row, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, provider: data ? mapRow(data) : null });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// PATCH: toggle active. Body: { id, isActive }
export async function PATCH(request: Request) {
  try {
    const b = await request.json();
    if (!b?.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('finance_providers')
      .update({ is_active: b.isActive !== false })
      .eq('id', b.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// DELETE /api/finance-providers?id=<uuid>
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('finance_providers').delete().eq('id', id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
