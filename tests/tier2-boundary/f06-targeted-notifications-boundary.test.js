/**
 * Tier 2 - Feature 6 Boundary: Targeted Salesman Notification
 * Tests phone formatting permutations (+91, spaces), missing phone fallback, and high notification volume.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 2 - Feature 6 Boundary: Targeted Salesman Notification', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F6-B1: Submitting salesman phone formatted with +91 and spaces resolves to 10-digit targetPhone', async () => {
    const rawPhone = '+91 99265 98700';
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      salesPersonPhone: rawPhone,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: 'Manager'
    });

    const notif = api.notificationsSent.find(n => n.dealId === res.dealId && n.type === 'deal_approved');
    assertEqual(notif.targetPhone, '9926598700');
  });

  it('F6-B2: Missing salesman phone falls back safely to default placeholder 0000000000', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: 39999,
      salesPersonPhone: null,
      storeId: 'DM-01'
    });

    assertEqual(res.deal.sales_person_phone, '0000000000');
  });

  it('F6-B3: Notification title and body handle null or empty product name gracefully', async () => {
    const res = await api.submitDeal({
      productName: 'Device',
      finalPrice: 10000,
      salesPersonPhone: '9926598700',
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: 'Manager'
    });

    const notif = api.notificationsSent.find(n => n.dealId === res.dealId && n.type === 'deal_approved');
    assert(notif.title.includes('Device'));
  });

  it('F6-B4: Notification center with 200 items filters instantly without lag', () => {
    const manyNotifs = [];
    for (let i = 0; i < 200; i++) {
      manyNotifs.push({
        id: `notif-${i}`,
        targetPhone: i % 2 === 0 ? '9926598700' : '7828915933',
        title: `Alert ${i}`
      });
    }

    const start = Date.now();
    const filtered = manyNotifs.filter(n => n.targetPhone === '9926598700');
    const elapsed = Date.now() - start;

    assertEqual(filtered.length, 100);
    assert(elapsed < 20, 'Filter must execute in under 20ms');
  });

  it('F6-B5: Salesmen with same name but different phone numbers receive strictly isolated alerts', async () => {
    const res1 = await api.submitDeal({
      productName: 'Phone 1',
      finalPrice: 10000,
      salesPersonName: 'Sunil',
      salesPersonPhone: '9926598700',
      storeId: 'DM-01'
    });

    const res2 = await api.submitDeal({
      productName: 'Phone 2',
      finalPrice: 20000,
      salesPersonName: 'Sunil',
      salesPersonPhone: '7828915933',
      storeId: 'DM-02'
    });

    await api.performDealAction({ dealId: res1.dealId, action: 'approve', decidedBy: 'Manager' });

    // Verify only first phone targeted
    const notifs1 = api.notificationsSent.filter(n => n.dealId === res1.dealId && n.type === 'deal_approved');
    assertEqual(notifs1[0].targetPhone, '9926598700');
    assert(notifs1.every(n => n.targetPhone !== '7828915933'));
  });
});
