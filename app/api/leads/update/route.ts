import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const STATUS_UI_TO_DB: Record<string, string> = {
  'Hot Lead': 'Interested',
  'Warm Lead': 'Contacted',
  'Follow Up': 'Follow_Up',
  'Converted': 'Converted',
  'Lost': 'Not_Interested'
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const leadId = body.leadId || body.id;
    const { status, notes } = body;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId or id is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const updatePayload: any = { updated_at: new Date().toISOString() };

    if (status) {
      updatePayload.status = STATUS_UI_TO_DB[status] || status;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Lead update error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    console.error('Lead update API error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
