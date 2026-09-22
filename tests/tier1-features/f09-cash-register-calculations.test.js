/**
 * Tier 1 - Feature 9: Cash Register Calculation Integrity
 * Verifies that the cash register financial balance metrics, adjustedCash formula,
 * and Indian Standard Time (IST) date filtering function accurately.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 1 - Feature 9: Cash Register Calculation Integrity', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F9-T1: totalCollected formula accurately incorporates cash, upi, card, finance, and exchange', () => {
    const deals = [
      {
        payment_method: 'Split',
        final_price: 50000,
        cash_amount: 15000,
        upi_amount: 15000,
        card_amount: 10000,
        device_exchange_amount: 10000
      }
    ];

    const metrics = api.calculateRegisterMetrics(deals);
    assertEqual(metrics.totalSales, 50000);
    assertEqual(metrics.totalCash, 15000);
    assertEqual(metrics.totalUpi, 15000);
    assertEqual(metrics.totalCard, 10000);
    assertEqual(metrics.totalExchange, 10000);
    assertEqual(metrics.totalReconciled, 50000);
  });

  it('F9-T2: adjustedCash formula falls back to finalPrice when pure cash deal has totalCollected === 0', () => {
    const legacyCashDeal = [
      {
        payment_method: 'Cash',
        final_price: 12000,
        cash_amount: 0,
        upi_amount: 0,
        card_amount: 0,
        device_exchange_amount: 0
      }
    ];

    const metrics = api.calculateRegisterMetrics(legacyCashDeal);
    assertEqual(metrics.totalCash, 12000);
    assertEqual(metrics.totalSales, 12000);
    assertEqual(metrics.totalReconciled, 12000);
  });

  it('F9-T3: EMI mode distinguishes down payment cash/upi from finance disbursement', () => {
    const emiDeals = [
      {
        payment_method: 'EMI',
        final_price: 45000,
        down_payment_cash: 5000,
        down_payment_upi: 5000,
        down_payment_card: 0,
        disbursement_amount: 35000
      }
    ];

    const metrics = api.calculateRegisterMetrics(emiDeals);
    assertEqual(metrics.totalCash, 5000);
    assertEqual(metrics.totalUpi, 5000);
    assertEqual(metrics.totalFinance, 35000);
    assertEqual(metrics.totalSales, 45000);
    assertEqual(metrics.totalReconciled, 45000);
  });

  it('F9-T4: Date filtering correctly resolves day boundaries using Indian Standard Time (Asia/Kolkata)', () => {
    // 2026-09-04 18:31 UTC is 2026-09-05 00:01 in IST
    const lateUtcDeal = {
      id: 'deal-late',
      final_price: 25000,
      payment_method: 'Cash',
      cash_amount: 25000,
      approved_at: '2026-09-04T18:31:00.000Z'
    };

    // 2026-09-04 10:00 UTC is 2026-09-04 15:30 in IST
    const dayUtcDeal = {
      id: 'deal-day',
      final_price: 15000,
      payment_method: 'Cash',
      cash_amount: 15000,
      approved_at: '2026-09-04T10:00:00.000Z'
    };

    const deals = [lateUtcDeal, dayUtcDeal];

    // Filter for 2026-09-04 in IST
    const sep04Metrics = api.calculateRegisterMetrics(deals, '2026-09-04');
    assertEqual(sep04Metrics.recordCount, 1);
    assertEqual(sep04Metrics.totalSales, 15000);

    // Filter for 2026-09-05 in IST
    const sep05Metrics = api.calculateRegisterMetrics(deals, '2026-09-05');
    assertEqual(sep05Metrics.recordCount, 1);
    assertEqual(sep05Metrics.totalSales, 25000);
  });

  it('F9-T5: Multi-deal shift aggregation aggregates mixed transaction modes without discrepancy', () => {
    const mixedBatch = [
      { payment_method: 'Cash', final_price: 1000, cash_amount: 1000 },
      { payment_method: 'Split', final_price: 20000, cash_amount: 10000, upi_amount: 10000 },
      { payment_method: 'EMI', final_price: 40000, down_payment_cash: 5000, disbursement_amount: 35000 },
      { payment_method: 'Split', final_price: 30000, cash_amount: 10000, card_amount: 10000, device_exchange_amount: 10000 }
    ];

    const metrics = api.calculateRegisterMetrics(mixedBatch);
    assertEqual(metrics.totalSales, 91000);
    assertEqual(metrics.totalCash, 26000); // 1000 + 10000 + 5000 + 10000
    assertEqual(metrics.totalUpi, 10000);
    assertEqual(metrics.totalCard, 10000);
    assertEqual(metrics.totalFinance, 35000);
    assertEqual(metrics.totalExchange, 10000);
    assertEqual(metrics.totalReconciled, 91000);
  });
});
