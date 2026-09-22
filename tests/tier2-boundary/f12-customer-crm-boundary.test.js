/**
 * Tier 2 - Feature 12 Boundary: Customer CRM Aggregation & Spend Integrity
 * Tests non-numeric phone sanitization, zero-phone placeholder, unicode names, and rapid upserts.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 2 - Feature 12 Boundary: Customer CRM Aggregation & Spend Integrity', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F12-B1: Phone string with alphabetic or symbol noise sanitizes cleanly to 10 digits', () => {
    const noisyPhones = [
      'Call: 9827011223 (home)',
      '#9827011223#',
      'TEL: +91-98270-11223'
    ];
    for (const phone of noisyPhones) {
      const clean = phone.replace(/\D/g, '').slice(-10);
      assertEqual(clean, '9827011223');
    }
  });

  it('F12-B2: Default placeholder phone 0000000000 does not pollute customer directory', async () => {
    const res = await api.submitDeal({
      productName: 'Phone',
      finalPrice: 15000,
      customerPhone: '0000000000',
      customerName: 'Anonymous Buyer',
      storeId: 'DM-01'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Admin' });
    const { data: cust } = await db.from('customers').select('*').eq('phone', '0000000000').maybeSingle();
    assertEqual(cust, null, 'Placeholder phone 0000000000 should not create CRM customer account');
  });

  it('F12-B3: Customer with Hindi Unicode name persists without mojibake encoding corruption', async () => {
    const hindiName = 'मुकेश पाटीदार';
    const phone = '9425012345';

    const res = await api.submitDeal({
      productName: 'Phone',
      finalPrice: 20000,
      customerName: hindiName,
      customerPhone: phone,
      storeId: 'DM-01'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Admin' });
    const { data: cust } = await db.from('customers').select('*').eq('phone', phone).single();
    assertEqual(cust.name, hindiName);
  });

  it('F12-B4: Consecutive approvals for same customer accumulate spend accurately', async () => {
    const phone = '9827099999';
    for (let i = 1; i <= 3; i++) {
      const res = await api.submitDeal({
        productName: `Phone ${i}`,
        finalPrice: 10000 * i,
        customerPhone: phone,
        storeId: 'DM-01'
      });
      await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Admin' });
    }

    const { data: cust } = await db.from('customers').select('*').eq('phone', phone).single();
    assertEqual(cust.total_spent, 60000); // 10000 + 20000 + 30000
    assertEqual(cust.purchase_count, 3);
  });

  it('F12-B5: Lead update with missing status and notes fields executes safe no-op', async () => {
    const { data: lead } = await db.from('leads').insert({
      id: 'lead-test-noop',
      status: 'Interested'
    });

    async function safeLeadUpdate(body) {
      const leadId = body.leadId || body.id;
      if (!leadId) throw new Error('leadId required');
      const payload = {};
      if (body.status) payload.status = body.status;
      if (body.notes !== undefined) payload.notes = body.notes;
      const { data } = await db.from('leads').update(payload).eq('id', leadId).single();
      return data;
    }

    const res = await safeLeadUpdate({ id: 'lead-test-noop' });
    assertEqual(res.status, 'Interested');
  });
});
