/**
 * Tier 2 - Feature 10 Boundary: Tally ERP Sync Marker Persistence
 * Tests rapid on/off toggles, null user names, special barcode characters, and non-existent IDs.
 */

const { describe, it, assert, assertEqual, assertThrowsAsync } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 2 - Feature 10 Boundary: Tally ERP Sync Marker Persistence', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F10-B1: Rapid consecutive toggling on/off 5 times preserves original barcode perfectly', async () => {
    const originalBarcode = 'BARCODE-998877';
    const res = await api.submitDeal({ productName: 'Phone', finalPrice: 20000, barcode: originalBarcode, storeId: 'DM-01' });

    for (let i = 0; i < 5; i++) {
      await api.toggleTallySync({ dealId: res.dealId, isUploaded: i % 2 === 0, userName: 'Admin' });
    }

    const { data: deal } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(deal.barcode, originalBarcode, 'Barcode must never be modified during rapid toggling');
  });

  it('F10-B2: Null userName defaults safely to "Admin" in tally marker string', async () => {
    const res = await api.submitDeal({ productName: 'Phone', finalPrice: 15000, storeId: 'DM-01' });
    const tallyRes = await api.toggleTallySync({ dealId: res.dealId, isUploaded: true, userName: null });

    assert(tallyRes.deal.tally_marker.endsWith(':Admin'), 'Marker should end with :Admin when userName is null');
  });

  it('F10-B3: Product barcode containing symbols and slashes is preserved intact', async () => {
    const complexBarcode = 'SCAN/2026-A#459$DEVI';
    const res = await api.submitDeal({ productName: 'Phone', finalPrice: 18000, barcode: complexBarcode, storeId: 'DM-01' });

    const tallyRes = await api.toggleTallySync({ dealId: res.dealId, isUploaded: true });
    assertEqual(tallyRes.preservedBarcode, complexBarcode);

    const { data: deal } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(deal.barcode, complexBarcode);
  });

  it('F10-B4: Non-existent dealId throws clean error rather than unhandled exception', async () => {
    await assertThrowsAsync(async () => {
      await api.toggleTallySync({ dealId: 'non-existent-deal-id', isUploaded: true });
    }, /not found/i);
  });

  it('F10-B5: Null or empty dealId throws validation error', async () => {
    await assertThrowsAsync(async () => {
      await api.toggleTallySync({ dealId: '', isUploaded: true });
    }, /required/i);
  });
});
