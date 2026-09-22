import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, newPin } = body;

    if (!phone || !newPin || String(newPin).trim().length !== 4) {
      return NextResponse.json(
        { success: false, error: 'Phone number and 4-digit PIN are required' },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const cleanPin = String(newPin).trim();

    const supabase = createServerSupabaseClient();

    // 1. Update in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({
        passcode: cleanPin,
        updated_at: new Date().toISOString()
      })
      .eq('phone', cleanPhone)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase PIN update error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'PIN updated successfully in cloud database',
      profile: data
    });
  } catch (error: any) {
    console.error('PIN update API error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
