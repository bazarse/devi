import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET: list all active brands (central, shared across devices)
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('brands')
      .select('name, is_active')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, brands: [], error: error.message }, { status: 500 });
    }
    const brands = (data || []).filter((b: any) => b.is_active !== false).map((b: any) => b.name);
    return NextResponse.json(
      { success: true, brands },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (e: any) {
    return NextResponse.json({ success: false, brands: [], error: e?.message }, { status: 500 });
  }
}

// POST: add a new brand (idempotent). Body: { name }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Brand name required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('brands')
      .upsert({ name, is_active: true }, { onConflict: 'name' });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, name });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
