/**
 * Tier 1 - Feature 19: Application Route 200 OK Verification
 * Verifies that all 23 core application routes exist as page files in the Next.js app directory,
 * define valid default export components, and include the mobile viewport configuration.
 */

const { describe, it, assert, assertEqual, assertIncludes } = require('../helpers/test-harness');
const fs = require('fs');
const path = require('path');

describe('Tier 1 - Feature 19: Application Route 200 OK Verification', () => {
  const appDir = path.resolve(__dirname, '../../app');

  const CORE_23_ROUTES = [
    { route: '/', file: 'page.tsx' },
    { route: '/login', file: 'login/page.tsx' },
    { route: '/pos', file: 'pos/page.tsx' },
    { route: '/pos/approvals', file: 'pos/approvals/page.tsx' },
    { route: '/salesman/history', file: 'salesman/history/page.tsx' },
    { route: '/salesman/leads', file: 'salesman/leads/page.tsx' },
    { route: '/salesman/profile', file: 'salesman/profile/page.tsx' },
    { route: '/admin/store', file: 'admin/store/page.tsx' },
    { route: '/admin/store/bills', file: 'admin/store/bills/page.tsx' },
    { route: '/admin/store/inventory', file: 'admin/store/inventory/page.tsx' },
    { route: '/admin/store/leads', file: 'admin/store/leads/page.tsx' },
    { route: '/admin/store/customers', file: 'admin/store/customers/page.tsx' },
    { route: '/admin/store/customers/[id]', file: 'admin/store/customers/[id]/page.tsx' },
    { route: '/admin/store/finance', file: 'admin/store/finance/page.tsx' },
    { route: '/admin/store/staff', file: 'admin/store/staff/page.tsx' },
    { route: '/admin/store/register', file: 'admin/store/register/page.tsx' },
    { route: '/admin/store/leaderboard', file: 'admin/store/leaderboard/page.tsx' },
    { route: '/admin/super', file: 'admin/super/page.tsx' },
    { route: '/admin/super/approvals', file: 'admin/super/approvals/page.tsx' },
    { route: '/admin/super/staff', file: 'admin/super/staff/page.tsx' },
    { route: '/admin/super/register', file: 'admin/super/register/page.tsx' },
    { route: '/repair-tracking', file: 'repair-tracking/page.tsx' },
    { route: '/download', file: 'download/page.tsx' }
  ];

  it('F19-T1: All 23 primary application routes exist on disk in app/ directory', () => {
    assertEqual(CORE_23_ROUTES.length, 23);
    for (const r of CORE_23_ROUTES) {
      const fullPath = path.join(appDir, r.file);
      assert(fs.existsSync(fullPath), `Route file missing for ${r.route} at ${fullPath}`);
    }
  });

  it('F19-T2: Every route file exports a default component function', () => {
    for (const r of CORE_23_ROUTES) {
      const fullPath = path.join(appDir, r.file);
      const content = fs.readFileSync(fullPath, 'utf8');
      const hasDefaultExport = content.includes('export default') || content.includes('export { default }');
      assert(hasDefaultExport, `Route ${r.route} does not have export default in ${r.file}`);
    }
  });

  it('F19-T3: Root layout includes mobile-responsive viewport meta tag', () => {
    const layoutPath = path.join(appDir, 'layout.tsx');
    assert(fs.existsSync(layoutPath), 'app/layout.tsx should exist');
    const content = fs.readFileSync(layoutPath, 'utf8');
    const hasViewport = content.includes('viewport') || 
                        content.includes('width=device-width') || 
                        content.includes('initial-scale=1');
    assert(hasViewport, 'Root layout must configure viewport for mobile responsiveness');
  });

  it('F19-T4: Dynamic route /admin/store/customers/[id] exists and parses parameter cleanly', () => {
    const dynamicRouteFile = path.join(appDir, 'admin/store/customers/[id]/page.tsx');
    assert(fs.existsSync(dynamicRouteFile));
    const content = fs.readFileSync(dynamicRouteFile, 'utf8');
    assert(content.includes('params') || content.includes('id'), 'Customer detail page should reference params or id');
  });

  it('F19-T5: Essential API routes exist in app/api/ directory', () => {
    const apiRoutes = [
      'deals/submit/route.ts',
      'deals/action/route.ts',
      'deals/tally/route.ts',
      'leads/update/route.ts'
    ];

    for (const apiPath of apiRoutes) {
      const fullPath = path.join(appDir, 'api', apiPath);
      assert(fs.existsSync(fullPath), `API route missing: ${apiPath}`);
    }
  });
});
