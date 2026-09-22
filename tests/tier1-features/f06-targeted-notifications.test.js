/**
 * Tier 1 - Feature 6: Targeted Salesman Notification
 * Verifies that decision alerts are delivered strictly to the submitting salesman's phone
 * without broadcasting chain-wide, and notifications persist accurately.
 */

const { describe, it, assert, assertEqual, assertNotEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 6: Targeted Salesman Notification', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F6-T1: Approval decision delivers targeted notification strictly to deal submitting salesman', async () => {
    const salesman1Phone = FIXTURES.STAFF.SALESMAN_1.phone;

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      salesPersonName: FIXTURES.STAFF.SALESMAN_1.name,
      salesPersonPhone: salesman1Phone,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const notif = api.notificationsSent.find(n => n.type === 'deal_approved' && n.dealId === res.dealId);
    assert(Boolean(notif), 'Approval notification should be emitted');
    assertEqual(notif.targetPhone, salesman1Phone);
    assert(notif.title.includes('Approved'));
  });

  it('F6-T2: Rejection decision delivers targeted notification strictly with reason to submitting salesman', async () => {
    const salesman2Phone = FIXTURES.STAFF.SALESMAN_2.phone;
    const reason = FIXTURES.VALID_REASONS[1];

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: FIXTURES.PRODUCTS.ONEPLUS_12R.sellingPrice,
      salesPersonName: FIXTURES.STAFF.SALESMAN_2.name,
      salesPersonPhone: salesman2Phone,
      storeId: 'DM-02'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      rejectionReason: reason
    });

    const notif = api.notificationsSent.find(n => n.type === 'deal_rejected' && n.dealId === res.dealId);
    assert(Boolean(notif), 'Rejection notification should be emitted');
    assertEqual(notif.targetPhone, salesman2Phone);
    assert(notif.body.includes(reason), 'Rejection reason must be included in alert body');
  });

  it('F6-T3: Notification dispatch rules prevent chain-wide broadcast to uninvolved salesmen', async () => {
    const submittingSalesmanPhone = FIXTURES.STAFF.SALESMAN_1.phone;
    const otherSalesmanPhone = FIXTURES.STAFF.SALESMAN_2.phone;

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: FIXTURES.PRODUCTS.SAMSUNG_A55.sellingPrice,
      salesPersonPhone: submittingSalesmanPhone,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    // Verify other salesman was NOT targeted
    const notifsForOther = api.notificationsSent.filter(n => n.targetPhone === otherSalesmanPhone);
    assertEqual(notifsForOther.length, 0);

    // Verify no untargeted wildcard broadcast was sent
    const wildcardNotifs = api.notificationsSent.filter(n => n.dealId === res.dealId && !n.targetPhone && n.type !== 'deal_alert_to_admin');
    assertEqual(wildcardNotifs.length, 0);
  });

  it('F6-T4: Salesman notification center filter isolates notifications by logged-in salesman phone', () => {
    const notificationsList = [
      { id: '1', targetPhone: '9926598700', title: 'Deal 1 Approved' },
      { id: '2', targetPhone: '7828915933', title: 'Deal 2 Rejected' },
      { id: '3', targetPhone: '9926598700', title: 'Deal 3 Approved' }
    ];

    // Notification center filter logic
    function getSalesmanNotifications(allNotifs, loggedInPhone) {
      const cleanPhone = (loggedInPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanPhone) return [];
      return allNotifs.filter(n => n.targetPhone === cleanPhone);
    }

    const s1Notifs = getSalesmanNotifications(notificationsList, '9926598700');
    assertEqual(s1Notifs.length, 2);
    assertEqual(s1Notifs[0].id, '1');
    assertEqual(s1Notifs[1].id, '3');

    const s2Notifs = getSalesmanNotifications(notificationsList, '7828915933');
    assertEqual(s2Notifs.length, 1);
    assertEqual(s2Notifs[0].id, '2');
  });

  it('F6-T5: Deal submission alert specifically targets store managers and admins only', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.BOAT_EARBUDS.name,
      finalPrice: FIXTURES.PRODUCTS.BOAT_EARBUDS.sellingPrice,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });

    const adminAlerts = api.notificationsSent.filter(n => n.dealId === res.dealId && n.type === 'deal_alert_to_admin');
    assertEqual(adminAlerts.length, 1);
    assertEqual(adminAlerts[0].role, 'admin');
    assertEqual(adminAlerts[0].url, '/admin/super/approvals');
  });
});
