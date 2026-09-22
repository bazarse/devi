/**
 * Tier 1 - Feature 18: Role-Aware Mobile Bottom Navigation
 * Verifies that the mobile bottom navigation bar renders role-specific items dynamically
 * based on authenticated user credentials (salesman vs store_admin vs super_admin).
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 1 - Feature 18: Role-Aware Mobile Bottom Navigation', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F18-T1: Salesman role renders POS, Approvals, History, and Leads navigation tabs', () => {
    const tabs = api.resolveBottomNavTabs('salesman');
    assertEqual(tabs.length, 4);
    assertEqual(tabs[0].path, '/pos');
    assertEqual(tabs[1].path, '/pos/approvals');
    assertEqual(tabs[2].path, '/salesman/history');
    assertEqual(tabs[3].path, '/salesman/leads');
  });

  it('F18-T2: Store Admin role renders Dashboard, Approvals, Inventory, and Register tabs', () => {
    const tabs = api.resolveBottomNavTabs('store_admin');
    assertEqual(tabs.length, 4);
    assertEqual(tabs[0].path, '/admin/store');
    assertEqual(tabs[1].path, '/admin/store/deals');
    assertEqual(tabs[2].path, '/admin/store/inventory');
    assertEqual(tabs[3].path, '/admin/store/register');
  });

  it('F18-T3: Super Admin role renders HQ Overview, Multi-store Approvals, Consolidated Register, and Staff', () => {
    const tabs = api.resolveBottomNavTabs('super_admin');
    assertEqual(tabs.length, 4);
    assertEqual(tabs[0].path, '/admin/super');
    assertEqual(tabs[1].path, '/admin/super/approvals');
    assertEqual(tabs[2].path, '/admin/super/register');
    assertEqual(tabs[3].path, '/admin/super/staff');
  });

  it('F18-T4: Case-insensitivity and alias "sales_executive" resolve correctly to salesman tabs', () => {
    const aliasTabs = api.resolveBottomNavTabs('sales_executive');
    assertEqual(aliasTabs[0].path, '/pos');

    const upperTabs = api.resolveBottomNavTabs('STORE_ADMIN');
    assertEqual(upperTabs[0].path, '/admin/store');
  });

  it('F18-T5: Unknown or unauthenticated role defaults safely to login navigation tab', () => {
    const anonTabs = api.resolveBottomNavTabs(null);
    assertEqual(anonTabs.length, 1);
    assertEqual(anonTabs[0].path, '/login');

    const unknownTabs = api.resolveBottomNavTabs('guest');
    assertEqual(unknownTabs.length, 1);
    assertEqual(unknownTabs[0].path, '/login');
  });
});
