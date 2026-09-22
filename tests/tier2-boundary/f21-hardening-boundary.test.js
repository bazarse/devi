/**
 * Tier 2 - Feature 21 Boundary: Final Acceptance & Adversarial Hardening
 * Tests SQL injection payloads, XSS HTML tags, extreme prices, and rapid status checks.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 2 - Feature 21 Boundary: Final Acceptance & Adversarial Hardening', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F21-B1: SQL injection payload in customer name is treated as literal text and does not disrupt database', async () => {
    const maliciousName = "Rajesh'; DROP TABLE customers; --";
    const res = await api.submitDeal({
      productName: 'Phone',
      finalPrice: 15000,
      customerName: maliciousName,
      customerPhone: '9827011223',
      storeId: 'DM-01'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Admin' });

    // Table customers still exists and record contains literal string
    const { data: cust } = await db.from('customers').select('*').eq('phone', '9827011223').single();
    assertEqual(cust.name, maliciousName);
  });

  it('F21-B2: XSS payload in customer address is preserved without executing or crashing backend', async () => {
    const xssAddress = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    const res = await api.submitDeal({
      productName: 'Phone',
      finalPrice: 20000,
      customerAddress: xssAddress,
      storeId: 'DM-01'
    });

    const { data: deal } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(deal.customer_address, xssAddress);
  });

  it('F21-B3: Extreme price boundary (Rs 99,99,99,999) processes without numeric overflow', async () => {
    const extremePrice = 999999999;
    const res = await api.submitDeal({
      productName: 'Enterprise Diamond Edition',
      finalPrice: extremePrice,
      storeId: 'DM-01'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Admin' });
    const { data: deal } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(deal.final_price, extremePrice);
  });

  it('F21-B4: Consecutive approvals of different deals on different IMEIs execute in sequence without collision', async () => {
    const deals = [];
    for (let i = 1; i <= 3; i++) {
      const sub = await api.submitDeal({
        productName: `Phone ${i}`,
        finalPrice: 10000 * i,
        imeiSerial: `86204505123456${i}`,
        storeId: 'DM-01'
      });
      deals.push(sub);
    }

    for (const d of deals) {
      const act = await api.performDealAction({ dealId: d.dealId, action: 'approve', decidedBy: 'Admin' });
      assertEqual(act.status, 'approved');
    }

    const { data: allDeals } = await db.from('sales_approvals').select('*');
    for (const d of deals) {
      const rec = allDeals.find(x => x.id === d.dealId);
      assertEqual(rec.status, 'approved');
    }
  });

  it('F21-B5: Zero price accessory gift is recorded with finalPrice 0 and approved cleanly', async () => {
    const res = await api.submitDeal({
      productName: 'Free Screen Guard Promo',
      finalPrice: 0,
      paymentMethod: 'Cash',
      storeId: 'DM-01'
    });

    const act = await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Admin' });
    assertEqual(act.status, 'approved');

    const { data: deal } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(deal.final_price, 0);
  });
});
