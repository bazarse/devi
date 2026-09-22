/**
 * Tier 4: Real-World Workload Scenarios
 * Realistic enterprise simulations covering complete day-in-the-life retail workflows,
 * multi-branch store operations, customer CRM lifecycles, and festival sales rushes.
 */

const { describe, it, assert, assertEqual, assertTruthy } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi, numberToIndianWords } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 4: Real-World Workload Scenarios', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('Scenario 1: Full Retail Store Day Workflow (Opening float -> Walk-in sales -> EMI exchange -> Shift closing & IST reconciliation)', async () => {
    // 1. Morning store opening (Kanthal Flagship DM-01)
    const openingDeals = [];
    const openingMetrics = api.calculateRegisterMetrics(openingDeals, '2026-09-04');
    assertEqual(openingMetrics.totalSales, 0);

    // 2. Morning Walk-in: Cash Sale (Vivo V40)
    const morningSale = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      imeiSerial: FIXTURES.IMEIS.IN_STOCK_1,
      paymentMethod: 'Cash',
      cashAmount: 34999,
      customerName: 'Kailash Meena',
      customerPhone: '9827011001',
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: morningSale.dealId, action: 'approve', decidedBy: 'Manager' });

    // 3. Afternoon Walk-in: EMI Sale with Old Device Exchange (OnePlus 12R)
    const afternoonSale = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: 39999,
      imeiSerial: FIXTURES.IMEIS.IN_STOCK_2,
      paymentMethod: 'EMI',
      financeProvider: 'Bajaj Finance Limited',
      downPaymentCash: 3999,
      disbursementAmount: 30000,
      hasExchange: true,
      oldDeviceName: 'Redmi Note 10 Pro',
      oldDeviceImei: '862045051888888',
      oldDeviceCondition: 'Good',
      exchangeValue: 6000,
      customerName: 'Priya Verma',
      customerPhone: '9827011002',
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: afternoonSale.dealId, action: 'approve', decidedBy: 'Manager' });

    // Verify exchange phone was ingested at 1.25x resale price (6000 * 1.25 = 7500)
    const { data: exchItem } = await db.from('device_exchanges').select('*').eq('sale_approval_id', afternoonSale.dealId).single();
    assertEqual(exchItem.valuation_amount, 6000);
    assertEqual(exchItem.resale_price, 7500);
    assertEqual(exchItem.status, 'in_stock');

    // 4. Evening Walk-in: Split Accessories Sale (boAt Earbuds + 65W Fast Charger)
    const eveningEarbuds = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.BOAT_EARBUDS.name,
      category: 'Accessories',
      finalPrice: 1299,
      paymentMethod: 'Split',
      cashAmount: 500,
      upiAmount: 799,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: eveningEarbuds.dealId, action: 'approve', decidedBy: 'Manager' });

    // 5. Night Shift Closing & Day-End IST Financial Reconciliation
    const { data: allApprovedDeals } = await db.from('sales_approvals').select('*').eq('status', 'approved');
    const nightClosingMetrics = api.calculateRegisterMetrics(allApprovedDeals);

    assertEqual(nightClosingMetrics.recordCount, 3);
    assertEqual(nightClosingMetrics.totalSales, 76297); // 34999 + 39999 + 1299
    assertEqual(nightClosingMetrics.totalCash, 39498); // 34999 + 3999 + 500
    assertEqual(nightClosingMetrics.totalUpi, 799);
    assertEqual(nightClosingMetrics.totalExchange, 6000);
    assertEqual(nightClosingMetrics.totalFinance, 30000);
    assertEqual(nightClosingMetrics.totalReconciled, 76297);
  });

  it('Scenario 2: Multi-Branch Store Operations (Simultaneous operations across Store DM-01 and Store DM-02 with isolated stock)', async () => {
    // Branch DM-01 (Kanthal) deal
    const dealDm01 = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      imeiSerial: FIXTURES.IMEIS.IN_STOCK_1,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });

    // Branch DM-02 (Freeganj) deal
    const dealDm02 = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      imeiSerial: FIXTURES.IMEIS.IN_STOCK_4, // Stock assigned to DM-02
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_2.phone,
      storeId: 'DM-02'
    });

    // Store manager approvals
    await api.performDealAction({ dealId: dealDm01.dealId, action: 'approve', decidedBy: 'Sunil Manager (DM-01)' });
    await api.performDealAction({ dealId: dealDm02.dealId, action: 'approve', decidedBy: 'Dilip Kishnani (Super Admin)' });

    // Verify stock deduction isolated to respective stores
    const { data: stockDm01 } = await db.from('imei_stock').select('*').eq('imei1', FIXTURES.IMEIS.IN_STOCK_1).single();
    assertEqual(stockDm01.store_id, FIXTURES.STORES.DM01.id);
    assertEqual(stockDm01.status, 'sold');

    const { data: stockDm02 } = await db.from('imei_stock').select('*').eq('imei1', FIXTURES.IMEIS.IN_STOCK_4).single();
    assertEqual(stockDm02.store_id, FIXTURES.STORES.DM02.id);
    assertEqual(stockDm02.status, 'sold');

    // Consolidated HQ Register check
    const { data: allDeals } = await db.from('sales_approvals').select('*').eq('status', 'approved');
    const hqMetrics = api.calculateRegisterMetrics(allDeals);
    assertEqual(hqMetrics.recordCount, 2);
    assertEqual(hqMetrics.totalSales, 69998);
  });

  it('Scenario 3: Complete Customer CRM & Trade-In Lifecycle (Lead -> Follow-up -> Conversion -> Ingestion -> Resale)', async () => {
    const custPhone = '9827055555';
    const custName = 'Deepak Jain';

    // Phase 1: Walk-in lead registration
    const { data: lead } = await db.from('leads').insert({
      id: 'lead-lifecycle-001',
      customer_name: custName,
      phone: custPhone,
      status: 'Interested',
      model_interest: 'Samsung Galaxy A55 5G',
      budget: 40000
    });

    // Phase 2: Salesman follow-up and status conversion
    await db.from('leads').update({ status: 'Converted', notes: 'Agreed to trade in older phone' }).eq('id', lead.id);

    // Phase 3: Trade-in deal submission & approval
    const tradeInVal = 8000;
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: 38999,
      imeiSerial: FIXTURES.IMEIS.IN_STOCK_3,
      hasExchange: true,
      oldDeviceName: 'Galaxy A50',
      oldDeviceImei: '862045051777777',
      exchangeValue: tradeInVal,
      paymentMethod: 'Split',
      cashAmount: 18999,
      upiAmount: 12000,
      customerName: custName,
      customerPhone: custPhone,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: sub.dealId, action: 'approve', decidedBy: 'Manager' });

    // Verify customer profile created with single spend
    const { data: cust } = await db.from('customers').select('*').eq('phone', custPhone).single();
    assertEqual(cust.name, custName);
    assertEqual(cust.total_spent, 38999);

    // Phase 4: Second-hand phone cataloged for resale
    const { data: exchangePhone } = await db.from('device_exchanges').select('*').eq('sale_approval_id', sub.dealId).single();
    assertEqual(exchangePhone.resale_price, 10000); // 8000 * 1.25

    // Phase 5: Reselling second-hand phone to Customer B
    const buyerBPhone = '9425011111';
    const resaleSub = await api.submitDeal({
      productName: 'Samsung Galaxy A50 (Second Hand)',
      finalPrice: 10000,
      imeiSerial: exchangePhone.device_imei,
      paymentMethod: 'Cash',
      cashAmount: 10000,
      customerName: 'Anil Gupta',
      customerPhone: buyerBPhone,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: resaleSub.dealId, action: 'approve', decidedBy: 'Manager' });

    const { data: custB } = await db.from('customers').select('*').eq('phone', buyerBPhone).single();
    assertEqual(custB.total_spent, 10000);
  });

  it('Scenario 4: High-Pressure Manager Approvals Desk Under Load (Batch processing: approves, edits, rejections, targeted alerts)', async () => {
    // 5 deals submitted concurrently from sales floor
    const d1 = await api.submitDeal({ productName: 'Phone 1', finalPrice: 15000, salesPersonPhone: '9926598700', storeId: 'DM-01' });
    const d2 = await api.submitDeal({ productName: 'Phone 2', finalPrice: 20000, salesPersonPhone: '9926598700', storeId: 'DM-01' });
    const d3 = await api.submitDeal({ productName: 'Phone 3', finalPrice: 25000, salesPersonPhone: '7828915933', storeId: 'DM-02' });
    const d4 = await api.submitDeal({ productName: 'Phone 4', finalPrice: 30000, salesPersonPhone: '7828915933', storeId: 'DM-02' });
    const d5 = await api.submitDeal({ productName: 'Phone 5', finalPrice: 35000, salesPersonPhone: '9926598700', storeId: 'DM-01' });

    // Manager processes batch:
    // Deal 1: Direct approve
    await api.performDealAction({ dealId: d1.dealId, action: 'approve', decidedBy: 'Super Admin' });
    // Deal 2: Edit price (discount by 1000) & approve
    await api.performDealAction({ dealId: d2.dealId, action: 'edit', decidedBy: 'Super Admin', edits: { finalPrice: 19000 } });
    // Deal 3: Reject with mandatory reason
    await api.performDealAction({ dealId: d3.dealId, action: 'reject', decidedBy: 'Super Admin', rejectionReason: 'Low CIBIL score' });
    // Deal 4: Direct approve
    await api.performDealAction({ dealId: d4.dealId, action: 'approve', decidedBy: 'Super Admin' });
    // Deal 5: Reject with mandatory reason
    await api.performDealAction({ dealId: d5.dealId, action: 'reject', decidedBy: 'Super Admin', rejectionReason: 'Stock unavailable' });

    // Verify targeted notification delivery:
    // Salesman 1 (9926598700) submitted d1, d2, d5
    const notifsS1 = api.notificationsSent.filter(n => n.targetPhone === '9926598700');
    assertEqual(notifsS1.length, 3);

    // Salesman 2 (7828915933) submitted d3, d4
    const notifsS2 = api.notificationsSent.filter(n => n.targetPhone === '7828915933');
    assertEqual(notifsS2.length, 2);
  });

  it('Scenario 5: Festival Flash-Sale & Accounting Audit (High volume rush -> Invoicing -> Batch Tally upload)', async () => {
    const deals = [];
    for (let i = 1; i <= 10; i++) {
      const sub = await api.submitDeal({
        productName: `Flash Sale Item ${i}`,
        finalPrice: 10000 + (i * 1000),
        barcode: `FLASH-BC-${i.toString().padStart(3, '0')}`,
        storeId: 'DM-01'
      });
      await api.performDealAction({ dealId: sub.dealId, action: 'approve', decidedBy: 'Manager' });
      deals.push(sub);
    }

    // 1. Verify tax invoices calculate cleanly for all 10 deals
    for (const d of deals) {
      const inv = api.calculateGstInvoice({ rateInclTax: d.deal.final_price });
      assert(inv.isBalanced, `Invoice for deal ${d.dealId} must balance`);
    }

    // 2. End-of-day Tally batch upload
    for (const d of deals) {
      const tally = await api.toggleTallySync({ dealId: d.dealId, isUploaded: true, userName: 'Tally Operator' });
      assertEqual(tally.isUploaded, true);
    }

    // 3. Verify barcodes preserved across all 10 records
    const { data: dbDeals } = await db.from('sales_approvals').select('*');
    for (const d of deals) {
      const found = dbDeals.find(x => x.id === d.dealId);
      assertEqual(found.is_tally_uploaded, true);
      assert(found.barcode.startsWith('FLASH-BC-'));
    }
  });

  it('Scenario 6: Adversarial Resilience & Disaster Recovery (Double-sell race prevention + Bypass attempt + XSS injection + Localized recovery)', async () => {
    const imei = FIXTURES.IMEIS.IN_STOCK_1;

    // 1. Race condition simulation: Deal A and Deal B submitted for SAME IMEI
    const dealA = await api.submitDeal({ productName: 'Vivo V40', finalPrice: 34999, imeiSerial: imei, storeId: 'DM-01' });
    const dealB = await api.submitDeal({ productName: 'Vivo V40', finalPrice: 34999, imeiSerial: imei, storeId: 'DM-01' });

    // Deal A approved first -> succeeds
    const actA = await api.performDealAction({ dealId: dealA.dealId, action: 'approve', decidedBy: 'Manager' });
    assertEqual(actA.status, 'approved');

    // Deal B approval attempted -> double selling error caught cleanly
    let errorCaught = false;
    try {
      await api.performDealAction({ dealId: dealB.dealId, action: 'approve', decidedBy: 'Manager' });
    } catch (e) {
      errorCaught = true;
      assert(e.message.includes('already sold'));
    }
    assertEqual(errorCaught, true, 'Second approval for same sold IMEI must fail');

    // 2. Client bypass attempt
    const hackDeal = await api.submitDeal({ productName: 'Phone', finalPrice: 10000, status: 'approved', storeId: 'DM-01' });
    assertEqual(hackDeal.status, 'pending_approval');

    // 3. XSS injection preserved safely
    const xssDeal = await api.submitDeal({ productName: 'Phone', finalPrice: 10000, customerAddress: '<script>evil()</script>', storeId: 'DM-01' });
    const { data: savedDeal } = await db.from('sales_approvals').select('*').eq('id', xssDeal.dealId).single();
    assertEqual(savedDeal.customer_address, '<script>evil()</script>');
  });
});
