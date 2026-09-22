/**
 * Tier 1 - Feature 3: Payment Mode Support (Cash, Split, EMI)
 * Verifies clean submission, calculation, and editing of Cash, Split, and EMI finance deals.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 3: Payment Mode Support (Cash, Split, EMI)', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  // POS desk payment validation validator
  function validatePaymentBreakdown(deal) {
    const finalPrice = Number(deal.finalPrice || deal.final_price || 0);
    const exchange = Number(deal.exchangeValue || deal.device_exchange_amount || 0);
    const mode = deal.paymentMethod || deal.payment_method;

    if (mode === 'Cash') {
      const cash = Number(deal.cashAmount || deal.cash_amount || 0);
      return Math.abs((cash + exchange) - finalPrice) < 0.01;
    }

    if (mode === 'Split') {
      const cash = Number(deal.cashAmount || deal.cash_amount || 0);
      const upi = Number(deal.upiAmount || deal.upi_amount || 0);
      const card = Number(deal.cardAmount || deal.card_amount || 0);
      return Math.abs((cash + upi + card + exchange) - finalPrice) < 0.01;
    }

    if (mode === 'EMI') {
      const downCash = Number(deal.downPaymentCash || deal.down_payment_cash || 0);
      const downUpi = Number(deal.downPaymentUpi || deal.down_payment_upi || 0);
      const downCard = Number(deal.downPaymentCard || deal.down_payment_card || 0);
      const disb = Number(deal.disbursementAmount || deal.disbursement_amount || 0);
      return Math.abs((downCash + downUpi + downCard + disb + exchange) - finalPrice) < 0.01;
    }

    return false;
  }

  it('F3-T1: Pure Cash payment submits and balances exactly to finalPrice', async () => {
    const price = 34999;
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: price,
      paymentMethod: 'Cash',
      cashAmount: price,
      storeId: 'DM-01'
    });

    assertEqual(res.deal.payment_method, 'Cash');
    assertEqual(res.deal.cash_amount, price);
    assert(validatePaymentBreakdown(res.deal), 'Pure Cash must balance to final price');
  });

  it('F3-T2: EMI Finance mode submits down payment and disbursement accurately', async () => {
    const price = 39999;
    const downCash = 5000;
    const downUpi = 4999;
    const disbursement = 30000;

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: price,
      paymentMethod: 'EMI',
      financeProvider: 'Bajaj Finance',
      downPaymentCash: downCash,
      downPaymentUpi: downUpi,
      downPaymentCard: 0,
      disbursementAmount: disbursement,
      storeId: 'DM-01'
    });

    assertEqual(res.deal.payment_method, 'EMI');
    assertEqual(res.deal.finance_provider, 'Bajaj Finance');
    assertEqual(res.deal.disbursement_amount, disbursement);
    assert(validatePaymentBreakdown(res.deal), 'EMI components must balance to final price');
  });

  it('F3-T3: Explicit Split payment correctly records mixed cash, UPI, and card channels', async () => {
    const price = 30000;
    const cashPart = 10000;
    const upiPart = 15000;
    const cardPart = 5000;

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: price,
      paymentMethod: 'Split',
      cashAmount: cashPart,
      upiAmount: upiPart,
      cardAmount: cardPart,
      storeId: 'DM-02'
    });

    assertEqual(res.deal.payment_method, 'Split');
    assertEqual(res.deal.cash_amount, cashPart);
    assertEqual(res.deal.upi_amount, upiPart);
    assertEqual(res.deal.card_amount, cardPart);
    assert(validatePaymentBreakdown(res.deal), 'Split breakdown must balance to final price');
  });

  it('F3-T4: Split payment with device exchange deducts trade-in value from cash/card total', async () => {
    const price = 35000;
    const exchangeVal = 5000;
    const cashPart = 15000;
    const upiPart = 15000;

    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: price,
      paymentMethod: 'Split',
      hasExchange: true,
      oldDeviceName: 'Vivo Y20',
      exchangeValue: exchangeVal,
      cashAmount: cashPart,
      upiAmount: upiPart,
      cardAmount: 0,
      storeId: 'DM-01'
    });

    assertEqual(res.deal.has_device_exchange, true);
    assertEqual(res.deal.device_exchange_amount, exchangeVal);
    assert(validatePaymentBreakdown(res.deal), 'Split + exchange must balance to final price');
  });

  it('F3-T5: Manager Edit action can adjust Split breakdown and approve deal cleanly', async () => {
    const initialPrice = 20000;
    const res = await api.submitDeal({
      productName: 'Xiaomi Note 13 Pro',
      finalPrice: initialPrice,
      paymentMethod: 'Split',
      cashAmount: 10000,
      upiAmount: 10000,
      cardAmount: 0,
      storeId: 'DM-01'
    });

    // Manager edits split breakdown: changes to 5000 cash, 10000 upi, 5000 card
    const editRes = await api.performDealAction({
      dealId: res.dealId,
      action: 'edit',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      edits: {
        paymentMethod: 'Split',
        cashAmount: 5000,
        upiAmount: 10000,
        cardAmount: 5000
      }
    });

    assertEqual(editRes.success, true);
    assertEqual(editRes.status, 'approved');
    const { data: updatedDb } = await db.from('sales_approvals').select('*').eq('id', res.dealId).single();
    assertEqual(updatedDb.cash_amount, 5000);
    assertEqual(updatedDb.upi_amount, 10000);
    assertEqual(updatedDb.card_amount, 5000);
    assert(validatePaymentBreakdown(updatedDb));
  });
});
