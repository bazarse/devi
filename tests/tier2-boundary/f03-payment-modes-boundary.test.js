/**
 * Tier 2 - Feature 3 Boundary: Payment Mode Support (Cash, Split, EMI)
 * Tests extreme splits, 0 down payments, negative inputs, and payment mismatch boundaries.
 */

const { describe, it, assert, assertEqual, assertFalsy } = require('../helpers/test-harness');

describe('Tier 2 - Feature 3 Boundary: Payment Mode Support (Cash, Split, EMI)', () => {
  function validatePaymentBreakdown(deal) {
    const finalPrice = Number(deal.finalPrice || deal.final_price || 0);
    const exchange = Number(deal.exchangeValue || deal.device_exchange_amount || 0);
    const mode = deal.paymentMethod || deal.payment_method;

    if (finalPrice < 0 || exchange < 0) return false;

    if (mode === 'Cash') {
      const cash = Number(deal.cashAmount || deal.cash_amount || 0);
      if (cash < 0) return false;
      return Math.abs((cash + exchange) - finalPrice) < 0.01;
    }

    if (mode === 'Split') {
      const cash = Number(deal.cashAmount || deal.cash_amount || 0);
      const upi = Number(deal.upiAmount || deal.upi_amount || 0);
      const card = Number(deal.cardAmount || deal.card_amount || 0);
      if (cash < 0 || upi < 0 || card < 0) return false;
      return Math.abs((cash + upi + card + exchange) - finalPrice) < 0.01;
    }

    if (mode === 'EMI') {
      const downCash = Number(deal.downPaymentCash || deal.down_payment_cash || 0);
      const downUpi = Number(deal.downPaymentUpi || deal.down_payment_upi || 0);
      const downCard = Number(deal.downPaymentCard || deal.down_payment_card || 0);
      const disb = Number(deal.disbursementAmount || deal.disbursement_amount || 0);
      if (downCash < 0 || downUpi < 0 || downCard < 0 || disb < 0) return false;
      return Math.abs((downCash + downUpi + downCard + disb + exchange) - finalPrice) < 0.01;
    }

    return false;
  }

  it('F3-B1: Zero down payment EMI (100% financed) is valid when disbursement equals finalPrice', () => {
    const deal = {
      paymentMethod: 'EMI',
      finalPrice: 50000,
      downPaymentCash: 0,
      downPaymentUpi: 0,
      downPaymentCard: 0,
      disbursementAmount: 50000
    };
    assertEqual(validatePaymentBreakdown(deal), true);
  });

  it('F3-B2: 100% Card split (0 cash, 0 upi) balances cleanly', () => {
    const deal = {
      paymentMethod: 'Split',
      finalPrice: 25000,
      cashAmount: 0,
      upiAmount: 0,
      cardAmount: 25000
    };
    assertEqual(validatePaymentBreakdown(deal), true);
  });

  it('F3-B3: 3-way split with penny rounding (10,000 -> 3333 + 3333 + 3334) balances exactly', () => {
    const deal = {
      paymentMethod: 'Split',
      finalPrice: 10000,
      cashAmount: 3333,
      upiAmount: 3333,
      cardAmount: 3334
    };
    assertEqual(validatePaymentBreakdown(deal), true);
  });

  it('F3-B4: Negative payment amount is rejected by validator', () => {
    const invalidDeal = {
      paymentMethod: 'Split',
      finalPrice: 10000,
      cashAmount: -2000,
      upiAmount: 12000,
      cardAmount: 0
    };
    assertEqual(validatePaymentBreakdown(invalidDeal), false);
  });

  it('F3-B5: Payment amount mismatch (total paid != finalPrice) fails validation', () => {
    const underpaidDeal = {
      paymentMethod: 'Cash',
      finalPrice: 35000,
      cashAmount: 20000 // Underpaid by 15,000
    };
    assertEqual(validatePaymentBreakdown(underpaidDeal), false);

    const overpaidDeal = {
      paymentMethod: 'Split',
      finalPrice: 20000,
      cashAmount: 15000,
      upiAmount: 10000 // Overpaid by 5,000
    };
    assertEqual(validatePaymentBreakdown(overpaidDeal), false);
  });
});
