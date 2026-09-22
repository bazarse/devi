import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Re-validates an active session against Supabase.
 * Returns { valid: false } when the user has been deleted or deactivated,
 * so the client can force a logout. No local cache is trusted.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanPhone = String(body?.phone ?? '').replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return NextResponse.json({ valid: false, reason: 'invalid_phone' });
    }

    const supabase = createServerSupabaseClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, is_active')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (error) {
      // On a transient DB error, don't forcibly log the user out.
      return NextResponse.json({ valid: true, transientError: true });
    }

    if (!profile) {
      return NextResponse.json({ valid: false, reason: 'deleted' });
    }
    if (profile.is_active === false) {
      return NextResponse.json({ valid: false, reason: 'deactivated' });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: true, transientError: true });
  }
}
