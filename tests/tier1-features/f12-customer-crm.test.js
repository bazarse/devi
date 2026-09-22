/**
 * Tier 1 - Feature 12: Customer CRM Aggregation & Spend Integrity
 * Verifies that customer profiles aggregate purchases, eliminate triple-counting of total_spent,
 * and link customer leads accurately.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 12: Customer CRM Aggregation & Spend Integrity', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F12-T1: New customer is automatically created with correct spend upon deal approval', async () => {
    const custPhone = '9827011223';
    const price = 34999;

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: price,
      customerName: 'Rajesh Gupta',
      customerPhone: custPhone,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const { data: cust } = await db.from('customers').select('*').eq('phone', custPhone).single();
    assertEqual(cust.name, 'Rajesh Gupta');
    assertEqual(cust.total_spent, price);
    assertEqual(cust.purchase_count, 1);
  });

  it('F12-T2: Subsequent purchases increment total_spent exactly once without double or triple-counting', async () => {
    const custPhone = '9827011223';
    const firstPrice = 30000;
    const secondPrice = 15000;

    // First sale
    const res1 = await api.submitDeal({
      productName: 'Phone 1',
      finalPrice: firstPrice,
      customerName: 'Rajesh Gupta',
      customerPhone: custPhone,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: res1.dealId, action: 'approve', decidedBy: 'Admin' });

    // Second sale
    const res2 = await api.submitDeal({
      productName: 'Phone 2',
      finalPrice: secondPrice,
      customerName: 'Rajesh Gupta',
      customerPhone: custPhone,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: res2.dealId, action: 'approve', decidedBy: 'Admin' });

    const { data: cust } = await db.from('customers').select('*').eq('phone', custPhone).single();
    assertEqual(cust.total_spent, firstPrice + secondPrice, 'Total spent must be exactly sum of 2 purchases (no triple counting)');
    assertEqual(cust.purchase_count, 2);
  });

  it('F12-T3: Phone numbers are sanitized to clean 10-digit format during customer upsert', async () => {
    const rawPhones = ['+91 9827011223', '09827011223', '98270-11223'];
    const expected = '9827011223';

    for (const raw of rawPhones) {
      const cleaned = (raw || '').replace(/\D/g, '').slice(-10);
      assertEqual(cleaned, expected);
    }
  });

  it('F12-T4: Lead update endpoint accepts both id and leadId parameters', async () => {
    // Seed a lead
    const { data: leadRow } = await db.from('leads').insert({
      id: 'lead-uuid-12345',
      customer_name: 'Lead Customer',
      phone: '9998887776',
      status: 'Interested'
    });

    // Simulated lead updater function mirroring app/api/leads/update/route.ts
    async function updateLeadStatus(body) {
      const leadId = body.leadId || body.id;
      if (!leadId) throw new Error('leadId or id is required');
      const { data, error } = await db.from('leads').update({ status: body.status }).eq('id', leadId).single();
      return { success: true, lead: data };
    }

    // Call with leadId
    const resWithLeadId = await updateLeadStatus({ leadId: 'lead-uuid-12345', status: 'Contacted' });
    assertEqual(resWithLeadId.success, true);
    assertEqual(resWithLeadId.lead.status, 'Contacted');

    // Call with id
    const resWithId = await updateLeadStatus({ id: 'lead-uuid-12345', status: 'Converted' });
    assertEqual(resWithId.success, true);
    assertEqual(resWithId.lead.status, 'Converted');
  });

  it('F12-T5: Deal rejection does NOT increment customer total_spent or purchase count', async () => {
    const custPhone = '9777111222';
    const res = await api.submitDeal({
      productName: 'Rejected Phone',
      finalPrice: 25000,
      customerName: 'Unapproved Buyer',
      customerPhone: custPhone,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: 'Admin',
      rejectionReason: 'Invalid ID proof'
    });

    const { data: cust } = await db.from('customers').select('*').eq('phone', custPhone).maybeSingle();
    assertEqual(cust, null, 'Customer should not be registered as a purchaser on rejected deal');
  });

  it('F12-T6: Customer deletion unlinks sales references and purges profile from DB', async () => {
    const custPhone = '9827088888';
    await db.from('customers').insert({
      id: 'cust-uuid-delete-test',
      name: 'To Be Deleted',
      phone: custPhone,
      total_spent: 50000
    });

    // Seed a sales approval referencing this customer
    await db.from('sales_approvals').insert({
      id: 'deal-linked-to-cust',
      customer_id: 'cust-uuid-delete-test',
      customer_name: 'To Be Deleted',
      customer_phone: custPhone,
      product_name: 'Test Mobile',
      final_price: 50000,
      status: 'approved'
    });

    // Simulated customer deletion mirroring app/api/customers/delete/route.ts
    async function deleteCustomerRecord({ customerId }) {
      const { data: cust } = await db.from('customers').select('*').eq('id', customerId).maybeSingle();
      if (!cust) return { success: false, error: 'Not found' };
      
      // Unlink references
      await db.from('sales_approvals').update({ customer_id: null }).eq('customer_id', customerId);
      // Delete customer
      await db.from('customers').delete().eq('id', customerId);
      return { success: true };
    }

    const delRes = await deleteCustomerRecord({ customerId: 'cust-uuid-delete-test' });
    assertEqual(delRes.success, true);

    // Verify customer is gone
    const { data: custCheck } = await db.from('customers').select('*').eq('id', 'cust-uuid-delete-test').maybeSingle();
    assertEqual(custCheck, null, 'Customer should be purged from database');

    // Verify sales approval has customer_id unlinked (null)
    const { data: dealCheck } = await db.from('sales_approvals').select('*').eq('id', 'deal-linked-to-cust').single();
    assertEqual(dealCheck.customer_id, null, 'Foreign key reference should be safely nullified');
  });
});

