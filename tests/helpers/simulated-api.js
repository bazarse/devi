/**
 * Devi Mobile POS - Simulated API & Contract Engine
 * Implements the authoritative business logic and interface contracts defined in PROJECT.md.
 */

const FIXTURES = require('./fixtures');

const STORE_CODE_TO_UUID = {
  'DM-01': '3be59f85-2859-476c-b402-31c552a83146',
  'DM-02': '7705c16a-2e91-4ef5-93bc-00084848db6a'
};

const UUID_TO_STORE_CODE = {
  '3be59f85-2859-476c-b402-31c552a83146': 'DM-01',
  '7705c16a-2e91-4ef5-93bc-00084848db6a': 'DM-02'
};

class SimulatedApi {
  constructor(db) {
    this.db = db;
    this.notificationsSent = [];
    this.auditLogs = [];
  }

  /**
   * Contract 1: POS Deal Submission (/api/deals/submit)
   * Contract: status MUST ALWAYS be set to 'pending_approval'. Client-provided status 'approved' MUST BE IGNORED or REJECTED.
   */
  async submitDeal(dealData) {
    if (!dealData.productName) {
      throw new Error('productName is required');
    }
    if (dealData.finalPrice === undefined || dealData.finalPrice < 0) {
      throw new Error('Valid finalPrice is required');
    }

    const cleanStoreCode = dealData.storeId?.includes('7705') || dealData.storeId === 'DM-02' ? 'DM-02' : 'DM-01';
    const resolvedStoreUuid = STORE_CODE_TO_UUID[cleanStoreCode] || '3be59f85-2859-476c-b402-31c552a83146';
    const cleanPhone = (dealData.salesPersonPhone || '').replace(/\D/g, '').slice(-10);

    // CONTRACT ENFORCEMENT: Client CANNOT submit as approved or rejected. Must strictly be pending_approval.
    const enforcedStatus = 'pending_approval';

    const cleanCustomerPhone = (dealData.customerPhone || '').replace(/\D/g, '').slice(-10);

    const newDealId = dealData.id || `d${Date.now().toString(16)}-${Math.random().toString(36).substring(2, 6)}-4a00-8000-${Math.random().toString(36).substring(2, 14)}`.slice(0, 36);
    const token = `SA-${newDealId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;

    const insertPayload = {
      id: newDealId,
      token,
      store_id: resolvedStoreUuid,
      store_code: cleanStoreCode,
      sales_person_id: dealData.salesPersonId || 'ca750241-055e-43a4-9a6e-13da57a9110a',
      sales_person_name: dealData.salesPersonName || 'Salesman (Counter Staff)',
      sales_person_phone: cleanPhone || '0000000000',
      customer_name: dealData.customerName || 'Walking Customer',
      customer_phone: cleanCustomerPhone || '0000000000',
      customer_address: dealData.customerAddress || null,
      product_name: dealData.productName,
      category: dealData.category || 'Mobile Phone',
      imei_serial: dealData.imeiSerial || null,
      product_price: Number(dealData.finalPrice || 0) + Number(dealData.discount || 0),
      discount: Number(dealData.discount || 0),
      final_price: Number(dealData.finalPrice || 0),
      payment_method: dealData.paymentMethod || 'Cash',
      finance_provider: dealData.financeProvider || null,
      disbursement_amount: Number(dealData.disbursementAmount || 0),
      down_payment_cash: Number(dealData.downPaymentCash || 0),
      down_payment_upi: Number(dealData.downPaymentUpi || 0),
      down_payment_card: Number(dealData.downPaymentCard || 0),
      cash_amount: Number(dealData.cashAmount || 0),
      upi_amount: Number(dealData.upiAmount || 0),
      card_amount: Number(dealData.cardAmount || 0),
      has_device_exchange: Boolean(dealData.hasExchange),
      device_name: dealData.oldDeviceName || null,
      device_imei: dealData.oldDeviceImei || null,
      device_condition: dealData.oldDeviceCondition || null,
      device_exchange_amount: Number(dealData.exchangeValue || 0),
      gifts: dealData.gifts ? (Array.isArray(dealData.gifts) ? dealData.gifts : [dealData.gifts]) : [],
      vas_details: dealData.vasPlan || null,
      status: enforcedStatus,
      approved_by_name: null,
      approved_at: null,
      rejection_reason: null,
      barcode: dealData.barcode || `BC-${token}`,
      is_tally_uploaded: false,
      tally_uploaded_at: null,
      tally_uploaded_by: null
    };

    const { data: inserted, error: insertErr } = await this.db
      .from('sales_approvals')
      .insert(insertPayload);

    if (insertErr) throw insertErr;

    // Simulate push alert to store managers
    this.notificationsSent.push({
      type: 'deal_alert_to_admin',
      role: 'admin',
      dealId: newDealId,
      title: `🚨 Pending Deal Approval • ₹${inserted.final_price}`,
      body: `📱 ${inserted.product_name} at Store ${cleanStoreCode}`,
      url: '/admin/super/approvals'
    });

    return {
      success: true,
      dealId: inserted.id,
      status: 'pending_approval',
      token: inserted.token,
      deal: inserted
    };
  }

  /**
   * Contract 2: POS Deal Action (/api/deals/action)
   * Handles 'approve', 'reject', and 'edit'
   */
  async performDealAction({ dealId, action, decidedBy, rejectionReason, edits }) {
    if (!dealId || !action) {
      throw new Error('dealId and action are required');
    }

    let normAction = String(action).toLowerCase().trim();
    if (normAction === 'approved') normAction = 'approve';
    if (normAction === 'rejected') normAction = 'reject';
    if (normAction === 'edited') normAction = 'edit';

    // 1. Fetch current deal
    const { data: deal } = await this.db
      .from('sales_approvals')
      .select('*')
      .eq('id', dealId)
      .maybeSingle();

    if (!deal) {
      throw new Error(`Deal ${dealId} not found`);
    }

    const nowIso = new Date().toISOString();

    // ----------------- ACTION: REJECT -----------------
    if (normAction === 'reject') {
      // CONTRACT: rejectionReason MUST BE a non-empty string. Whitespace or empty string is rejected.
      if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim() === '') {
        throw new Error('Rejection reason is mandatory and cannot be empty');
      }

      await this.db
        .from('sales_approvals')
        .update({
          status: 'rejected',
          approved_by_name: decidedBy || 'Store Manager',
          approved_at: nowIso,
          rejection_reason: rejectionReason.trim(),
          updated_at: nowIso
        })
        .eq('id', dealId);

      // Targeted notification to submitting salesman strictly
      this.notificationsSent.push({
        type: 'deal_rejected',
        targetPhone: deal.sales_person_phone,
        salesmanName: deal.sales_person_name,
        title: `⚠️ Deal Rejected • ${deal.product_name}`,
        body: `Rejected by ${decidedBy || 'Store Manager'}. Reason: "${rejectionReason.trim()}"`,
        dealId: dealId
      });

      return {
        success: true,
        status: 'rejected',
        dealId,
        rejectionReason: rejectionReason.trim()
      };
    }

    // ----------------- ACTION: APPROVE or EDIT -----------------
    let targetImei = deal.imei_serial;
    let targetFinalPrice = deal.final_price;
    let targetCustomerName = deal.customer_name;
    let targetCustomerPhone = deal.customer_phone;
    let targetStoreUuid = deal.store_id;

    if (normAction === 'edit' && edits) {
      if (edits.imeiSerial) targetImei = edits.imeiSerial;
      if (edits.finalPrice !== undefined) targetFinalPrice = Number(edits.finalPrice);
      if (edits.customerName) targetCustomerName = edits.customerName;
      if (edits.customerPhone) targetCustomerPhone = edits.customerPhone;
    }

    // Stock & IMEI verification (Double-selling prevention)
    const isSerializedPhone = targetImei &&
      targetImei.length >= 6 &&
      !['none', 'na', 'n/a', 'dummy'].includes(targetImei.toLowerCase());

    if (isSerializedPhone) {
      const { data: imeiRecord } = await this.db
        .from('imei_stock')
        .select('*')
        .eq('imei1', targetImei.trim())
        .maybeSingle();

      if (imeiRecord) {
        if (imeiRecord.status === 'sold' && imeiRecord.sold_invoice_id !== dealId) {
          throw new Error(`Double-selling error: IMEI ${targetImei} is already sold`);
        }

        // Auto-deduct IMEI
        await this.db
          .from('imei_stock')
          .update({
            status: 'sold',
            sold_at: nowIso,
            sold_invoice_id: dealId,
            updated_at: nowIso
          })
          .eq('imei1', targetImei.trim());
      }
    } else {
      // General inventory auto-deduction (e.g. Accessories)
      const { data: invItem } = await this.db
        .from('store_inventory')
        .select('*')
        .eq('store_id', targetStoreUuid)
        .eq('product_name', deal.product_name)
        .maybeSingle();

      if (invItem && invItem.quantity > 0) {
        await this.db
          .from('store_inventory')
          .update({
            quantity: invItem.quantity - 1,
            updated_at: nowIso
          })
          .eq('id', invItem.id);
      }
    }

    // Device Exchange Ingestion Contract
    if (deal.has_device_exchange && (deal.device_exchange_amount > 0 || deal.device_name)) {
      const valuation = Number(deal.device_exchange_amount || 0);
      const resalePrice = Math.round(valuation * 1.25);
      const exchangeImei = deal.device_imei || `EX-${Date.now()}`;

      await this.db
        .from('device_exchanges')
        .insert({
          sale_approval_id: dealId,
          store_id: targetStoreUuid,
          device_name: deal.device_name || 'Old Exchange Phone',
          device_imei: exchangeImei,
          device_condition: deal.device_condition || 'Good',
          valuation_amount: valuation,
          received_from_customer: targetCustomerName,
          customer_phone: targetCustomerPhone,
          status: 'in_stock',
          resale_price: resalePrice,
          created_at: nowIso,
          updated_at: nowIso
        });
    }

    // Customer CRM Aggregation (Single-counting spend integrity)
    const cleanCustPhone = (targetCustomerPhone || '').replace(/\D/g, '').slice(-10);
    if (cleanCustPhone && cleanCustPhone !== '0000000000') {
      const { data: existingCust } = await this.db
        .from('customers')
        .select('*')
        .eq('phone', cleanCustPhone)
        .maybeSingle();

      const amountToCount = Number(targetFinalPrice) || 0;

      if (existingCust) {
        await this.db
          .from('customers')
          .update({
            name: targetCustomerName || existingCust.name,
            total_spent: (Number(existingCust.total_spent) || 0) + amountToCount,
            purchase_count: (Number(existingCust.purchase_count) || 0) + 1,
            last_purchase_date: nowIso,
            updated_at: nowIso
          })
          .eq('id', existingCust.id);
      } else {
        await this.db
          .from('customers')
          .insert({
            name: targetCustomerName || 'Customer',
            phone: cleanCustPhone,
            primary_store_id: UUID_TO_STORE_CODE[targetStoreUuid] || 'DM-01',
            total_spent: amountToCount,
            purchase_count: 1,
            credit_balance: 0,
            first_seen: nowIso,
            last_purchase_date: nowIso
          });
      }
    }

    // Update sales_approval record
    const updatePayload = {
      status: 'approved',
      approved_by_name: decidedBy || 'Store Manager',
      approved_at: nowIso,
      rejection_reason: null,
      updated_at: nowIso
    };

    if (normAction === 'edit' && edits) {
      if (edits.finalPrice !== undefined) updatePayload.final_price = Number(edits.finalPrice);
      if (edits.imeiSerial) updatePayload.imei_serial = edits.imeiSerial;
      if (edits.paymentMethod) updatePayload.payment_method = edits.paymentMethod;
      if (edits.cashAmount !== undefined) updatePayload.cash_amount = Number(edits.cashAmount);
      if (edits.upiAmount !== undefined) updatePayload.upi_amount = Number(edits.upiAmount);
      if (edits.cardAmount !== undefined) updatePayload.card_amount = Number(edits.cardAmount);
    }

    const { data: updatedDeal } = await this.db
      .from('sales_approvals')
      .update(updatePayload)
      .eq('id', dealId);

    // Targeted notification strictly to deal's submitting salesman
    this.notificationsSent.push({
      type: 'deal_approved',
      targetPhone: deal.sales_person_phone,
      salesmanName: deal.sales_person_name,
      title: `🎉 Deal Approved • ${deal.product_name}`,
      body: `Approved by ${decidedBy || 'Store Manager'}. Bill ready!`,
      dealId: dealId
    });

    return {
      success: true,
      status: 'approved',
      dealId,
      deal: updatedDeal
    };
  }

  /**
   * Contract 3: Tally ERP Sync Marker Persistence (/api/deals/tally)
   * Contract: Writes Tally sync marker in dedicated marker/column without corrupting product barcode.
   */
  async toggleTallySync({ dealId, isUploaded, userName }) {
    if (!dealId) throw new Error('dealId is required');

    const cleanId = String(dealId).trim();
    const { data: deal } = await this.db
      .from('sales_approvals')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    if (!deal) throw new Error(`Deal ${dealId} not found`);

    const originalBarcode = deal.barcode; // Barcode must NOT be corrupted

    const tallyMarker = isUploaded 
      ? `TALLY_UPLOADED:${new Date().toISOString()}:${userName || 'Admin'}` 
      : null;

    const { data: updated } = await this.db
      .from('sales_approvals')
      .update({
        is_tally_uploaded: Boolean(isUploaded),
        tally_uploaded_at: isUploaded ? new Date().toISOString() : null,
        tally_uploaded_by: isUploaded ? (userName || 'Admin') : null,
        tally_marker: tallyMarker,
        // barcode remains intact
        barcode: originalBarcode,
        updated_at: new Date().toISOString()
      })
      .eq('id', cleanId);

    const updatedDeal = Array.isArray(updated) ? updated[0] : updated;

    return {
      success: true,
      isUploaded: Boolean(isUploaded),
      deal: updatedDeal,
      preservedBarcode: originalBarcode
    };
  }

  /**
   * Contract 4: Cash Register Balance Calculation
   * Formula:
   * totalCollected = cashTotal + upiTotal + cardTotal + disbursement + exchange
   * adjustedCash = (!isEmi && totalCollected === 0) ? d.finalPrice : cashTotal
   */
  calculateRegisterMetrics(deals = [], dateFilterStr = null) {
    let filtered = deals;
    if (dateFilterStr) {
      filtered = deals.filter(d => {
        const dDate = new Date(d.approved_at || d.created_at || d.submittedAt);
        const istDateStr = dDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return istDateStr === dateFilterStr;
      });
    }

    let totalSales = 0;
    let totalCash = 0;
    let totalUpi = 0;
    let totalCard = 0;
    let totalFinance = 0;
    let totalExchange = 0;

    for (const d of filtered) {
      const isEmi = d.payment_method === 'EMI' || d.paymentMethod === 'EMI';
      const cashAmount = Number(isEmi ? (d.down_payment_cash || d.downPaymentCash || 0) : (d.cash_amount || d.cashAmount || 0));
      const upiAmount = Number(isEmi ? (d.down_payment_upi || d.downPaymentUpi || 0) : (d.upi_amount || d.upiAmount || 0));
      const cardAmount = Number(isEmi ? (d.down_payment_card || d.downPaymentCard || 0) : (d.card_amount || d.cardAmount || 0));
      const disbursement = Number(isEmi ? (d.disbursement_amount || d.disbursementAmount || 0) : 0);
      const exchange = Number(d.device_exchange_amount || d.exchangeValue || 0);
      const finalPrice = Number(d.final_price || d.finalPrice || 0);

      const totalCollected = cashAmount + upiAmount + cardAmount + disbursement + exchange;
      const adjustedCash = (!isEmi && totalCollected === 0) ? finalPrice : cashAmount;

      totalSales += finalPrice;
      totalCash += adjustedCash;
      totalUpi += upiAmount;
      totalCard += cardAmount;
      totalFinance += disbursement;
      totalExchange += exchange;
    }

    return {
      recordCount: filtered.length,
      totalSales,
      totalCash,
      totalUpi,
      totalCard,
      totalFinance,
      totalExchange,
      totalReconciled: totalCash + totalUpi + totalCard + totalFinance + totalExchange
    };
  }

  /**
   * Contract 5: GST Invoice Tax Calculation
   */
  calculateGstInvoice({ rateInclTax, gstRate = 0.18 }) {
    const rate = Number(rateInclTax || 0);
    const taxableValue = +(rate / (1 + gstRate)).toFixed(2);
    const totalTax = +(rate - taxableValue).toFixed(2);
    const cgst = +(totalTax / 2).toFixed(2);
    const sgst = cgst;
    const roundOff = +(rate - (taxableValue + totalTax)).toFixed(2);

    return {
      rateInclTax: rate,
      taxableValue,
      cgst,
      sgst,
      totalTax,
      roundOff,
      isBalanced: Math.abs((taxableValue + cgst + sgst + roundOff) - rate) < 0.05
    };
  }

  /**
   * Safe String Property Evaluation Helper
   * Safely formats token/id without raising TypeError
   */
  safeTokenString(record) {
    if (!record) return '';
    const raw = record.token || record.id || '';
    if (typeof raw !== 'string') {
      return String(raw).replace('SA-', '');
    }
    return raw.replace('SA-', '');
  }

  /**
   * Null-Safe Filter Search Helper
   */
  safeFilterDeals(deals = [], query = '') {
    if (!query || typeof query !== 'string') return deals;
    const q = query.toLowerCase().trim();
    return deals.filter(item => {
      if (!item) return false;
      const custName = (item.customer_name || item.customerName || '').toLowerCase();
      const prodName = (item.product_name || item.productName || '').toLowerCase();
      const phone = (item.customer_phone || item.customerPhone || '');
      const imei = (item.imei_serial || item.imeiSerial || '');
      return custName.includes(q) || prodName.includes(q) || phone.includes(q) || imei.includes(q);
    });
  }

  /**
   * Role-Aware Navigation Tabs Resolver
   */
  resolveBottomNavTabs(userRole) {
    const role = String(userRole || '').toLowerCase().trim();
    if (role === 'salesman' || role === 'sales_executive') {
      return [
        { label: 'POS Desk', path: '/pos' },
        { label: 'Approvals', path: '/pos/approvals' },
        { label: 'History', path: '/salesman/history' },
        { label: 'Leads', path: '/salesman/leads' }
      ];
    }
    if (role === 'store_admin') {
      return [
        { label: 'Dashboard', path: '/admin/store' },
        { label: 'Approvals', path: '/admin/store/deals' },
        { label: 'Inventory', path: '/admin/store/inventory' },
        { label: 'Register', path: '/admin/store/register' }
      ];
    }
    if (role === 'super_admin') {
      return [
        { label: 'HQ Overview', path: '/admin/super' },
        { label: 'Approvals Desk', path: '/admin/super/approvals' },
        { label: 'Consolidated Register', path: '/admin/super/register' },
        { label: 'Staff Master', path: '/admin/super/staff' }
      ];
    }
    return [
      { label: 'Login', path: '/login' }
    ];
  }
}

// Convert Number to Indian Words
function numberToIndianWords(num) {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(num);
  if (n === 0) return 'INR Zero Only';

  function inWords(nStr) {
    if (nStr.length > 9) return 'overflow';
    const match = ('000000000' + nStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return '';
    let str = '';
    str += Number(match[1]) !== 0 ? (a[Number(match[1])] || b[match[1][0]] + ' ' + a[match[1][1]]) + 'Crore ' : '';
    str += Number(match[2]) !== 0 ? (a[Number(match[2])] || b[match[2][0]] + ' ' + a[match[2][1]]) + 'Lakh ' : '';
    str += Number(match[3]) !== 0 ? (a[Number(match[3])] || b[match[3][0]] + ' ' + a[match[3][1]]) + 'Thousand ' : '';
    str += Number(match[4]) !== 0 ? (a[Number(match[4])] || b[match[4][0]] + ' ' + a[match[4][1]]) + 'Hundred ' : '';
    str += Number(match[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(match[5])] || b[match[5][0]] + ' ' + a[match[5][1]]) : '';
    return str.trim();
  }

  const integerWords = inWords(n.toString());
  const paise = Math.round((num - n) * 100);
  let paiseWords = '';
  if (paise > 0) {
    paiseWords = ` and ${inWords(paise.toString())} Paise`;
  }

  return `INR ${integerWords}${paiseWords} Only`;
}

module.exports = {
  SimulatedApi,
  numberToIndianWords,
  STORE_CODE_TO_UUID,
  UUID_TO_STORE_CODE
};
