import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dealId } = body;

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'dealId is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const cleanId = String(dealId).trim();
    const supabase = createServerSupabaseClient();

    // 1. Direct UUID deletion
    if (cleanId.length === 36 && cleanId.includes('-')) {
      const { error } = await supabase.from('sales_approvals').delete().eq('id', cleanId);
      if (error) {
        console.error('Supabase delete error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }
      return NextResponse.json(
        { success: true, message: 'Deal deleted successfully' },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 2. Token / Bill No pattern deletion (e.g. SA-88ea68 or 25-26/88ea68/DEVI)
    let searchToken = cleanId;
    if (cleanId.includes('/')) {
      const parts = cleanId.split('/');
      if (parts[1]) searchToken = parts[1];
    }
    searchToken = searchToken.replace('SA-', '');

    const { data: allDeals } = await supabase.from('sales_approvals').select('id');
    if (allDeals && allDeals.length > 0) {
      const matchingIds = allDeals
        .filter(d => d.id === searchToken || d.id.startsWith(searchToken) || d.id.includes(searchToken))
        .map(d => d.id);

      if (matchingIds.length > 0) {
        await supabase.from('sales_approvals').delete().in('id', matchingIds);
      }
    }

    return NextResponse.json(
      { success: true, message: 'Deal deleted successfully' },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('Delete deal API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}
