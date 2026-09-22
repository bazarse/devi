import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    const supabase = createServerSupabaseClient();
    let query = supabase.from('customers').select('*').order('updated_at', { ascending: false });

    if (storeId && storeId !== 'ALL') {
      const targetUuid = STORE_CODE_TO_UUID[storeId] || storeId;
      query = query.eq('primary_store_id', targetUuid);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch customers error:', error);
      return NextResponse.json({ success: false, customers: [] }, { status: 500 });
    }

    // Fetch approved deals and leads for 360 CRM customer profile aggregation
    const normalizePhone = (p?: string | null) => (p ? String(p).replace(/\D/g, '').slice(-10) : '');

    const { data: dealsData } = await supabase
      .from('sales_approvals')
      .select('*')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });

    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    const dealsByPhone: Record<string, any[]> = {};
    for (const d of (dealsData || [])) {
      const phoneKey = normalizePhone(d.customer_phone);
      if (phoneKey) {
        if (!dealsByPhone[phoneKey]) dealsByPhone[phoneKey] = [];
        dealsByPhone[phoneKey].push(d);
      }
    }

    const leadsByPhone: Record<string, any[]> = {};
    for (const l of (leadsData || [])) {
      const phoneKey = normalizePhone(l.customer_phone);
      if (phoneKey) {
        if (!leadsByPhone[phoneKey]) leadsByPhone[phoneKey] = [];
        leadsByPhone[phoneKey].push(l);
      }
    }

    const STATUS_DB_TO_UI: Record<string, string> = {
      'New': 'Hot Lead',
      'Interested': 'Hot Lead',
      'Contacted': 'Warm Lead',
      'Follow_Up': 'Follow Up',
      'Converted': 'Converted',
      'Not_Interested': 'Lost'
    };

    const customers = (data || []).map((row: any) => {
      const cleanPhone = normalizePhone(row.phone);
      const matchingDeals = dealsByPhone[cleanPhone] || [];
      const matchingLeads = leadsByPhone[cleanPhone] || [];
      let customerTotalDue = Math.max(0, Number(row.credit_balance) || 0);

      const purchases = matchingDeals.map((d: any) => {
        const storeCode = UUID_TO_STORE_CODE[d.store_id] || (d.store_id?.includes('7705') ? 'DM-02' : 'DM-01');
        const invToken = d.token || d.id;
        const invoiceNo = `25-26/${String(invToken).replace('SA-', '')}/DEVI`;

        const isEmi = d.payment_method === 'EMI';
        const finalP = Number(d.final_price) || 0;
        const cashP = isEmi ? (Number(d.down_payment_cash) || 0) : (Number(d.cash_amount) || 0);
        const upiP = isEmi ? (Number(d.down_payment_upi) || 0) : (Number(d.upi_amount) || 0);
        const cardP = isEmi ? (Number(d.down_payment_card) || 0) : (Number(d.card_amount) || 0);
        const neftP = Number(d.neft_amount) || 0;
        const disbP = isEmi ? (Number(d.disbursement_amount) || 0) : 0;
        const exchP = Number(d.device_exchange_amount) || 0;

        const collected = cashP + upiP + cardP + neftP + disbP + exchP;
        const dealDue = (collected === 0 && !isEmi) ? 0 : Math.max(0, finalP - collected);
        customerTotalDue += dealDue;

        return {
          id: d.id,
          date: d.approved_at || d.created_at,
          invoiceNo,
          productName: d.product_name,
          category: d.category || 'Mobile Phone',
          imei: d.imei_serial || '',
          amount: finalP,
          collected,
          due: dealDue,
          remark: d.remark || undefined,
          paymentMethod: d.payment_method || 'Cash',
          financeProvider: d.finance_provider || null,
          vasPlan: d.vas_details || 'Standard Warranty',
          storeId: storeCode,
          salesman: d.sales_person_name || 'Staff'
        };
      });

      const leads = matchingLeads.map((l: any) => ({
        id: l.id,
        date: l.created_at,
        model: l.product_of_interest || 'Smartphone',
        category: l.interest_category || 'Mobile Phone',
        budget: Number(l.budget) || 0,
        status: STATUS_DB_TO_UI[l.status] || l.status || 'Hot Lead',
        notes: l.notes || undefined,
        salesman: 'Sales Executive'
      }));

      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        primaryStoreId: UUID_TO_STORE_CODE[row.primary_store_id] || (row.primary_store_id?.includes('7705') ? 'DM-02' : 'DM-01'),
        creditBalance: Number(row.credit_balance) || 0,
        totalDue: customerTotalDue,
        totalSpent: Number(row.total_spent) || 0,
        purchaseCount: purchases.length > 0 ? purchases.length : (Number(row.total_spent) > 0 ? 1 : 0),
        firstSeen: row.created_at,
        lastPurchaseDate: purchases[0]?.date || row.updated_at,
        purchases,
        leads,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    return NextResponse.json(
      { success: true, customers },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error: any) {
    console.error('Customers API error:', error);
    return NextResponse.json({ success: false, customers: [] }, { status: 500 });
  }
}
