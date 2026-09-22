import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const STORE_NAME_MAP: Record<string, string> = {
  'DM-01': 'Store DM-01 (Kanthal Chauraha - Flagship)',
  'DM-02': 'Store DM-02 (Freeganj 2.0)',
  'DM-03': 'Store DM-03 (Nanakheda Center)',
  'ALL': 'All Store Branches'
};

const STORE_CODE_TO_UUID: Record<string, string> = {
  'DM-01': '3be59f85-2859-476c-b402-31c552a83146',
  'DM-02': '7705c16a-2e91-4ef5-93bc-00084848db6a'
};

const UUID_TO_STORE_CODE: Record<string, string> = {
  '3be59f85-2859-476c-b402-31c552a83146': 'DM-01',
  '7705c16a-2e91-4ef5-93bc-00084848db6a': 'DM-02'
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const salesmanPhone = searchParams.get('salesmanPhone');

    const supabase = createServerSupabaseClient();

    let query = supabase.from('sales_approvals').select('*').order('created_at', { ascending: false });

    if (storeId && storeId !== 'ALL') {
      const targetUuid = STORE_CODE_TO_UUID[storeId] || storeId;
      query = query.eq('store_id', targetUuid);
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }
    // Restrict to a single salesman's own deals (used for salesman role only).
    if (salesmanPhone) {
      const cleanSalesmanPhone = salesmanPhone.replace(/\D/g, '').slice(-10);
      if (cleanSalesmanPhone.length === 10) {
        query = query.eq('sales_person_phone', cleanSalesmanPhone);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch deals error:', error);
      return NextResponse.json(
        { success: false, deals: [] },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      );
    }

    const deals = (data || []).map((row: any) => {
      const storeCode = UUID_TO_STORE_CODE[row.store_id] || (row.store_id?.includes('7705') ? 'DM-02' : 'DM-01');
      return {
        id: row.id,
        token: `SA-${row.id.slice(0, 6)}`,
        storeId: storeCode,
        storeName: STORE_NAME_MAP[storeCode] || `Store ${storeCode}`,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        customerAddress: row.customer_address,
        productName: row.product_name,
        category: row.category || 'Mobile Phone',
        imeiSerial: row.imei_serial,
        basePrice: Number(row.product_price) || Number(row.final_price) || 0,
        discount: Number(row.discount) || 0,
        finalPrice: Number(row.final_price) || 0,
        paymentMethod: row.payment_method || 'Cash',
        financeProvider: row.finance_provider,
        disbursementAmount: Number(row.disbursement_amount) || 0,
        downPaymentCash: Number(row.down_payment_cash) || 0,
        downPaymentUpi: Number(row.down_payment_upi) || 0,
        downPaymentCard: Number(row.down_payment_card) || 0,
        cashAmount: Number(row.cash_amount) || 0,
        upiAmount: Number(row.upi_amount) || 0,
        cardAmount: Number(row.card_amount) || 0,
        neftAmount: Number(row.neft_amount) || 0,
        remark: row.remark || null,
        hasExchange: Boolean(row.has_device_exchange),
        oldDeviceName: row.device_name,
        oldDeviceImei: row.device_imei,
        oldDeviceCondition: row.device_condition,
        exchangeValue: Number(row.device_exchange_amount) || 0,
        gifts: Array.isArray(row.gifts) ? row.gifts.join(', ') : (row.gifts || 'None'),
        vasPlan: row.vas_details || 'None',
        salesPersonName: row.sales_person_name || 'Floor Salesman',
        salesPersonPhone: row.sales_person_phone,
        status: row.status,
        decidedBy: row.approved_by_name,
        decidedAt: row.approved_at,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        submittedAt: row.created_at,
        billNumber: row.invoice_id || (row.id ? `25-26/${row.id.slice(0, 6)}/DEVI` : undefined),
        isTallyUploaded: Boolean((row.barcode && row.barcode.startsWith('TALLY_UPLOADED')) || (row.invoice_id && row.invoice_id.startsWith('TALLY_UPLOADED'))),
        tallyUploadedAt: (row.barcode && row.barcode.startsWith('TALLY_UPLOADED')) ? row.barcode.split(':')[1] : ((row.invoice_id && row.invoice_id.startsWith('TALLY_UPLOADED')) ? row.invoice_id.split(':')[1] : undefined),
        tallyUploadedBy: (row.barcode && row.barcode.startsWith('TALLY_UPLOADED')) ? row.barcode.split(':')[2] : ((row.invoice_id && row.invoice_id.startsWith('TALLY_UPLOADED')) ? row.invoice_id.split(':')[2] : undefined)
      };
    });


    return NextResponse.json(
      { success: true, deals },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      }
    );
  } catch (error: any) {
    console.error('Fetch deals API error:', error);
    return NextResponse.json(
      { success: false, deals: [] },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      }
    );
  }
}
