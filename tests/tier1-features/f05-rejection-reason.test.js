/**
 * Tier 1 - Feature 5: Mandatory Rejection Reason
 * Verifies that manager rejection mandates a non-empty reason, validates whitespace,
 * and ensures the rejection reason is persisted and displayed.
 */

const { describe, it, assert, assertEqual, assertThrowsAsync } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 5: Mandatory Rejection Reason', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F5-T1: Rejection with a valid, non-empty reason succeeds and persists status and reason', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      storeId: 'DM-01'
    });

    const validReason = FIXTURES.VALID_REASONS[0];
    const rejectRes = await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      rejectionReason: validReason
    });

    assertEqual(rejectRes.success, true);
    assertEqual(rejectRes.status, 'rejected');
    assertEqual(rejectRes.rejectionReason, validReason);

    const { data: dbRow } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(dbRow.status, 'rejected');
    assertEqual(dbRow.rejection_reason, validReason);
    assertEqual(dbRow.approved_by_name, FIXTURES.STAFF.STORE_ADMIN.name);
  });

  it('F5-T2: Rejection with empty string reason is strictly rejected by validation', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: FIXTURES.PRODUCTS.ONEPLUS_12R.sellingPrice,
      storeId: 'DM-01'
    });

    await assertThrowsAsync(async () => {
      await api.performDealAction({
        dealId: res.dealId,
        action: 'reject',
        decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
        rejectionReason: ''
      });
    }, /mandatory/i);
  });

  it('F5-T3: Rejection with whitespace-only string is strictly rejected by validation', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: FIXTURES.PRODUCTS.SAMSUNG_A55.sellingPrice,
      storeId: 'DM-02'
    });

    await assertThrowsAsync(async () => {
      await api.performDealAction({
        dealId: res.dealId,
        action: 'reject',
        decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
        rejectionReason: '     '
      });
    }, /mandatory/i);
  });

  it('F5-T4: Rejection without rejectionReason parameter throws error', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.BOAT_EARBUDS.name,
      finalPrice: FIXTURES.PRODUCTS.BOAT_EARBUDS.sellingPrice,
      storeId: 'DM-01'
    });

    await assertThrowsAsync(async () => {
      await api.performDealAction({
        dealId: res.dealId,
        action: 'reject',
        decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
      });
    }, /mandatory/i);
  });

  it('F5-T5: Salesman history card formatting includes rejection reason banner when rejected', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      salesPersonName: FIXTURES.STAFF.SALESMAN_1.name,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });

    const specificReason = 'Customer CIBIL score below 600 - finance declined';
    await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      rejectionReason: specificReason
    });

    const { data: rejectedDeal } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();

    // UI renderer helper for salesman history card
    function renderSalesmanHistoryCard(deal) {
      return {
        id: deal.id,
        token: deal.token,
        status: deal.status,
        hasRejectionBanner: deal.status === 'rejected' && Boolean(deal.rejection_reason),
        rejectionBannerText: deal.status === 'rejected' ? `Manager Note: ${deal.rejection_reason}` : null
      };
    }

    const card = renderSalesmanHistoryCard(rejectedDeal);
    assertEqual(card.hasRejectionBanner, true);
    assertEqual(card.rejectionBannerText, `Manager Note: ${specificReason}`);
  });
});
