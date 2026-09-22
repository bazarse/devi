/**
 * Tier 1 - Feature 4: Stock & IMEI Auto-Deduction
 * Verifies that stock auto-deducts upon deal approval, marks IMEI as sold with dealId,
 * prevents double-selling, and handles non-serialized inventory.
 */

const { describe, it, assert, assertEqual, assertThrowsAsync } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 4: Stock & IMEI Auto-Deduction', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F4-T1: Approving a deal with serialized phone marks IMEI as sold in imei_stock', async () => {
    const imei = FIXTURES.IMEIS.IN_STOCK_1;
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      imeiSerial: imei,
      storeId: 'DM-01'
    });

    const actionRes = await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    assertEqual(actionRes.success, true);
    assertEqual(actionRes.status, 'approved');

    const { data: stockRow } = await db.from('imei_stock').select('*').eq('imei1', imei).single();
    assertEqual(stockRow.status, 'sold');
    assertEqual(stockRow.sold_invoice_id, res.dealId);
    assert(stockRow.sold_at !== null, 'sold_at must be populated');
  });

  it('F4-T2: Approving an accessory deducts quantity in store_inventory table', async () => {
    const accessory = FIXTURES.PRODUCTS.BOAT_EARBUDS;
    const storeUuid = FIXTURES.STORES.DM01.id;

    // Check initial stock
    const { data: beforeInv } = await db.from('store_inventory')
      .select('*')
      .eq('store_id', storeUuid)
      .eq('product_name', accessory.name)
      .single();
    const initialQty = beforeInv.quantity;

    const res = await api.submitDeal({
      productName: accessory.name,
      category: 'Accessories',
      finalPrice: accessory.sellingPrice,
      imeiSerial: 'none',
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const { data: afterInv } = await db.from('store_inventory')
      .select('*')
      .eq('store_id', storeUuid)
      .eq('product_name', accessory.name)
      .single();
    assertEqual(afterInv.quantity, initialQty - 1);
  });

  it('F4-T3: Double-selling prevention: Attempting to approve an already sold IMEI throws error', async () => {
    const alreadySoldImei = FIXTURES.IMEIS.ALREADY_SOLD; // Pre-seeded as sold

    const res = await api.submitDeal({
      productName: 'Vivo V30 5G',
      finalPrice: 28000,
      imeiSerial: alreadySoldImei,
      storeId: 'DM-01'
    });

    await assertThrowsAsync(async () => {
      await api.performDealAction({
        dealId: res.dealId,
        action: 'approve',
        decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
      });
    }, /already sold/i);
  });

  it('F4-T4: Edit & Approve action allows manager to switch IMEI and marks new IMEI as sold', async () => {
    const imeiInitial = FIXTURES.IMEIS.IN_STOCK_2;
    const imeiReplacement = FIXTURES.IMEIS.IN_STOCK_3;

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: FIXTURES.PRODUCTS.ONEPLUS_12R.sellingPrice,
      imeiSerial: imeiInitial,
      storeId: 'DM-01'
    });

    // Manager edits and substitutes with imeiReplacement
    const editRes = await api.performDealAction({
      dealId: res.dealId,
      action: 'edit',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      edits: {
        imeiSerial: imeiReplacement
      }
    });

    assertEqual(editRes.success, true);
    // imeiReplacement is marked sold
    const { data: repStock } = await db.from('imei_stock').select('*').eq('imei1', imeiReplacement).single();
    assertEqual(repStock.status, 'sold');
    assertEqual(repStock.sold_invoice_id, res.dealId);

    // imeiInitial remains in_stock
    const { data: initStock } = await db.from('imei_stock').select('*').eq('imei1', imeiInitial).single();
    assertEqual(initStock.status, 'in_stock');
  });

  it('F4-T5: Dummy and short IMEIs (e.g. "n/a", "none") are safely skipped during stock deduction', async () => {
    const dummyImeis = ['none', 'na', 'N/A', 'NONE', '1234'];

    for (const dummy of dummyImeis) {
      const res = await api.submitDeal({
        productName: 'Tempered Glass',
        finalPrice: 299,
        imeiSerial: dummy,
        storeId: 'DM-01'
      });

      const actRes = await api.performDealAction({
        dealId: res.dealId,
        action: 'approve',
        decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
      });

      assertEqual(actRes.success, true);
      assertEqual(actRes.status, 'approved');
    }
  });
});
