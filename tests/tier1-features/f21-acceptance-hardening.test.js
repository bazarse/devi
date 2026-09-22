/**
 * Tier 1 - Feature 21: Final Acceptance & Adversarial Hardening
 * Verifies complete end-to-end deal lifecycle transitions, edge resilience,
 * and multi-stage transaction consistency.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 21: Final Acceptance & Adversarial Hardening', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F21-T1: Complete End-to-End Approval Cycle: Submission -> Pending -> Approval -> Stock deduction -> Customer spend', async () => {
    const imei = FIXTURES.IMEIS.IN_STOCK_1;
    const price = 34999;
    const phone = '9827011223';

    // 1. Submit
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: price,
      imeiSerial: imei,
      customerName: 'Rajesh Gupta',
      customerPhone: phone,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });
    assertEqual(sub.status, 'pending_approval');

    // 2. Approve
    const action = await api.performDealAction({
      dealId: sub.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });
    assertEqual(action.status, 'approved');

    // 3. Stock verified sold
    const { data: stock } = await db.from('imei_stock').select('*').eq('imei1', imei).single();
    assertEqual(stock.status, 'sold');

    // 4. Customer spend verified
    const { data: cust } = await db.from('customers').select('*').eq('phone', phone).single();
    assertEqual(cust.total_spent, price);

    // 5. Notification verified
    const notif = api.notificationsSent.find(n => n.dealId === sub.dealId && n.type === 'deal_approved');
    assertEqual(notif.targetPhone, FIXTURES.STAFF.SALESMAN_1.phone);
  });

  it('F21-T2: Complete End-to-End Rejection Cycle: Submission -> Pending -> Rejection -> Stock preserved -> Notification with reason', async () => {
    const imei = FIXTURES.IMEIS.IN_STOCK_2;
    const reason = 'Finance verification failed by Bajaj Desk';

    // 1. Submit
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: 39999,
      imeiSerial: imei,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_2.phone,
      storeId: 'DM-02'
    });

    // 2. Reject
    const action = await api.performDealAction({
      dealId: sub.dealId,
      action: 'reject',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      rejectionReason: reason
    });
    assertEqual(action.status, 'rejected');

    // 3. Stock remains in_stock
    const { data: stock } = await db.from('imei_stock').select('*').eq('imei1', imei).single();
    assertEqual(stock.status, 'in_stock');

    // 4. Rejection notification contains reason
    const notif = api.notificationsSent.find(n => n.dealId === sub.dealId && n.type === 'deal_rejected');
    assertEqual(notif.targetPhone, FIXTURES.STAFF.SALESMAN_2.phone);
    assert(notif.body.includes(reason));
  });

  it('F21-T3: Complete End-to-End Edit & Approve Cycle: Submission -> Pending -> Price & IMEI Adjusted -> Approval', async () => {
    const originalImei = FIXTURES.IMEIS.IN_STOCK_3;
    const replacementImei = FIXTURES.IMEIS.IN_STOCK_4;

    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: 41999,
      imeiSerial: originalImei,
      storeId: 'DM-01'
    });

    // Manager gives Rs 2000 discount and swaps IMEI
    const editRes = await api.performDealAction({
      dealId: sub.dealId,
      action: 'edit',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      edits: {
        finalPrice: 39999,
        imeiSerial: replacementImei
      }
    });

    assertEqual(editRes.status, 'approved');
    const { data: updatedDeal } = await db.from('sales_approvals').select('*').eq('id', sub.dealId).single();
    assertEqual(updatedDeal.final_price, 39999);
    assertEqual(updatedDeal.imei_serial, replacementImei);

    // Replacement IMEI sold, original remains in_stock
    const { data: repStock } = await db.from('imei_stock').select('*').eq('imei1', replacementImei).single();
    assertEqual(repStock.status, 'sold');

    const { data: origStock } = await db.from('imei_stock').select('*').eq('imei1', originalImei).single();
    assertEqual(origStock.status, 'in_stock');
  });

  it('F21-T4: Complete End-to-End Exchange Cycle: Trade-in submission -> Approval -> device_exchanges populated', async () => {
    const val = 12000;
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      hasExchange: true,
      oldDeviceName: 'OnePlus Nord 2',
      exchangeValue: val,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: sub.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const { data: exRow } = await db.from('device_exchanges').select('*').eq('sale_approval_id', sub.dealId).single();
    assertEqual(exRow.valuation_amount, val);
    assertEqual(exRow.resale_price, Math.round(val * 1.25));
    assertEqual(exRow.status, 'in_stock');
  });

  it('F21-T5: Post-Approval Invoicing & Tally Pipeline: Approved Deal -> Tax Invoice -> Tally Sync', async () => {
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      barcode: 'SCAN-VIVO-V40-89012',
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: sub.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    // 1. Generate tax invoice calculations
    const inv = api.calculateGstInvoice({ rateInclTax: 34999 });
    assertEqual(inv.isBalanced, true);

    // 2. Mark Tally uploaded
    const tally = await api.toggleTallySync({
      dealId: sub.dealId,
      isUploaded: true,
      userName: 'Accounts Desk'
    });
    assertEqual(tally.isUploaded, true);
    assertEqual(tally.preservedBarcode, 'SCAN-VIVO-V40-89012');
  });
});
