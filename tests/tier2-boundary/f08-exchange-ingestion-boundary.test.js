/**
 * Tier 2 - Feature 8 Boundary: Device Exchange Ingestion
 * Tests 0 valuation, auto-generated IMEI format, condition enum fallbacks, and store UUID mapping.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 2 - Feature 8 Boundary: Device Exchange Ingestion', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F8-B1: Zero valuation trade-in does not create phantom inventory if device name is also missing', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      hasExchange: false,
      exchangeValue: 0,
      oldDeviceName: null,
      storeId: 'DM-01'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Manager' });
    const { data: rows } = await db.from('device_exchanges').select('*').eq('sale_approval_id', res.dealId);
    assertEqual(rows.length, 0);
  });

  it('F8-B2: Exchange with missing oldDeviceImei auto-generates identifier starting with EX-', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: 39999,
      hasExchange: true,
      oldDeviceName: 'Redmi Note 9',
      oldDeviceImei: null, // missing IMEI
      exchangeValue: 4000,
      storeId: 'DM-01'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Manager' });
    const { data: item } = await db.from('device_exchanges').select('*').eq('sale_approval_id', res.dealId).single();
    assert(item.device_imei.startsWith('EX-'), `Generated IMEI ${item.device_imei} must start with EX-`);
  });

  it('F8-B3: Valuation rounding for non-divisible valuation (e.g. 3333 * 1.25 = 4166.25 -> 4166)', async () => {
    const valuation = 3333;
    const expected = Math.round(valuation * 1.25); // 4166

    const res = await api.submitDeal({
      productName: 'Phone',
      finalPrice: 20000,
      hasExchange: true,
      oldDeviceName: 'Oppo A15',
      exchangeValue: valuation,
      storeId: 'DM-01'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Manager' });
    const { data: item } = await db.from('device_exchanges').select('*').eq('sale_approval_id', res.dealId).single();
    assertEqual(item.resale_price, expected);
  });

  it('F8-B4: Invalid condition string falls back safely to "Good"', async () => {
    const res = await api.submitDeal({
      productName: 'Phone',
      finalPrice: 20000,
      hasExchange: true,
      oldDeviceName: 'Samsung M31',
      oldDeviceCondition: null, // null condition
      exchangeValue: 5000,
      storeId: 'DM-01'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Manager' });
    const { data: item } = await db.from('device_exchanges').select('*').eq('sale_approval_id', res.dealId).single();
    assertEqual(item.device_condition, 'Good');
  });

  it('F8-B5: Store ID DM-02 correctly maps to secondary store UUID', async () => {
    const res = await api.submitDeal({
      productName: 'Phone',
      finalPrice: 20000,
      hasExchange: true,
      oldDeviceName: 'Realme 7',
      exchangeValue: 3500,
      storeId: 'DM-02'
    });

    await api.performDealAction({ dealId: res.dealId, action: 'approve', decidedBy: 'Manager' });
    const { data: item } = await db.from('device_exchanges').select('*').eq('sale_approval_id', res.dealId).single();
    assertEqual(item.store_id, FIXTURES.STORES.DM02.id);
  });
});
