import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const STORE_UUID_TO_CODE: Record<string, string> = {
  '3be59f85-2859-476c-b402-31c552a83146': 'DM-01',
  '7705c16a-2e91-4ef5-93bc-00084848db6a': 'DM-02',
};

/**
 * Authoritative login endpoint.
 * Single source of truth = Supabase `profiles` table.
 * No local cache, no hardcoded accounts. A user that is deleted or
 * marked is_active=false in Supabase can NEVER log in.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawPhone: string = body?.phone ?? '';
    const rawPin: string = body?.passcode ?? '';

    const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
    const cleanPin = String(rawPin).trim();

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number' },
        { status: 400 }
      );
    }
    if (cleanPin.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Please enter 4-digit security PIN' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Look up the user strictly in Supabase.
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, phone, passcode, full_name, role, store_id, is_active, stores(code)')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (error) {
      console.error('[staff/login] Supabase query error:', error);
      return NextResponse.json(
        { success: false, error: 'Login service unavailable. Please try again.' },
        { status: 500 }
      );
    }

    // User does not exist (deleted or never created) -> reject.
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'This mobile number is not authorized. Please contact Super Admin.' },
        { status: 401 }
      );
    }

    // User exists but is deactivated -> reject.
    if (profile.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'This account is deactivated. Please contact Store Admin.' },
        { status: 403 }
      );
    }

    // Verify PIN against Supabase value.
    const expectedPin = String(profile.passcode ?? '0000').trim();
    if (cleanPin !== expectedPin) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN! Please enter correct 4-digit security PIN' },
        { status: 401 }
      );
    }

    const storeCode =
      (profile as any).stores?.code ||
      STORE_UUID_TO_CODE[profile.store_id as string] ||
      (String(profile.store_id || '').includes('7705') ? 'DM-02' : 'DM-01');

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        phone: profile.phone,
        full_name: profile.full_name,
        role: profile.role,
        store_id: storeCode,
        is_active: profile.is_active ?? true,
      },
    });
  } catch (err: any) {
    console.error('[staff/login] Server error:', err);
    return NextResponse.json(
      { success: false, error: 'Authentication error. Please try again.' },
      { status: 500 }
    );
  }
}
