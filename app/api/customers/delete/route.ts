import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);

    const customerId = body.customerId || body.id || searchParams.get('customerId') || searchParams.get('id');
    const phone = body.phone || searchParams.get('phone');

    if (!customerId && !phone) {
      return NextResponse.json({ success: false, error: 'Customer ID or phone number is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : null;

    // 1. Locate customer in DB
    let targetCustomer: any = null;

    if (customerId) {
      const { data } = await supabase
        .from('customers')
        .select('id, phone, name')
        .eq('id', customerId)
        .maybeSingle();
      if (data) {
        targetCustomer = data;
      }
    }

    if (!targetCustomer && cleanPhone) {
      const { data } = await supabase
        .from('customers')
        .select('id, phone, name')
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (data) {
        targetCustomer = data;
      }
    }

    if (!targetCustomer && customerId) {
      const altClean = String(customerId).replace(/\D/g, '').slice(-10);
      if (altClean.length === 10) {
        const { data } = await supabase
          .from('customers')
          .select('id, phone, name')
          .eq('phone', altClean)
          .maybeSingle();
        if (data) targetCustomer = data;
      }
    }

    if (!targetCustomer) {
      return NextResponse.json({ success: false, error: 'Customer record not found' }, { status: 404 });
    }

    const targetUuid = targetCustomer.id;
    const targetPhone = targetCustomer.phone;

    // 2. Unlink / clean foreign key references to prevent integrity violation
    try {
      if (targetUuid) {
        await supabase.from('sales_approvals').update({ customer_id: null }).eq('customer_id', targetUuid);
        await supabase.from('billing_invoices').update({ customer_id: null }).eq('customer_id', targetUuid);
        await supabase.from('repair_orders').update({ customer_id: null }).eq('customer_id', targetUuid);
        await supabase.from('khata_transactions').delete().eq('customer_id', targetUuid);
      }
    } catch (fkErr) {
      console.warn('Customer delete FK unlinking warning:', fkErr);
    }

    // 3. Delete from customers table
    const { error: delErr } = await supabase
      .from('customers')
      .delete()
      .eq('id', targetUuid);

    if (delErr) {
      console.error('Customer delete error:', delErr);
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Customer ${targetCustomer.name || ''} deleted successfully`,
      deletedId: targetUuid,
      deletedPhone: targetPhone
    });
  } catch (error: any) {
    console.error('Customer delete exception:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  return POST(request);
}
