/**
 * Tier 1 - Feature 8: Device Exchange Ingestion
 * Verifies that customer trade-in devices are ingested into device_exchanges table
 * upon deal approval with valid store UUID and accurate 1.25x resale valuation.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 8: Device Exchange Ingestion', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F8-T1: Deal with device exchange auto-ingests record into device_exchanges table upon approval', async () => {
    const valuation = 8000;
    const oldPhoneName = 'OnePlus 8T';
    const oldImei = '862045051299999';

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      hasExchange: true,
      oldDeviceName: oldPhoneName,
      oldDeviceImei: oldImei,
      oldDeviceCondition: 'Good',
      exchangeValue: valuation,
      customerName: FIXTURES.CUSTOMERS.VIP_RAJESH.name,
      customerPhone: FIXTURES.CUSTOMERS.VIP_RAJESH.phone,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const { data: exchangeRows } = await db.from('device_exchanges')
      .select('*')
      .eq('sale_approval_id', res.dealId);

    assertEqual(exchangeRows.length, 1);
    const item = exchangeRows[0];
    assertEqual(item.device_name, oldPhoneName);
    assertEqual(item.device_imei, oldImei);
    assertEqual(item.valuation_amount, valuation);
    assertEqual(item.status, 'in_stock');
    assertEqual(item.received_from_customer, FIXTURES.CUSTOMERS.VIP_RAJESH.name);
  });

  it('F8-T2: Ingestion automatically calculates resale_price as 1.25x of valuation_amount rounded', async () => {
    const valuation = 10500;
    const expectedResale = Math.round(valuation * 1.25); // 13125

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: 39999,
      hasExchange: true,
      oldDeviceName: 'iPhone 11 64GB',
      oldDeviceCondition: 'Fair',
      exchangeValue: valuation,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const { data: item } = await db.from('device_exchanges')
      .select('*')
      .eq('sale_approval_id', res.dealId)
      .single();

    assertEqual(item.resale_price, expectedResale);
  });

  it('F8-T3: Ingestion resolves valid store UUID rather than store code string', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: 38999,
      hasExchange: true,
      oldDeviceName: 'Samsung Galaxy A51',
      exchangeValue: 6000,
      storeId: 'DM-02'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const { data: item } = await db.from('device_exchanges')
      .select('*')
      .eq('sale_approval_id', res.dealId)
      .single();

    // Store ID must be valid UUID
    assertEqual(item.store_id, FIXTURES.STORES.DM02.id);
  });

  it('F8-T4: Deal rejection prevents ingestion into device_exchanges table', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      hasExchange: true,
      oldDeviceName: 'Poco X3',
      exchangeValue: 4000,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      rejectionReason: 'Exchange device has water damage'
    });

    const { data: exchangeRows } = await db.from('device_exchanges')
      .select('*')
      .eq('sale_approval_id', res.dealId);

    assertEqual(exchangeRows.length, 0);
  });

  it('F8-T5: Deals without device exchange do not create any device_exchanges records', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.BOAT_EARBUDS.name,
      finalPrice: FIXTURES.PRODUCTS.BOAT_EARBUDS.sellingPrice,
      hasExchange: false,
      storeId: 'DM-01'
    });

    await api.performDealAction({
      dealId: res.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    const { data: exchangeRows } = await db.from('device_exchanges')
      .select('*')
      .eq('sale_approval_id', res.dealId);

    assertEqual(exchangeRows.length, 0);
  });
});
