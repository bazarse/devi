/**
 * Tier 1 - Feature 1: Approval Bypass Prevention
 * Verifies that deals submitted at the POS counter strictly enter 'pending_approval' queue
 * and clients cannot bypass the approval workflow.
 */

const { describe, it, assert, assertEqual, assertNotEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 1: Approval Bypass Prevention', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F1-T1: Default deal submission sets status strictly to pending_approval', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      paymentMethod: 'Cash',
      salesPersonName: FIXTURES.STAFF.SALESMAN_1.name,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });

    assertEqual(res.success, true);
    assertEqual(res.status, 'pending_approval');
    assertEqual(res.deal.status, 'pending_approval');
    assertEqual(res.deal.approved_at, null);
    assertEqual(res.deal.approved_by_name, null);
  });

  it('F1-T2: Client attempt to submit with status="approved" is ignored and forced to pending_approval', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: FIXTURES.PRODUCTS.ONEPLUS_12R.sellingPrice,
      paymentMethod: 'Cash',
      status: 'approved', // Malicious attempt to bypass approval
      decidedBy: 'Hacker',
      storeId: 'DM-01'
    });

    assertEqual(res.success, true);
    assertEqual(res.status, 'pending_approval');
    assertEqual(res.deal.status, 'pending_approval');
    assertEqual(res.deal.approved_at, null);
    assertEqual(res.deal.approved_by_name, null);
  });

  it('F1-T3: Client attempt to submit with status="rejected" is forced to pending_approval', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: FIXTURES.PRODUCTS.SAMSUNG_A55.sellingPrice,
      paymentMethod: 'Cash',
      status: 'rejected',
      rejectionReason: 'Self-rejecting attempt',
      storeId: 'DM-02'
    });

    assertEqual(res.success, true);
    assertEqual(res.status, 'pending_approval');
    assertEqual(res.deal.status, 'pending_approval');
  });

  it('F1-T4: Deal submission generates a valid SA-XXXX token and persists in database', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.BOAT_EARBUDS.name,
      finalPrice: FIXTURES.PRODUCTS.BOAT_EARBUDS.sellingPrice,
      paymentMethod: 'Cash',
      storeId: 'DM-01'
    });

    assert(res.token.startsWith('SA-'), `Token ${res.token} should start with SA-`);
    const { data: inDb } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(inDb.status, 'pending_approval');
    assertEqual(inDb.token, res.token);
  });

  it('F1-T5: Deal submission notifies managers and does not deduct stock prematurely', async () => {
    const imei = FIXTURES.IMEIS.IN_STOCK_1;
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      imeiSerial: imei,
      storeId: 'DM-01'
    });

    // Check stock was NOT deducted during submission
    const { data: stockRow } = await db.from('imei_stock').select('*').eq('imei1', imei).single();
    assertEqual(stockRow.status, 'in_stock');
    assertEqual(stockRow.sold_invoice_id, null);

    // Notification alert queued for admin
    const adminAlert = api.notificationsSent.find(n => n.type === 'deal_alert_to_admin' && n.dealId === res.dealId);
    assert(Boolean(adminAlert), 'Push alert should be queued for admin approval');
  });
});
