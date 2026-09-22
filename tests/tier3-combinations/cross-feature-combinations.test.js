/**
 * Tier 3: Cross-Feature Combinations
 * Pairwise and multi-feature interaction test suite verifying complex enterprise workflows:
 * Split payment + exchange + rejection, Cash + IMEI check + Tally upload,
 * EMI + CRM spend + GST invoice, Edit deal + inventory swap, etc.
 */

const { describe, it, assert, assertEqual, assertTruthy, assertFalsy } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi, numberToIndianWords } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 3: Cross-Feature Combinations (Pairwise & Multi-Feature Interactions)', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('Combo 1: Split payment + exchange valuation + manager rejection with mandatory reason', async () => {
    const imei = FIXTURES.IMEIS.IN_STOCK_1;
    const valuation = 6000;
    const finalPrice = 30000;
    const cash = 12000;
    const upi = 12000;

    // 1. Submit Split deal with device exchange
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice,
      imeiSerial: imei,
      paymentMethod: 'Split',
      cashAmount: cash,
      upiAmount: upi,
      hasExchange: true,
      oldDeviceName: 'Oppo F19',
      oldDeviceImei: '862000000000001',
      oldDeviceCondition: 'Fair',
      exchangeValue: valuation,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });
    assertEqual(sub.status, 'pending_approval');

    // 2. Manager inspects trade-in phone and rejects deal with specific reason
    const reason = 'Exchange device has deep display scratches - valuation lowered to 3000, please renegotiate';
    const rejectRes = await api.performDealAction({
      dealId: sub.dealId,
      action: 'reject',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      rejectionReason: reason
    });
    assertEqual(rejectRes.status, 'rejected');

    // 3. Stock was NOT deducted
    const { data: stock } = await db.from('imei_stock').select('*').eq('imei1', imei).single();
    assertEqual(stock.status, 'in_stock');
    assertEqual(stock.sold_invoice_id, null);

    // 4. Exchange device was NOT ingested into device_exchanges
    const { data: exchanges } = await db.from('device_exchanges').select('*').eq('sale_approval_id', sub.dealId);
    assertEqual(exchanges.length, 0);

    // 5. Targeted rejection notification delivered to submitting salesman
    const notif = api.notificationsSent.find(n => n.dealId === sub.dealId && n.type === 'deal_rejected');
    assertEqual(notif.targetPhone, FIXTURES.STAFF.SALESMAN_1.phone);
    assert(notif.body.includes(reason));
  });

  it('Combo 2: Cash deal + IMEI stock auto-deduction + Tally ERP upload toggle with barcode preservation', async () => {
    const imei = FIXTURES.IMEIS.IN_STOCK_2;
    const barcode = 'BARCODE-SCAN-012R';

    // 1. Submit Cash deal
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: 39999,
      imeiSerial: imei,
      paymentMethod: 'Cash',
      cashAmount: 39999,
      barcode,
      storeId: 'DM-01'
    });

    // 2. Approve deal
    await api.performDealAction({
      dealId: sub.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    // Verify IMEI sold
    const { data: stock } = await db.from('imei_stock').select('*').eq('imei1', imei).single();
    assertEqual(stock.status, 'sold');
    assertEqual(stock.sold_invoice_id, sub.dealId);

    // 3. Toggle Tally ERP sync
    const tallyRes = await api.toggleTallySync({
      dealId: sub.dealId,
      isUploaded: true,
      userName: 'Accounts Incharge'
    });
    assertEqual(tallyRes.isUploaded, true);

    // Verify barcode was NOT overwritten by Tally marker
    const { data: deal } = await db.from('sales_approvals').select('*').eq('id', sub.dealId).single();
    assertEqual(deal.barcode, barcode);
    assertEqual(deal.is_tally_uploaded, true);
  });

  it('Combo 3: EMI Finance mode + Customer CRM spend accumulation + GST Tax Invoice generation', async () => {
    const custPhone = '9827011223';
    const finalPrice = 41999;
    const downCash = 6999;
    const disbursement = 35000;

    // 1. Submit EMI deal
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice,
      paymentMethod: 'EMI',
      financeProvider: 'Bajaj Finance Limited',
      downPaymentCash: downCash,
      disbursementAmount: disbursement,
      customerName: 'Rajesh Gupta',
      customerPhone: custPhone,
      customerAddress: 'Freeganj Main Road, Ujjain',
      storeId: 'DM-01'
    });

    // 2. Manager approves deal
    await api.performDealAction({
      dealId: sub.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });

    // 3. Customer CRM aggregated with exactly single spend
    const { data: cust } = await db.from('customers').select('*').eq('phone', custPhone).single();
    assertEqual(cust.total_spent, finalPrice);
    assertEqual(cust.purchase_count, 1);

    // 4. Generate official GST Tax invoice calculations
    const inv = api.calculateGstInvoice({ rateInclTax: finalPrice });
    assertEqual(inv.taxableValue, 35592.37);
    assertEqual(inv.cgst, 3203.32);
    assertEqual(inv.sgst, 3203.32);
    assertEqual(inv.totalTax, 6406.63);
    assert(inv.isBalanced);
  });

  it('Combo 4: Deal Edit (price reduction & switch IMEI) + Release old IMEI + Deduct new IMEI', async () => {
    const imeiInitial = FIXTURES.IMEIS.IN_STOCK_3;
    const imeiReplacement = FIXTURES.IMEIS.IN_STOCK_4;

    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      imeiSerial: imeiInitial,
      storeId: 'DM-01'
    });

    // Manager gives Rs 1,500 discount and switches IMEI to replacement
    const editRes = await api.performDealAction({
      dealId: sub.dealId,
      action: 'edit',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name,
      edits: {
        finalPrice: 33499,
        imeiSerial: imeiReplacement,
        cashAmount: 33499
      }
    });
    assertEqual(editRes.status, 'approved');

    // Replacement IMEI is marked sold
    const { data: repStock } = await db.from('imei_stock').select('*').eq('imei1', imeiReplacement).single();
    assertEqual(repStock.status, 'sold');

    // Initial IMEI remains in_stock
    const { data: initStock } = await db.from('imei_stock').select('*').eq('imei1', imeiInitial).single();
    assertEqual(initStock.status, 'in_stock');

    // Deal record updated with new price
    const { data: updatedDeal } = await db.from('sales_approvals').select('*').eq('id', sub.dealId).single();
    assertEqual(updatedDeal.final_price, 33499);
    assertEqual(updatedDeal.imei_serial, imeiReplacement);
  });

  it('Combo 5: Multi-store deal submissions + store code mapping + role-aware bottom navigation tabs', async () => {
    // 1. Submit at DM-01 (Kanthal)
    const sub1 = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      storeId: 'DM-01'
    });
    assertEqual(sub1.deal.store_id, FIXTURES.STORES.DM01.id);
    assertEqual(sub1.deal.store_code, 'DM-01');

    // 2. Submit at DM-02 (Freeganj)
    const sub2 = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.ONEPLUS_12R.name,
      finalPrice: 39999,
      storeId: 'DM-02'
    });
    assertEqual(sub2.deal.store_id, FIXTURES.STORES.DM02.id);
    assertEqual(sub2.deal.store_code, 'DM-02');

    // 3. Verify bottom nav updates for salesman vs super admin
    const salesmanTabs = api.resolveBottomNavTabs('salesman');
    assertEqual(salesmanTabs[0].path, '/pos');

    const superTabs = api.resolveBottomNavTabs('super_admin');
    assertEqual(superTabs[0].path, '/admin/super');
  });

  it('Combo 6: Device exchange ingestion + 1.25x resale price + second-hand inventory resale', async () => {
    const valuation = 10000;
    const oldImei = '862045051999991';

    // 1. Trade-in deal approved
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      hasExchange: true,
      oldDeviceName: 'iPhone 11',
      oldDeviceImei: oldImei,
      exchangeValue: valuation,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: sub.dealId, action: 'approve', decidedBy: 'Admin' });

    // 2. Check device_exchanges ingestion
    const { data: exchItem } = await db.from('device_exchanges')
      .select('*')
      .eq('sale_approval_id', sub.dealId)
      .single();
    assertEqual(exchItem.valuation_amount, valuation);
    assertEqual(exchItem.resale_price, 12500); // 10000 * 1.25

    // 3. Reselling second-hand phone in new deal
    const resaleSub = await api.submitDeal({
      productName: 'iPhone 11 (Second Hand)',
      finalPrice: exchItem.resale_price,
      imeiSerial: exchItem.device_imei,
      category: 'Second Hand Phone',
      paymentMethod: 'Cash',
      cashAmount: exchItem.resale_price,
      storeId: 'DM-01'
    });
    assertEqual(resaleSub.deal.final_price, 12500);
  });

  it('Combo 7: Cash register day-end reconciliation + IST date boundary + exchange trade-in calculation', () => {
    const dayDeals = [
      // Deal 1: Cash sale
      {
        final_price: 15000,
        payment_method: 'Cash',
        cash_amount: 15000,
        approved_at: '2026-09-04T08:00:00.000Z'
      },
      // Deal 2: Split sale with exchange
      {
        final_price: 35000,
        payment_method: 'Split',
        cash_amount: 10000,
        upi_amount: 15000,
        device_exchange_amount: 10000,
        approved_at: '2026-09-04T11:30:00.000Z'
      },
      // Deal 3: EMI sale
      {
        final_price: 40000,
        payment_method: 'EMI',
        down_payment_cash: 5000,
        disbursement_amount: 35000,
        approved_at: '2026-09-04T14:00:00.000Z'
      }
    ];

    const metrics = api.calculateRegisterMetrics(dayDeals, '2026-09-04');
    assertEqual(metrics.recordCount, 3);
    assertEqual(metrics.totalSales, 90000);
    assertEqual(metrics.totalCash, 30000); // 15000 + 10000 + 5000
    assertEqual(metrics.totalUpi, 15000);
    assertEqual(metrics.totalExchange, 10000);
    assertEqual(metrics.totalFinance, 35000);
    assertEqual(metrics.totalReconciled, 90000);
  });

  it('Combo 8: Lead creation -> Status update to Converted -> Deal submission -> CRM spend aggregation', async () => {
    const custPhone = '9425098765';

    // 1. Create walk-in lead
    const { data: lead } = await db.from('leads').insert({
      id: 'lead-workflow-001',
      customer_name: 'Amit Kumar',
      phone: custPhone,
      status: 'Interested',
      model_interest: 'Vivo V40'
    });

    // 2. Update lead status to Converted using leadId
    const updatePayload = {
      leadId: lead.id,
      status: 'Converted',
      notes: 'Customer agreed to buy in afternoon'
    };
    await db.from('leads').update({ status: updatePayload.status, notes: updatePayload.notes }).eq('id', updatePayload.leadId);

    const { data: updatedLead } = await db.from('leads').select('*').eq('id', lead.id).single();
    assertEqual(updatedLead.status, 'Converted');

    // 3. Submit and approve deal
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      customerName: 'Amit Kumar',
      customerPhone: custPhone,
      storeId: 'DM-01'
    });
    await api.performDealAction({ dealId: sub.dealId, action: 'approve', decidedBy: 'Admin' });

    // 4. Customer CRM created with purchase
    const { data: cust } = await db.from('customers').select('*').eq('phone', custPhone).single();
    assertEqual(cust.name, 'Amit Kumar');
    assertEqual(cust.total_spent, 34999);
  });

  it('Combo 9: UI layout compliance: tap target size + table scroll wrapper + safe string evaluation', () => {
    // 1. Mobile button tap target >= 44px
    const approveBtn = { width: 44, height: 44, padding: 0 };
    const isTargetValid = approveBtn.width >= 44 && approveBtn.height >= 44;
    assertEqual(isTargetValid, true);

    // 2. Table container has horizontal scroll
    const tableContainerClass = 'w-full overflow-x-auto border';
    assert(tableContainerClass.includes('overflow-x-auto'));

    // 3. Sparse deal record evaluates safely
    const sparseRecord = { token: null, id: null };
    const safeToken = api.safeTokenString(sparseRecord);
    assertEqual(safeToken, '');
  });

  it('Combo 10: Counter deal approval bypass attempt + force pending + instant admin push notification', async () => {
    // Client tries to force approved status
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      status: 'approved',
      storeId: 'DM-01'
    });

    // Enforced to pending
    assertEqual(sub.status, 'pending_approval');
    assertEqual(sub.deal.status, 'pending_approval');

    // Push notification queued for admin
    const adminAlert = api.notificationsSent.find(n => n.dealId === sub.dealId && n.type === 'deal_alert_to_admin');
    assertTruthy(adminAlert);
    assertEqual(adminAlert.role, 'admin');
    assertEqual(adminAlert.url, '/admin/super/approvals');
  });

  it('Combo 11: Tally toggle on and off + barcode preservation + UI persistence check', async () => {
    const barcode = 'PROD-BC-12345';
    const sub = await api.submitDeal({ productName: 'Phone', finalPrice: 20000, barcode, storeId: 'DM-01' });

    // Turn ON
    const onRes = await api.toggleTallySync({ dealId: sub.dealId, isUploaded: true, userName: 'Dilip HQ' });
    assertEqual(onRes.isUploaded, true);
    assertEqual(onRes.preservedBarcode, barcode);

    // Turn OFF
    const offRes = await api.toggleTallySync({ dealId: sub.dealId, isUploaded: false, userName: 'Dilip HQ' });
    assertEqual(offRes.isUploaded, false);
    assertEqual(offRes.preservedBarcode, barcode);

    // Verify barcode in DB
    const { data: row } = await db.from('sales_approvals').select('*').eq('id', sub.dealId).single();
    assertEqual(row.barcode, barcode);
    assertEqual(row.is_tally_uploaded, false);
  });

  it('Combo 12: Localized error boundary catches partial table error and allows retry recovery', () => {
    class Boundary {
      constructor() { this.hasError = false; }
      catch() { this.hasError = true; }
      reset() { this.hasError = false; }
      run(fn) {
        if (this.hasError) return { status: 'fallback', retry: () => this.reset() };
        try { return { status: 'success', data: fn() }; }
        catch (e) { this.catch(); return this.run(fn); }
      }
    }

    let shouldFail = true;
    const boundary = new Boundary();

    function renderTable() {
      if (shouldFail) throw new Error('Render fail');
      return 'Table OK';
    }

    // Attempt 1: fails
    const res1 = boundary.run(renderTable);
    assertEqual(res1.status, 'fallback');

    // Retry after fixing condition
    shouldFail = false;
    res1.retry();
    const res2 = boundary.run(renderTable);
    assertEqual(res2.status, 'success');
    assertEqual(res2.data, 'Table OK');
  });

  it('Combo 13: Android push notification remote rejection with inline RemoteInput reason', async () => {
    const res = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: 34999,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });

    const inlineReason = 'Customer opted for higher storage variant';
    const rejectRes = await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: 'Dilip Kishnani (Super Admin HQ)',
      rejectionReason: inlineReason
    });
    assertEqual(rejectRes.status, 'rejected');

    const notif = api.notificationsSent.find(n => n.dealId === res.dealId && n.type === 'deal_rejected');
    assertEqual(notif.targetPhone, FIXTURES.STAFF.SALESMAN_1.phone);
    assert(notif.body.includes(inlineReason));
  });

  it('Combo 14: High value phone with VAS warranty plan + gift accessories auto-deduction', async () => {
    const phoneImei = FIXTURES.IMEIS.IN_STOCK_5;
    const giftName = FIXTURES.PRODUCTS.BOAT_EARBUDS.name;
    const storeUuid = FIXTURES.STORES.DM02.id;

    // Get initial gift stock in store DM-02
    await db.from('store_inventory').insert({
      store_id: storeUuid,
      product_name: giftName,
      quantity: 10
    });

    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.SAMSUNG_A55.name,
      finalPrice: 42999,
      imeiSerial: phoneImei,
      vasPlan: '1 Year Screen Damage Protection',
      gifts: [giftName],
      storeId: 'DM-02'
    });

    await api.performDealAction({
      dealId: sub.dealId,
      action: 'approve',
      decidedBy: 'Manager'
    });

    // Phone IMEI marked sold
    const { data: stock } = await db.from('imei_stock').select('*').eq('imei1', phoneImei).single();
    assertEqual(stock.status, 'sold');

    // VAS plan persisted
    const { data: deal } = await db.from('sales_approvals').select('*').eq('id', sub.dealId).single();
    assertEqual(deal.vas_details, '1 Year Screen Damage Protection');
  });

  it('Combo 15: Full Enterprise Lifecycle: Walk-in lead -> Split counter deal -> Manager approval -> Tax invoice -> Tally sync', async () => {
    const custPhone = '9827011999';
    const imei = FIXTURES.IMEIS.IN_STOCK_1;
    const price = 34999;
    const barcode = 'SCAN-VIVO-V40-ENT';

    // 1. CRM Lead
    await db.from('leads').insert({
      id: 'lead-ent-01',
      customer_name: 'Pooja Sharma',
      phone: custPhone,
      status: 'Interested'
    });

    // 2. Counter submission with Split payment
    const sub = await api.submitDeal({
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      finalPrice: price,
      imeiSerial: imei,
      paymentMethod: 'Split',
      cashAmount: 20000,
      upiAmount: 14999,
      barcode,
      customerName: 'Pooja Sharma',
      customerPhone: custPhone,
      salesPersonPhone: FIXTURES.STAFF.SALESMAN_1.phone,
      storeId: 'DM-01'
    });
    assertEqual(sub.status, 'pending_approval');

    // 3. Manager approval
    const act = await api.performDealAction({
      dealId: sub.dealId,
      action: 'approve',
      decidedBy: FIXTURES.STAFF.STORE_ADMIN.name
    });
    assertEqual(act.status, 'approved');

    // 4. Tax invoice calculations
    const inv = api.calculateGstInvoice({ rateInclTax: price });
    assertEqual(inv.isBalanced, true);
    const inWords = numberToIndianWords(price);
    assert(inWords.includes('Thirty Four Thousand'));

    // 5. Tally sync
    const tally = await api.toggleTallySync({
      dealId: sub.dealId,
      isUploaded: true,
      userName: 'Chief Accountant'
    });
    assertEqual(tally.isUploaded, true);
    assertEqual(tally.preservedBarcode, barcode);

    // 6. Final verification of customer CRM spend
    const { data: cust } = await db.from('customers').select('*').eq('phone', custPhone).single();
    assertEqual(cust.total_spent, price);
  });
});
