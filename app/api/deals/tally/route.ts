import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dealId, isUploaded, userName } = body;

    if (!dealId) {
      return NextResponse.json({ success: false, error: 'dealId is required' }, { status: 400 });
    }

    const cleanId = String(dealId).trim();
    const supabase = createServerSupabaseClient();

    // Helper to compute preserved barcode and apply update
    const updateTallyOnDeal = async (targetId: string) => {
      const { data: currentDeal } = await supabase
        .from('sales_approvals')
        .select('id, barcode')
        .eq('id', targetId)
        .maybeSingle();

      let originalBarcode: string | null = null;
      if (currentDeal?.barcode) {
        if (currentDeal.barcode.includes('|ORIGINAL_BARCODE:')) {
          originalBarcode = currentDeal.barcode.split('|ORIGINAL_BARCODE:')[1] || null;
        } else if (!currentDeal.barcode.startsWith('TALLY_UPLOADED')) {
          originalBarcode = currentDeal.barcode;
        }
      }

      const tallyMarker = isUploaded 
        ? `TALLY_UPLOADED:${new Date().toISOString()}:${userName || 'Admin'}${originalBarcode ? `|ORIGINAL_BARCODE:${originalBarcode}` : ''}`
        : originalBarcode;

      const { data, error } = await supabase
        .from('sales_approvals')
        .update({ barcode: tallyMarker, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Tally status update error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, deal: data };
    };

    // 1. Direct UUID update
    if (cleanId.length === 36 && cleanId.includes('-')) {
      const result = await updateTallyOnDeal(cleanId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, isUploaded: Boolean(isUploaded), deal: result.deal });
    }

    // 2. Token pattern update (e.g. SA-88ea68)
    const searchToken = String(cleanId).replace('SA-', '');
    const { data: matched } = await supabase.from('sales_approvals').select('id');
    if (matched && matched.length > 0) {
      const target = matched.find(d => d.id === searchToken || d.id.startsWith(searchToken));
      if (target) {
        const result = await updateTallyOnDeal(target.id);
        if (!result.success) {
          return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
        return NextResponse.json({ success: true, isUploaded: Boolean(isUploaded), deal: result.deal });
      }
    }

    return NextResponse.json({ success: true, isUploaded: Boolean(isUploaded) });
  } catch (error: any) {
    console.error('Tally API error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
