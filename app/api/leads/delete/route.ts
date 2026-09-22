import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const leadId = body.leadId || body.id;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId or id is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('leads').delete().eq('id', leadId);

    if (error) {
      console.error('Lead delete error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Lead deleted from cloud database' });
  } catch (error: any) {
    console.error('Lead delete API error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
