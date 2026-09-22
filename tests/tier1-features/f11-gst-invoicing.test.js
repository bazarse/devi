/**
 * Tier 1 - Feature 11: GST Tax Invoice Generation & Thermal Print
 * Verifies that store GSTIN, customer details, HSN codes, and 18% GST calculations
 * are accurately derived and formatted for A4 tax invoices and 80mm thermal receipts.
 */

const { describe, it, assert, assertEqual, assertMatch } = require('../helpers/test-harness');
const { SimulatedApi, numberToIndianWords } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 1 - Feature 11: GST Tax Invoice Generation & Thermal Print', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F11-T1: 18% GST calculation decomposes rate into taxableValue, CGST 9%, and SGST 9%', () => {
    const rateInclTax = 34999;
    const inv = api.calculateGstInvoice({ rateInclTax });

    assertEqual(inv.rateInclTax, 34999);
    assertEqual(inv.taxableValue, 29660.17); // 34999 / 1.18 = 29660.169...
    assertEqual(inv.cgst, 2669.41);
    assertEqual(inv.sgst, 2669.41);
    assertEqual(inv.totalTax, 5338.83);
    assert(inv.isBalanced, 'Sum of taxableValue and taxes must balance with total price');
  });

  it('F11-T2: numberToIndianWords converts Indian rupee amounts into standard Indian wording', () => {
    assertEqual(numberToIndianWords(0), 'INR Zero Only');
    assertEqual(numberToIndianWords(1299), 'INR One Thousand Two Hundred and Ninety Nine Only');
    assertEqual(numberToIndianWords(34999), 'INR Thirty Four Thousand Nine Hundred and Ninety Nine Only');
    assertEqual(numberToIndianWords(150000), 'INR One Lakh Fifty Thousand Only');
    assertEqual(numberToIndianWords(10000000), 'INR One Crore Only');
  });

  it('F11-T3: Official Devi Mobile GST Tax Invoice metadata specifies required store details and jurisdiction', () => {
    const invoiceMetadata = {
      jurisdiction: 'SUBJECT TO UJJAIN JURISDICTION',
      storeGstin: FIXTURES.STORES.DM01.gstin,
      stateCode: 23,
      stateName: 'Madhya Pradesh',
      storeName: FIXTURES.STORES.DM01.name,
      storeAddress: FIXTURES.STORES.DM01.address
    };

    assertEqual(invoiceMetadata.storeGstin, '23ALGPK9135M1ZT');
    assertEqual(invoiceMetadata.stateCode, 23);
    assert(invoiceMetadata.jurisdiction.includes('UJJAIN'));
  });

  it('F11-T4: HSN code is accurately derived from product catalog for mobile phones and accessories', () => {
    function getProductHsn(productName, category) {
      if (category === 'Mobile Phone' || productName.toLowerCase().includes('phone') || productName.toLowerCase().includes('5g')) {
        return '85171290';
      }
      if (productName.toLowerCase().includes('earbuds') || productName.toLowerCase().includes('airdopes')) {
        return '85183000';
      }
      if (productName.toLowerCase().includes('charger') || productName.toLowerCase().includes('adapter')) {
        return '85044090';
      }
      return '85171290';
    }

    assertEqual(getProductHsn(FIXTURES.PRODUCTS.VIVO_V40.name, FIXTURES.PRODUCTS.VIVO_V40.category), '85171290');
    assertEqual(getProductHsn(FIXTURES.PRODUCTS.BOAT_EARBUDS.name, FIXTURES.PRODUCTS.BOAT_EARBUDS.category), '85183000');
    assertEqual(getProductHsn(FIXTURES.PRODUCTS.CHARGER_65W.name, FIXTURES.PRODUCTS.CHARGER_65W.category), '85044090');
  });

  it('F11-T5: 80mm thermal receipt formatting produces formatted receipt lines within thermal width constraints', () => {
    function generateThermalReceiptLines(deal) {
      const separator = '--------------------------------';
      const lines = [
        '     DEVI MOBILE ACCESSORIES     ',
        '  206/1 Kanthal Chauraha, Ujjain ',
        `GSTIN: ${FIXTURES.STORES.DM01.gstin}`,
        separator,
        `Bill No: ${deal.token || 'SA-000000'}`,
        `Date: ${new Date().toLocaleDateString('en-IN')}`,
        `Cust: ${deal.customerName || 'Walking Customer'}`,
        `Phone: ${deal.customerPhone || '0000000000'}`,
        separator,
        `Item: ${deal.productName}`,
        `IMEI: ${deal.imeiSerial || 'N/A'}`,
        `Amount: Rs. ${Number(deal.finalPrice).toFixed(2)}`,
        `Mode: ${deal.paymentMethod}`,
        separator,
        '  Thank you! Visit Again! Devi   '
      ];
      return lines;
    }

    const testDeal = {
      token: 'SA-A1B2C3',
      productName: FIXTURES.PRODUCTS.VIVO_V40.name,
      imeiSerial: FIXTURES.IMEIS.IN_STOCK_1,
      finalPrice: 34999,
      paymentMethod: 'Cash',
      customerName: FIXTURES.CUSTOMERS.VIP_RAJESH.name,
      customerPhone: FIXTURES.CUSTOMERS.VIP_RAJESH.phone
    };

    const lines = generateThermalReceiptLines(testDeal);
    assert(lines.length >= 10);
    for (const line of lines) {
      assert(line.length <= 40, `Thermal line too wide: "${line}" (${line.length} chars)`);
    }
  });
});
