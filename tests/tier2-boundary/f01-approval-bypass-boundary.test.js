/**
 * Tier 2 - Feature 1 Boundary: Approval Bypass Prevention
 * Tests extreme inputs, case permutations, nulls, and injection payloads for status enforcement.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 2 - Feature 1 Boundary: Approval Bypass Prevention', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F1-B1: Empty string status="" is safely forced to pending_approval', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      status: '',
      storeId: 'DM-01'
    });
    assertEqual(res.status, 'pending_approval');
    assertEqual(res.deal.status, 'pending_approval');
  });

  it('F1-B2: Uppercase status="APPROVED" does not bypass approval queue', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: 39999,
      status: 'APPROVED',
      decidedBy: 'Super Admin',
      storeId: 'DM-01'
    });
    assertEqual(res.status, 'pending_approval');
    assertEqual(res.deal.status, 'pending_approval');
  });

  it('F1-B3: SQL injection string in status does not bypass and forces pending_approval', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: 38999,
      status: "approved'; DROP TABLE sales_approvals;--",
      storeId: 'DM-01'
    });
    assertEqual(res.status, 'pending_approval');
    assertEqual(res.deal.status, 'pending_approval');
  });

  it('F1-B4: Status with trailing whitespace "approved  " is forced to pending_approval', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.BOAT_EARBUDS.name,
      finalPrice: 1299,
      status: 'approved  ',
      storeId: 'DM-01'
    });
    assertEqual(res.status, 'pending_approval');
  });

  it('F1-B5: Zero price promotional deal submits as pending_approval without error', async () => {
    const res = await api.submitDeal({
      productName: 'Free Promo Earphones',
      finalPrice: 0,
      paymentMethod: 'Cash',
      storeId: 'DM-01'
    });
    assertEqual(res.status, 'pending_approval');
    assertEqual(res.deal.final_price, 0);
  });
});
