import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw = String(body?.phoneOrId ?? '').trim();

    if (!raw) {
      return NextResponse.json({ success: false, error: 'Identifier required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Build a robust lookup: match by raw id, or by the cleaned 10-digit phone.
    const cleanPhone = raw.replace(/\D/g, '').slice(-10);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);

    let prof: { id: string; phone: string } | null = null;

    if (isUuid) {
      const { data } = await supabase
        .from('profiles')
        .select('id, phone')
        .eq('id', raw)
        .maybeSingle();
      prof = data ?? null;
    }

    if (!prof && cleanPhone.length === 10) {
      const { data } = await supabase
        .from('profiles')
        .select('id, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();
      prof = data ?? null;
    }

    if (!prof) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 1. Delete the profile row (this alone blocks login now, since login
    //    reads only from `profiles`).
    const { error: profErr } = await supabase.from('profiles').delete().eq('id', prof.id);
    if (profErr) {
      console.error('[staff/delete] Failed to delete profile:', profErr);
      return NextResponse.json(
        { success: false, error: profErr.message },
        { status: 500 }
      );
    }

    // 2. Best-effort: also delete the Supabase Auth user so no dangling auth
    //    account remains. A failure here is logged but does not block, since
    //    the profile (the login source of truth) is already gone.
    let authDeleted = true;
    try {
      const { error: authErr } = await supabase.auth.admin.deleteUser(prof.id);
      if (authErr) {
        authDeleted = false;
        console.warn('[staff/delete] Auth user delete failed:', authErr.message);
      }
    } catch (e: any) {
      authDeleted = false;
      console.warn('[staff/delete] Auth user delete threw:', e?.message);
    }

    return NextResponse.json({ success: true, deleted: true, authDeleted });
  } catch (error: any) {
    console.error('[staff/delete] Server error:', error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
