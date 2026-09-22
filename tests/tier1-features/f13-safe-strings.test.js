/**
 * Tier 1 - Feature 13: Safe String Property Evaluation
 * Verifies that token and string transformations handle null, undefined,
 * or sparse records without throwing TypeError.
 */

const { describe, it, assert, assertEqual, assertNotEqual } = require('../helpers/test-harness');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 1 - Feature 13: Safe String Property Evaluation', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F13-T1: Standard token string SA-ABC123 is stripped cleanly to ABC123', () => {
    const record = { token: 'SA-ABC123', id: 'uuid-123' };
    const res = api.safeTokenString(record);
    assertEqual(res, 'ABC123');
  });

  it('F13-T2: Null token falls back safely to id string', () => {
    const record = { token: null, id: 'SA-DEF456' };
    const res = api.safeTokenString(record);
    assertEqual(res, 'DEF456');
  });

  it('F13-T3: Both token and id null or undefined returns empty string without TypeError', () => {
    const sparseRecord = { token: null, id: null };
    const res = api.safeTokenString(sparseRecord);
    assertEqual(res, '');

    const undefinedRecord = {};
    const res2 = api.safeTokenString(undefinedRecord);
    assertEqual(res2, '');

    const nullRecord = null;
    const res3 = api.safeTokenString(nullRecord);
    assertEqual(res3, '');
  });

  it('F13-T4: Non-string identifier converts safely without crash', () => {
    const numRecord = { token: 123456 };
    const res = api.safeTokenString(numRecord);
    assertEqual(res, '123456');
  });

  it('F13-T5: Safe string evaluations across multiple sparse deal records process without exceptions', () => {
    const sparseDeals = [
      { id: 'SA-111111' },
      { token: 'SA-222222' },
      { token: null, id: null },
      {},
      { token: 'SA-555555', id: '555555' }
    ];

    const extracted = sparseDeals.map(d => api.safeTokenString(d));
    assertEqual(extracted.length, 5);
    assertEqual(extracted[0], '111111');
    assertEqual(extracted[1], '222222');
    assertEqual(extracted[2], '');
    assertEqual(extracted[3], '');
    assertEqual(extracted[4], '555555');
  });
});
