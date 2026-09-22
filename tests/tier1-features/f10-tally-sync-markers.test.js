/**
 * Tier 1 - Feature 10: Tally ERP Sync Marker Persistence
 * Verifies that Tally sync markers write cleanly without UUID errors,
 * preserve product barcode data, and maintain checkbox state across page reloads.
 */

const { describe, it, assert, assertEqual, assertNotEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 10: Tally ERP Sync Marker Persistence', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F10-T1: Marking deal as Tally uploaded sets isUploaded true without UUID/type errors', async () => {
    const productBarcode = '8901234567890';
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      barcode: productBarcode,
      storeId: 'DM-01'
    });

    const tallyRes = await api.toggleTallySync({
      dealId: res.dealId,
      isUploaded: true,
      userName: FIXTURES.STAFF.STORE_ADMIN.name
    });

    assertEqual(tallyRes.success, true);
    assertEqual(tallyRes.isUploaded, true);
    assertEqual(tallyRes.deal.is_tally_uploaded, true);
    assert(Boolean(tallyRes.deal.tally_marker));
    assert(tallyRes.deal.tally_marker.startsWith('TALLY_UPLOADED:'));
  });

  it('F10-T2: Tally toggle strictly preserves product barcode and does NOT overwrite it', async () => {
    const originalBarcode = 'SCAN-VIVO-V40-BLK';
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: FIXTURES.PRODUCTS.VIVO_V40.sellingPrice,
      barcode: originalBarcode,
      storeId: 'DM-01'
    });

    await api.toggleTallySync({
      dealId: res.dealId,
      isUploaded: true,
      userName: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const { data: inDb } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(inDb.barcode, originalBarcode, 'Product barcode must not be overwritten by tally marker');
  });

  it('F10-T3: Toggling Tally off sets is_tally_uploaded false while keeping barcode intact', async () => {
    const originalBarcode = 'SCAN-OP12R-BLU';
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: FIXTURES.PRODUCTS.ONEPLUS_12R.sellingPrice,
      barcode: originalBarcode,
      storeId: 'DM-01'
    });

    // Turn ON
    await api.toggleTallySync({ dealId: res.dealId, isUploaded: true, userName: 'Admin' });
    // Turn OFF
    const offRes = await api.toggleTallySync({ dealId: res.dealId, isUploaded: false, userName: 'Admin' });

    assertEqual(offRes.isUploaded, false);
    const { data: inDb } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(inDb.is_tally_uploaded, false);
    assertEqual(inDb.barcode, originalBarcode, 'Product barcode must not be cleared when toggling tally off');
  });

  it('F10-T4: Bills management view state initialization accurately maps database is_tally_uploaded', async () => {
    const res1 = await api.submitDeal({ productName: 'Phone 1', finalPrice: 10000, storeId: 'DM-01' });
    const res2 = await api.submitDeal({ productName: 'Phone 2', finalPrice: 15000, storeId: 'DM-01' });

    await api.toggleTallySync({ dealId: res1.dealId, isUploaded: true, userName: 'Admin' });

    const { data: deals } = await db.from('sales_approvals').select('*');

    // UI bills management tally map initializer
    function initializeTallyMap(loadedDeals) {
      const map = {};
      for (const d of loadedDeals) {
        map[d.id] = {
          isUploaded: Boolean(d.is_tally_uploaded || (d.barcode && d.barcode.startsWith('TALLY_UPLOADED')) || d.tally_marker),
          uploadedAt: d.tally_uploaded_at
        };
      }
      return map;
    }

    const tallyMap = initializeTallyMap(deals);
    assertEqual(tallyMap[res1.dealId].isUploaded, true);
    assertEqual(tallyMap[res2.dealId].isUploaded, false);
  });

  it('F10-T5: Sequential batch Tally sync toggling handles multiple bills cleanly', async () => {
    const dealIds = [];
    for (let i = 1; i <= 3; i++) {
      const res = await api.submitDeal({
        productName: `Item ${i}`,
        finalPrice: 5000 * i,
        barcode: `BARCODE-00${i}`,
        storeId: 'DM-01'
      });
      dealIds.push(res.dealId);
    }

    for (const id of dealIds) {
      const res = await api.toggleTallySync({ dealId: id, isUploaded: true, userName: 'Tally Operator' });
      assertEqual(res.success, true);
    }

    const { data: allDeals } = await db.from('sales_approvals').select('*');
    for (const id of dealIds) {
      const d = allDeals.find(x => x.id === id);
      assertEqual(d.is_tally_uploaded, true);
      assert(d.barcode.startsWith('BARCODE-00'));
    }
  });
});
