/**
 * Tier 2 - Feature 4 Boundary: Stock & IMEI Auto-Deduction
 * Tests IMEI string trimming, unknown IMEIs, zero stock accessories, and case insensitivity.
 */

const { describe, it, assert, assertEqual, assertThrowsAsync } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 2 - Feature 4 Boundary: Stock & IMEI Auto-Deduction', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F4-B1: IMEI with leading and trailing whitespace is trimmed cleanly before marking sold', async () => {
    const rawImei = '  862045051234561  ';
    const cleanImei = rawImei.trim();

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      imeiSerial: rawImei,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: 'Manager'
    });

    const { data: stockRow } = await db.from('imei_stock').select('*').eq('imei1', cleanImei).single();
    assertEqual(stockRow.status, 'sold');
    assertEqual(stockRow.sold_invoice_id, res.dealId);
  });

  it('F4-B2: Approving an item with IMEI not present in imei_stock proceeds without crash', async () => {
    const nonExistentImei = '869999999999999';

    const res = await api.submitDeal({
      productName: 'Special Import Phone',
      finalPrice: 55000,
      imeiSerial: nonExistentImei,
      storeId: 'DM-01'
    });

    const actionRes = await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: 'Manager'
    });

    assertEqual(actionRes.success, true);
    assertEqual(actionRes.status, 'approved');
  });

  it('F4-B3: Non-serialized accessory with 0 stock in inventory does not deduct below 0', async () => {
    const storeUuid = FIXTURES.STORES.DM01.id;
    // Set accessory quantity to 0
    await db.from('store_inventory').update({ quantity: 0 }).eq('store_id', storeUuid).eq('product_name', FIXTURES.PRODUCTS.BOAT_EARBUDS.name);

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.BOAT_EARBUDS.name,
      category: 'Accessories',
      finalPrice: 1299,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: 'Manager'
    });

    const { data: inv } = await db.from('store_inventory').select('*').eq('store_id', storeUuid).eq('product_name', FIXTURES.PRODUCTS.BOAT_EARBUDS.name).single();
    assertEqual(inv.quantity, 0, 'Inventory quantity must not drop below 0');
  });

  it('F4-B4: Case variations of dummy IMEI ("None", "N/A", "na") are skipped during deduction', async () => {
    const variations = ['None', 'n/a', 'NA', 'none'];

    for (const val of variations) {
      const res = await api.submitDeal({
        productName: 'Cable',
        finalPrice: 199,
        imeiSerial: val,
        storeId: 'DM-01'
      });

      const act = await api.performDealAction({
        dealId: res.dealId,
        action: 'approve',
        decidedBy: 'Manager'
      });

      assertEqual(act.status, 'approved');
    }
  });

  it('F4-B5: Re-approving an already approved deal with same sold_invoice_id does not throw double-sell', async () => {
    const imei = FIXTURES.IMEIS.IN_STOCK_1;

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      imeiSerial: imei,
      storeId: 'DM-01'
    });

    // First approval
    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: 'Manager'
    });

    // Idempotent re-approval by same deal
    const reApprove = await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: 'Manager'
    });

    assertEqual(reApprove.status, 'approved');
  });
});
