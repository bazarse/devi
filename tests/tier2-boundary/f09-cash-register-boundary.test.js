/**
 * Tier 2 - Feature 9 Boundary: Cash Register Calculation Integrity
 * Tests zero deals, high financial sums, sparse properties, and numeric string coercion.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 2 - Feature 9 Boundary: Cash Register Calculation Integrity', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F9-B1: Empty deals list returns all zero financial aggregates without NaN', () => {
    const metrics = api.calculateRegisterMetrics([]);
    assertEqual(metrics.recordCount, 0);
    assertEqual(metrics.totalSales, 0);
    assertEqual(metrics.totalCash, 0);
    assertEqual(metrics.totalUpi, 0);
    assertEqual(metrics.totalCard, 0);
    assertEqual(metrics.totalFinance, 0);
    assertEqual(metrics.totalExchange, 0);
    assertEqual(metrics.totalReconciled, 0);
  });

  it('F9-B2: High volume transactions in crores calculate without arithmetic precision loss', () => {
    const deals = [
      { payment_method: 'Cash', final_price: 15000000, cash_amount: 15000000 },
      { payment_method: 'Split', final_price: 25000000, cash_amount: 10000000, upi_amount: 15000000 }
    ];

    const metrics = api.calculateRegisterMetrics(deals);
    assertEqual(metrics.totalSales, 40000000);
    assertEqual(metrics.totalCash, 25000000);
    assertEqual(metrics.totalUpi, 15000000);
    assertEqual(metrics.totalReconciled, 40000000);
  });

  it('F9-B3: Sparse deal records with undefined values coerce cleanly to 0 without NaN', () => {
    const sparseDeals = [
      { payment_method: 'Cash', final_price: 5000, cash_amount: 5000 },
      { payment_method: 'Split' } // all payment fields undefined
    ];

    const metrics = api.calculateRegisterMetrics(sparseDeals);
    assertEqual(metrics.recordCount, 2);
    assertEqual(metrics.totalSales, 5000);
    assert(!isNaN(metrics.totalCash), 'totalCash must not be NaN');
    assert(!isNaN(metrics.totalReconciled), 'totalReconciled must not be NaN');
  });

  it('F9-B4: Numeric string values (e.g. "12000") are coerced safely to numbers', () => {
    const stringDeals = [
      {
        payment_method: 'Split',
        final_price: '20000',
        cash_amount: '10000',
        upi_amount: '10000'
      }
    ];

    const metrics = api.calculateRegisterMetrics(stringDeals);
    assertEqual(metrics.totalSales, 20000);
    assertEqual(metrics.totalCash, 10000);
    assertEqual(metrics.totalUpi, 10000);
  });

  it('F9-B5: Deals occurring at exactly 23:59:59 IST match target date filter', () => {
    // 2026-09-04 18:29:59 UTC = 2026-09-04 23:59:59 IST
    const lateDeal = {
      final_price: 8000,
      payment_method: 'Cash',
      cash_amount: 8000,
      approved_at: '2026-09-04T18:29:59.000Z'
    };

    const metrics = api.calculateRegisterMetrics([lateDeal], '2026-09-04');
    assertEqual(metrics.recordCount, 1);
    assertEqual(metrics.totalSales, 8000);
  });
});
