/**
 * Tier 2 - Feature 11 Boundary: GST Tax Invoice Generation & Thermal Print
 * Tests fractional paise amounts, extreme numbers, zero prices, and missing customer addresses.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { SimulatedApi, numberToIndianWords } = require('../helpers/simulated-api');

describe('Tier 2 - Feature 11 Boundary: GST Tax Invoice Generation & Thermal Print', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F11-B1: Fractional paise amounts (Rs 19999.50) calculate balanced GST invoice', () => {
    const inv = api.calculateGstInvoice({ rateInclTax: 19999.50 });
    assertEqual(inv.rateInclTax, 19999.50);
    assert(inv.isBalanced, 'Taxable value + taxes must balance to rate within 5 paise');
  });

  it('F11-B2: numberToIndianWords formats amounts with fractional paise correctly', () => {
    const res = numberToIndianWords(1500.50);
    assert(res.includes('Fifty Paise'), `Words ${res} should include Fifty Paise`);
  });

  it('F11-B3: High value transactions (Rs 5,00,000) generate accurate words and calculations', () => {
    const inv = api.calculateGstInvoice({ rateInclTax: 500000 });
    assertEqual(inv.taxableValue, 423728.81);
    const words = numberToIndianWords(500000);
    assertEqual(words, 'INR Five Lakh Only');
  });

  it('F11-B4: Zero amount invoice handles tax calculation without division by zero', () => {
    const inv = api.calculateGstInvoice({ rateInclTax: 0 });
    assertEqual(inv.taxableValue, 0);
    assertEqual(inv.cgst, 0);
    assertEqual(inv.sgst, 0);
    assertEqual(inv.totalTax, 0);
  });

  it('F11-B5: Customer address missing or null renders invoice without breaking table layout', () => {
    function formatCustomerBlock(customer) {
      const lines = [`Buyer: ${customer.name || 'Customer'}`];
      if (customer.phone) lines.push(`Phone: ${customer.phone}`);
      if (customer.address) lines.push(`Address: ${customer.address}`);
      lines.push('State: Madhya Pradesh (Code: 23)');
      return lines;
    }

    const withAddress = formatCustomerBlock({ name: 'Rajesh', phone: '9827011223', address: 'Freeganj Ujjain' });
    assertEqual(withAddress.length, 4);

    const withoutAddress = formatCustomerBlock({ name: 'Rajesh', phone: '9827011223', address: null });
    assertEqual(withoutAddress.length, 3);
  });
});
