import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

const STORE_CODE_TO_UUID: Record<string, string> = {
  'DM-01': '3be59f85-2859-476c-b402-31c552a83146',
  'DM-02': '7705c16a-2e91-4ef5-93bc-00084848db6a'
};

const DEFAULT_SALES_PERSON_UUID: Record<string, string> = {
  '0000000000': 'ca750241-055e-43a4-9a6e-13da57a9110a',
  '9926598700': 'ab77c1e4-0746-4507-8fae-a7ab0a260ca8',
  '7828915933': '10251ff2-720f-417d-97f9-7e85080c8124',
  '9893264192': 'aa6b5456-1d7f-4f87-8c8c-283a23d4e593'
};

export async function POST(request: Request) {
  try {
    const dealData = await request.json();
    const supabase = createServerSupabaseClient();


    const cleanStoreCode = dealData.storeId?.includes('7705') || dealData.storeId === 'DM-02' ? 'DM-02' : 'DM-01';
    const resolvedStoreUuid = STORE_CODE_TO_UUID[cleanStoreCode] || '3be59f85-2859-476c-b402-31c552a83146';
    const cleanPhone = (dealData.salesPersonPhone || '').replace(/\D/g, '').slice(-10);

    // 1. Resolve sales_person_id from profiles or known map
    let salesPersonId = DEFAULT_SALES_PERSON_UUID[cleanPhone] || 'ca750241-055e-43a4-9a6e-13da57a9110a';
    if (cleanPhone) {
      const { data: prof } = await supabase.from('profiles').select('id').eq('phone', cleanPhone).maybeSingle();
      if (prof?.id) {
        salesPersonId = prof.id;
      }
    }

    const insertPayload: any = {
      store_id: resolvedStoreUuid,
      sales_person_id: salesPersonId,
      sales_person_name: dealData.salesPersonName || 'Salesman (Counter Staff)',
      sales_person_phone: cleanPhone || '0000000000',
      customer_name: dealData.customerName || 'Walking Customer',
      customer_phone: dealData.customerPhone || '0000000000',
      customer_address: dealData.customerAddress || null,
      product_name: dealData.productName,
      category: dealData.category || 'Mobile Phone',
      imei_serial: dealData.imeiSerial || '354772952358675',
      product_price: Number(dealData.finalPrice || 0) + Number(dealData.discount || 0),
      discount: Number(dealData.discount || 0),
      final_price: Number(dealData.finalPrice || 0),
      payment_method: dealData.paymentMethod || 'Cash',
      finance_provider: dealData.financeProvider || null,
      disbursement_amount: Number(dealData.disbursementAmount || 0),
      down_payment_cash: Number(dealData.downPaymentCash || 0),
      down_payment_upi: Number(dealData.downPaymentUpi || 0),
      down_payment_card: Number(dealData.downPaymentCard || 0),
      cash_amount: Number(dealData.cashAmount || 0),
      upi_amount: Number(dealData.upiAmount || 0),
      card_amount: Number(dealData.cardAmount || 0),
      neft_amount: Number(dealData.neftAmount || 0),
      has_device_exchange: Boolean(dealData.hasExchange),
      device_name: dealData.oldDeviceName || null,
      device_imei: dealData.oldDeviceImei || null,
      device_condition: dealData.oldDeviceCondition || null,
      device_exchange_amount: Number(dealData.exchangeValue || 0),
      gifts: dealData.gifts ? (Array.isArray(dealData.gifts) ? dealData.gifts : [dealData.gifts]) : [],
      vas_details: dealData.vasPlan || null,
      remark: dealData.remark || null,
      status: 'pending_approval',
      approved_by_name: null,
      approved_at: null
    };

    let { data: inserted, error: insertErr } = await supabase
      .from('sales_approvals')
      .insert(insertPayload)
      .select()
      .single();

    // Graceful fallback: if an optional column (neft_amount / remark) hasn't
    // been added to the DB yet, drop the offending column(s) and retry so
    // sales are never blocked.
    if (insertErr && /(neft_amount|remark)/i.test(insertErr.message || '')) {
      console.warn('Optional column missing, retrying insert without neft_amount/remark:', insertErr.message);
      const { neft_amount, remark, ...payloadTrimmed } = insertPayload;
      const retry = await supabase
        .from('sales_approvals')
        .insert(payloadTrimmed)
        .select()
        .single();
      inserted = retry.data;
      insertErr = retry.error;
    }

    if (insertErr) {
      console.error('Supabase deal insert error:', insertErr);
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    // 2. Fire FCM push directly to all registered Admin devices
    try {
      const { sendFcmPushNotification } = await import('@/lib/fcm-service');
      const price = Number(dealData.finalPrice || 0).toLocaleString('en-IN');
      await sendFcmPushNotification({
        role: 'admin',
        storeCode: cleanStoreCode,
        title: `🚨 Pending Deal Approval • ₹${price}`,
        body: `📱 ${dealData.productName}\n🏪 Store: ${cleanStoreCode} | Staff: ${dealData.salesPersonName || 'Salesman'}\n👤 Customer: ${dealData.customerName || 'Customer'}\n👉 Tap to View, Approve or Reject`,
        data: {
          url: '/admin/super/approvals',
          type: 'deal_alert',
          dealId: inserted.id,
          productName: dealData.productName || 'Device',
          finalPrice: String(dealData.finalPrice || 0),
          customerName: dealData.customerName || 'Customer',
          customerPhone: dealData.customerPhone || '',
          storeId: cleanStoreCode,
          salesPersonName: dealData.salesPersonName || 'Sales Staff',
          paymentMethod: dealData.paymentMethod || 'Cash'
        }
      });
    } catch (pushErr) {
      console.warn('FCM push error on deal submit:', pushErr);
    }

    return NextResponse.json({
      success: true,
      dealId: inserted.id,
      status: 'pending_approval',
      token: `SA-${inserted.id.slice(0, 6)}`,
      deal: {
        ...dealData,
        id: inserted.id,
        status: 'pending_approval',
        token: `SA-${inserted.id.slice(0, 6)}`,
        storeId: cleanStoreCode,
        submittedAt: inserted.created_at
      }
    });

  } catch (error: any) {
    console.error('Submit deal route failed:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
