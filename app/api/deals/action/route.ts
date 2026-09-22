import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dealId, action, decidedBy, rejectionReason, edits } = body;

    if (!dealId || !action) {
      return NextResponse.json({ success: false, error: 'dealId and action are required' }, { status: 400 });
    }

    let normAction = String(action || '').toLowerCase().trim();
    if (normAction === 'approved') normAction = 'approve';
    if (normAction === 'rejected') normAction = 'reject';
    if (normAction === 'edited') normAction = 'edit';

    const supabase = createServerSupabaseClient();
    const nowIso = new Date().toISOString();
    const updatePayload: any = {
      updated_at: nowIso
    };

    // 1. Mandatory Rejection Reason Validation (BUG-R1-05)
    if (normAction === 'reject') {
      const trimmedReason = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';
      if (!trimmedReason) {
        return NextResponse.json({ success: false, error: 'Rejection reason is mandatory and cannot be empty' }, { status: 400 });
      }
      updatePayload.status = 'rejected';
      updatePayload.approved_by_name = decidedBy || 'Store Manager';
      updatePayload.approved_at = nowIso;
      updatePayload.rejection_reason = trimmedReason;
    } else if (normAction === 'approve') {
      updatePayload.status = 'approved';
      updatePayload.approved_by_name = decidedBy || 'Store Manager';
      updatePayload.approved_at = nowIso;
      updatePayload.rejection_reason = null;
    } else if (normAction === 'edit') {
      updatePayload.status = 'approved';
      updatePayload.approved_by_name = edits?.editedBy || decidedBy || 'Store Manager';
      updatePayload.approved_at = nowIso;
      updatePayload.rejection_reason = null;
      if (edits?.finalPrice !== undefined) updatePayload.final_price = Number(edits.finalPrice);
      if (edits?.productPrice !== undefined) updatePayload.product_price = Number(edits.productPrice);
      if (edits?.discount !== undefined) updatePayload.discount = Number(edits.discount);
      if (edits?.imeiSerial !== undefined) updatePayload.imei_serial = edits.imeiSerial;
      if (edits?.productName !== undefined) updatePayload.product_name = edits.productName;
      if (edits?.customerName !== undefined) updatePayload.customer_name = edits.customerName;
      if (edits?.customerPhone !== undefined) updatePayload.customer_phone = edits.customerPhone;
      if (edits?.customerAddress !== undefined) updatePayload.customer_address = edits.customerAddress;
      if (edits?.paymentMethod !== undefined) updatePayload.payment_method = edits.paymentMethod;
      if (edits?.financeProvider !== undefined) updatePayload.finance_provider = edits.financeProvider;
      if (edits?.cashAmount !== undefined) updatePayload.cash_amount = Number(edits.cashAmount);
      if (edits?.upiAmount !== undefined) updatePayload.upi_amount = Number(edits.upiAmount);
      if (edits?.cardAmount !== undefined) updatePayload.card_amount = Number(edits.cardAmount);
      if (edits?.neftAmount !== undefined) updatePayload.neft_amount = Number(edits.neftAmount);
      if (edits?.downPaymentCash !== undefined) updatePayload.down_payment_cash = Number(edits.downPaymentCash);
      if (edits?.downPaymentUpi !== undefined) updatePayload.down_payment_upi = Number(edits.downPaymentUpi);
      if (edits?.downPaymentCard !== undefined) updatePayload.down_payment_card = Number(edits.downPaymentCard);
      if (edits?.disbursementAmount !== undefined) updatePayload.disbursement_amount = Number(edits.disbursementAmount);
      if (edits?.gifts !== undefined) updatePayload.gifts = Array.isArray(edits.gifts) ? edits.gifts : (edits.gifts ? [edits.gifts] : []);
      if (edits?.vasPlan !== undefined) updatePayload.vas_details = edits.vasPlan;
      if (edits?.remark !== undefined) updatePayload.remark = edits.remark;
    }

    // 2. Fetch existing deal to verify status and track previous IMEI
    const { data: existingDeal, error: fetchErr } = await supabase
      .from('sales_approvals')
      .select('*')
      .eq('id', dealId)
      .maybeSingle();

    if (fetchErr) {
      console.error('Error fetching deal:', fetchErr);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!existingDeal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // 3. Stock Availability Pre-check (BUG-R1-04)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealId);
    const targetImei = (edits?.imeiSerial !== undefined ? edits.imeiSerial : existingDeal.imei_serial)?.trim();
    const hasValidImei = Boolean(targetImei && targetImei.length >= 6 && !['none', 'na', 'n/a'].includes(targetImei.toLowerCase()));

    if ((normAction === 'approve' || normAction === 'edit') && hasValidImei) {
      const { data: imeiRow, error: imeiCheckErr } = await supabase
        .from('imei_stock')
        .select('*')
        .eq('imei1', targetImei)
        .maybeSingle();

      if (imeiCheckErr) {
        console.error('Database error checking imei_stock:', imeiCheckErr);
        return NextResponse.json({ success: false, error: `Database error checking IMEI: ${imeiCheckErr.message}` }, { status: 500 });
      }

      if (imeiRow) {
        if (imeiRow.status === 'sold' && imeiRow.sold_invoice_id && imeiRow.sold_invoice_id !== dealId) {
          return NextResponse.json({
            success: false,
            error: `IMEI ${targetImei} is already sold (Invoice: ${imeiRow.sold_invoice_id}) and cannot be double-sold.`
          }, { status: 400 });
        }
        if (imeiRow.status !== 'in_stock' && imeiRow.sold_invoice_id !== dealId) {
          return NextResponse.json({
            success: false,
            error: `IMEI ${targetImei} is not available in stock (Current status: ${imeiRow.status}).`
          }, { status: 400 });
        }
      }
    }

    // 4. Update deal in sales_approvals
    let { data: updated, error: updateErr } = await supabase
      .from('sales_approvals')
      .update(updatePayload)
      .eq('id', dealId)
      .select()
      .maybeSingle();

    // Graceful fallback if an optional column (neft_amount / remark) not yet
    // added to the DB.
    if (updateErr && /(neft_amount|remark)/i.test(updateErr.message || '')) {
      console.warn('Optional column missing on update, retrying without neft_amount/remark:', updateErr.message);
      const { neft_amount, remark, ...payloadTrimmed } = updatePayload;
      const retry = await supabase
        .from('sales_approvals')
        .update(payloadTrimmed)
        .eq('id', dealId)
        .select()
        .maybeSingle();
      updated = retry.data;
      updateErr = retry.error;
    }

    if (updateErr) {
      console.error('Supabase deal update error:', updateErr);
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // 5. Stock Auto-Deduction & Previous IMEI Release (BUG-R1-04)
    if (normAction === 'approve' || normAction === 'edit') {
      const prevImei = existingDeal.imei_serial?.trim();
      // Release previous IMEI if changed during Edit & Approve
      if (prevImei && prevImei !== targetImei && prevImei.length >= 6 && !['none', 'na', 'n/a'].includes(prevImei.toLowerCase())) {
        await supabase
          .from('imei_stock')
          .update({
            status: 'in_stock',
            sold_at: null,
            sold_invoice_id: null,
            updated_at: nowIso
          })
          .eq('imei1', prevImei);
      }

      if (hasValidImei) {
        const { error: stockErr } = await supabase
          .from('imei_stock')
          .update({
            status: 'sold',
            sold_at: nowIso,
            sold_invoice_id: isUuid ? dealId : null,
            updated_at: nowIso
          })
          .eq('imei1', targetImei);

        if (stockErr) {
          console.error('Inventory IMEI auto-deduct error:', stockErr);
          return NextResponse.json({ success: false, error: `Failed to deduct stock: ${stockErr.message}` }, { status: 500 });
        }
      } else if (updated?.store_id && updated?.product_name) {
        // Non-serialized item stock deduction from store_inventory
        try {
          const { data: prod } = await supabase
            .from('products')
            .select('id')
            .ilike('name', updated.product_name)
            .maybeSingle();

          if (prod?.id) {
            const { data: inv } = await supabase
              .from('store_inventory')
              .select('id, quantity')
              .eq('store_id', updated.store_id)
              .eq('product_id', prod.id)
              .maybeSingle();

            if (inv && inv.quantity > 0) {
              await supabase
                .from('store_inventory')
                .update({ quantity: Math.max(0, inv.quantity - 1), updated_at: nowIso })
                .eq('id', inv.id);
            }
          }
        } catch (invErr) {
          console.warn('Store inventory deduction error:', invErr);
        }
      }

      // 6. Device Exchange Ingestion (BUG-R2-01 integration)
      const hasExchange = Boolean(updated?.has_device_exchange || edits?.hasExchange || existingDeal?.has_device_exchange);
      if (hasExchange) {
        try {
          const { data: existingEx } = await supabase
            .from('device_exchanges')
            .select('id')
            .eq('sale_approval_id', dealId)
            .maybeSingle();

          if (!existingEx) {
            const STORE_CODE_TO_UUID: Record<string, string> = {
              'DM-01': '3be59f85-2859-476c-b402-31c552a83146',
              'DM-02': '7705c16a-2e91-4ef5-93bc-00084848db6a'
            };
            let exchangeStoreUuid = updated?.store_id;
            if (!exchangeStoreUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exchangeStoreUuid)) {
              exchangeStoreUuid = STORE_CODE_TO_UUID[exchangeStoreUuid] || '3be59f85-2859-476c-b402-31c552a83146';
            }

            const rawCond = updated?.device_condition || edits?.oldDeviceCondition || 'Good';
            const validCond = ['Excellent', 'Good', 'Fair', 'Poor'].includes(rawCond) ? rawCond : 'Good';
            const valuationAmt = Number(updated?.device_exchange_amount || edits?.exchangeValue || 0);

            const { error: exchangeErr } = await supabase
              .from('device_exchanges')
              .insert({
                sale_approval_id: isUuid ? dealId : null,
                store_id: exchangeStoreUuid,
                device_name: updated?.device_name || edits?.oldDeviceName || 'Exchanged Device',
                device_imei: updated?.device_imei || edits?.oldDeviceImei || `EX-${Date.now()}`,
                device_condition: validCond,
                valuation_amount: valuationAmt,
                received_from_customer: updated?.customer_name || 'Customer',
                customer_phone: (updated?.customer_phone || '').replace(/\D/g, '').slice(-10) || '0000000000',
                status: 'in_stock',
                resale_price: Math.round(valuationAmt * 1.25)
              });

            if (exchangeErr) {
              console.error('Error inserting device_exchanges record:', exchangeErr);
            }
          }
        } catch (exErr) {
          console.error('Device exchange ingestion exception:', exErr);
        }
      }

      // Auto-Upsert Customer
      const custPhone = (updated?.customer_phone || '').replace(/\D/g, '').slice(-10);
      if (custPhone) {
        try {
          const { data: existingCust } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', custPhone)
            .maybeSingle();

          const spent = Number(updated?.final_price) || 0;

          if (existingCust) {
            await supabase
              .from('customers')
              .update({
                name: updated?.customer_name || existingCust.name,
                address: updated?.customer_address || existingCust.address,
                total_spent: (Number(existingCust.total_spent) || 0) + spent,
                updated_at: nowIso
              })
              .eq('id', existingCust.id);
          } else {
            await supabase
              .from('customers')
              .insert({
                name: updated?.customer_name || 'Customer',
                phone: custPhone,
                address: updated?.customer_address || null,
                primary_store_id: updated?.store_id,
                total_spent: spent,
                credit_balance: 0
              });
          }
        } catch (custErr) {
          console.warn('Customer auto-upsert error:', custErr);
        }
      }
    }

    // Dispatch Push Notification to Salesman & Store Staff (FCM + Web)
    try {
      const { sendFcmPushNotification } = await import('@/lib/fcm-service');
      const productName = updated?.product_name || 'Device';
      const billNo = updated?.id ? `25-26/${updated.id.slice(0, 6)}/DEVI` : '';
      
      let pushTitle = `🎉 Deal Approved • ${productName}`;
      let pushMsg = `Approved by ${updatePayload.approved_by_name}. Bill No: ${billNo}. You can now deliver the device to ${updated?.customer_name || 'customer'}!`;

      if (normAction === 'reject') {
        pushTitle = `⚠️ Deal Rejected • ${productName}`;
        pushMsg = `Rejected by ${updatePayload.approved_by_name}. Reason: "${rejectionReason || 'Please check with manager'}"`;
      } else if (normAction === 'edit') {
        pushTitle = `✏️ Deal Edited & Approved • ${productName}`;
        pushMsg = `Manager adjusted price/IMEI and approved. Bill No: ${billNo}. Ready for delivery!`;
      }

      await sendFcmPushNotification({
        role: 'salesman',
        targetPhone: updated?.sales_person_phone,
        title: pushTitle,
        body: pushMsg,
        data: {
          url: '/salesman/history',
          dealId: dealId,
          type: normAction === 'reject' ? 'deal_rejected' : 'deal_approved'
        }
      });
    } catch (pushErr) {
      console.warn('FCM push error on deal action:', pushErr);
    }

    return NextResponse.json(
      { success: true, deal: updated },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );

  } catch (error: any) {
    console.error('Deal action API error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
