import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const { phone, isActive } = await request.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone is required' }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: Boolean(isActive) })
      .eq('phone', cleanPhone)
      .select('id, phone, is_active')
      .maybeSingle();

    if (error) {
      console.error('Failed to toggle staff active status:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: data
    });
  } catch (error: any) {
    console.error('Toggle active route error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
