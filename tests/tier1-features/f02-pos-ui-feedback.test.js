/**
 * Tier 1 - Feature 2: POS Counter UI Feedback Alignment
 * Verifies that counter billing feedback accurately displays pending approval status
 * rather than falsely claiming auto-approved or premature stock deduction.
 */

const { describe, it, assert, assertEqual, assertTruthy, assertFalsy } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 2: POS Counter UI Feedback Alignment', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  // UI state feedback resolver helper mirroring corrected POS desk behavior
  function resolvePosFeedbackState(userRole, dealStatus) {
    const isApproved = dealStatus === 'approved';
    const isPending = dealStatus === 'pending_approval';

    return {
      bannerText: isApproved 
        ? '🎉 Sale Billed & Approved!' 
        : 'Sale Submitted For Manager Approval!',
      badgeColor: isPending ? 'yellow' : isApproved ? 'green' : 'red',
      canPrintTaxBill: isApproved,
      stockDeductedMessage: isApproved 
        ? 'Stock has been deducted from inventory' 
        : 'Stock will be deducted upon manager approval',
      requiresManagerAction: isPending
    };
  }

  it('F2-T1: Store Admin counter billing renders pending approval state and not auto-approved', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      paymentMethod: 'Cash',
      salesPersonName: FIXTURES.STAFF.STORE_ADMIN.name,
      storeId: 'DM-01'
    });

    const feedback = resolvePosFeedbackState('store_admin', res.status);
    assertEqual(feedback.bannerText, 'Sale Submitted For Manager Approval!');
    assertEqual(feedback.requiresManagerAction, true);
    assertFalsy(feedback.canPrintTaxBill);
  });

  it('F2-T2: Super Admin counter billing renders pending approval state', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: FIXTURES.PRODUCTS.ONEPLUS_12R.sellingPrice,
      paymentMethod: 'Cash',
      salesPersonName: FIXTURES.STAFF.SUPER_ADMIN.name,
      storeId: 'DM-01'
    });

    const feedback = resolvePosFeedbackState('super_admin', res.status);
    assertEqual(feedback.bannerText, 'Sale Submitted For Manager Approval!');
    assertEqual(feedback.canPrintTaxBill, false);
  });

  it('F2-T3: Salesman counter billing renders pending badge with yellow status', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: FIXTURES.PRODUCTS.SAMSUNG_A55.sellingPrice,
      paymentMethod: 'Cash',
      salesPersonName: FIXTURES.STAFF.SALESMAN_1.name,
      storeId: 'DM-01'
    });

    const feedback = resolvePosFeedbackState('salesman', res.status);
    assertEqual(feedback.badgeColor, 'yellow');
    assertEqual(feedback.stockDeductedMessage, 'Stock will be deducted upon manager approval');
  });

  it('F2-T4: Official GST Tax Bill button is locked until deal transition to approved', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.BOAT_EARBUDS.name,
      finalPrice: FIXTURES.PRODUCTS.BOAT_EARBUDS.sellingPrice,
      paymentMethod: 'Cash',
      storeId: 'DM-01'
    });

    let feedback = resolvePosFeedbackState('salesman', res.status);
    assertEqual(feedback.canPrintTaxBill, false);

    // Approve the deal
    const approvedRes = await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    feedback = resolvePosFeedbackState('salesman', approvedRes.status);
    assertEqual(feedback.canPrintTaxBill, true);
    assertEqual(feedback.bannerText, '🎉 Sale Billed & Approved!');
    assertEqual(feedback.stockDeductedMessage, 'Stock has been deducted from inventory');
  });

  it('F2-T5: Pending deals queue renders real-time token and store code in POS desk tracking cards', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.CHARGER_65W.name,
      finalPrice: FIXTURES.PRODUCTS.CHARGER_65W.sellingPrice,
      storeId: 'DM-02'
    });

    assertEqual(res.deal.store_code, 'DM-02');
    assert(res.deal.token.startsWith('SA-'));
    assertEqual(res.deal.status, 'pending_approval');
  });
});
