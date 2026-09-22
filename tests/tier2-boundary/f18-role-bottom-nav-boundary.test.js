/**
 * Tier 2 - Feature 18 Boundary: Role-Aware Mobile Bottom Navigation
 * Tests role string whitespace trimming, non-string roles, case permutations, and empty strings.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 2 - Feature 18 Boundary: Role-Aware Mobile Bottom Navigation', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F18-B1: Role with extra whitespace "   salesman   " resolves to salesman tabs', () => {
    const tabs = api.resolveBottomNavTabs('   salesman   ');
    assertEqual(tabs.length, 4);
    assertEqual(tabs[0].path, '/pos');
  });

  it('F18-B2: Alternating case "sToRe_AdMiN" resolves to store admin tabs', () => {
    const tabs = api.resolveBottomNavTabs('sToRe_AdMiN');
    assertEqual(tabs.length, 4);
    assertEqual(tabs[0].path, '/admin/store');
  });

  it('F18-B3: Empty string role "" falls back safely to login tab', () => {
    const tabs = api.resolveBottomNavTabs('');
    assertEqual(tabs.length, 1);
    assertEqual(tabs[0].path, '/login');
  });

  it('F18-B4: Numeric role input 12345 handles gracefully without crash', () => {
    const tabs = api.resolveBottomNavTabs(12345);
    assertEqual(tabs.length, 1);
    assertEqual(tabs[0].path, '/login');
  });

  it('F18-B5: Role with special symbols "salesman#pos!" falls back to login tab', () => {
    const tabs = api.resolveBottomNavTabs('salesman#pos!');
    assertEqual(tabs.length, 1);
    assertEqual(tabs[0].path, '/login');
  });
});
