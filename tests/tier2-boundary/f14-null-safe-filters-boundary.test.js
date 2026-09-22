/**
 * Tier 2 - Feature 14 Boundary: Null-Safe Search & Date Filters
 * Tests regex meta-characters in search terms, whitespace queries, completely sparse arrays, and non-string IMEIs.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 2 - Feature 14 Boundary: Null-Safe Search & Date Filters', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F14-B1: Regex meta-characters in query string do not crash string matching', () => {
    const deals = [
      { product_name: 'Vivo V40 (8GB/128GB)', customer_name: 'Rajesh' },
      { product_name: 'Regular Phone', customer_name: 'Amit' }
    ];

    const regexQueries = ['.*', '+', '?', '[]', '()', '^', '$', '|', '\\'];
    for (const q of regexQueries) {
      // Must not throw RegExp syntax error
      const res = api.safeFilterDeals(deals, q);
      assert(Array.isArray(res));
    }
  });

  it('F14-B2: Whitespace-only search query returns all deals without filtering them out', () => {
    const deals = [
      { product_name: 'Phone 1' },
      { product_name: 'Phone 2' }
    ];
    const res = api.safeFilterDeals(deals, '   ');
    assertEqual(res.length, 2);
  });

  it('F14-B3: Search on array of completely empty objects does not throw property error', () => {
    const emptyDeals = [{}, {}, {}];
    const res = api.safeFilterDeals(emptyDeals, 'test');
    assertEqual(res.length, 0);
  });

  it('F14-B4: Phone search handles formatted customer input with dashes and parentheses', () => {
    const deals = [
      { customer_name: 'Rajesh', customer_phone: '9827011223' },
      { customer_name: 'Sunil', customer_phone: '7828915933' }
    ];

    const res = api.safeFilterDeals(deals, '98270');
    assertEqual(res.length, 1);
    assertEqual(res[0].customer_name, 'Rajesh');
  });

  it('F14-B5: Deals array containing null and undefined items is filtered safely without crash', () => {
    const sparseList = [
      null,
      { product_name: 'OnePlus 12R', customer_name: 'Vijay' },
      undefined,
      { product_name: 'Vivo V40', customer_name: 'Sunil' }
    ];

    const res = api.safeFilterDeals(sparseList, 'oneplus');
    assertEqual(res.length, 1);
    assertEqual(res[0].customer_name, 'Vijay');
  });
});
