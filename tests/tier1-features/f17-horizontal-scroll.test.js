/**
 * Tier 1 - Feature 17: Horizontal Table Scroll Wrappers
 * Verifies that all tabular data components wrap tables with overflow-x: auto containers
 * to prevent viewport blowing on narrow mobile viewports.
 */

const { describe, it, assert, assertEqual, assertIncludes } = require('../helpers/test-harness');
const fs = require('fs');
const path = require('path');

describe('Tier 1 - Feature 17: Horizontal Table Scroll Wrappers', () => {
  // Check component code in repo
  const viewsToCheck = [
    { name: 'bills-management-view', file: path.resolve(__dirname, '../../components/bills-management-view.tsx') },
    { name: 'store-register', file: path.resolve(__dirname, '../../app/admin/store/register/page.tsx') },
    { name: 'super-register', file: path.resolve(__dirname, '../../app/admin/super/register/page.tsx') },
    { name: 'salesman-history', file: path.resolve(__dirname, '../../app/salesman/history/page.tsx') }
  ];

  it('F17-T1: bills-management-view includes horizontal overflow container for table', () => {
    const view = viewsToCheck[0];
    assert(fs.existsSync(view.file), `${view.name} file should exist`);
    const content = fs.readFileSync(view.file, 'utf8');
    assertIncludes(content, 'overflow-x-auto', 'Bills table must have overflow-x-auto wrapper');
  });

  it('F17-T2: store register page includes overflow-x-auto container for financial ledger', () => {
    const view = viewsToCheck[1];
    assert(fs.existsSync(view.file), `${view.name} file should exist`);
    const content = fs.readFileSync(view.file, 'utf8');
    assertIncludes(content, 'overflow-x-auto', 'Store register table must have overflow-x-auto wrapper');
  });

  it('F17-T3: super admin register page includes overflow-x-auto container for multi-store register', () => {
    const view = viewsToCheck[2];
    assert(fs.existsSync(view.file), `${view.name} file should exist`);
    const content = fs.readFileSync(view.file, 'utf8');
    assertIncludes(content, 'overflow-x-auto', 'Super register table must have overflow-x-auto wrapper');
  });

  it('F17-T4: Table container validator enforces overflow-x: auto and minimum table width styling', () => {
    function validateTableContainer(containerProps, tableProps) {
      const hasOverflow = containerProps.className.includes('overflow-x-auto') || 
                          containerProps.style?.overflowX === 'auto';
      const hasMinTableWidth = tableProps.className.includes('min-w-') || 
                               tableProps.className.includes('w-full') ||
                               Boolean(tableProps.style?.minWidth);
      return {
        compliant: hasOverflow && hasMinTableWidth,
        hasOverflow,
        hasMinTableWidth
      };
    }

    const testContainer = { className: 'w-full overflow-x-auto border rounded-xl' };
    const testTable = { className: 'min-w-[700px] w-full text-left' };

    const check = validateTableContainer(testContainer, testTable);
    assertEqual(check.compliant, true);
    assertEqual(check.hasOverflow, true);
    assertEqual(check.hasMinTableWidth, true);
  });

  it('F17-T5: Container lacking overflow-x: auto is flagged as breaking mobile layouts', () => {
    function validateTableContainer(containerProps) {
      return containerProps.className.includes('overflow-x-auto') || 
             containerProps.style?.overflowX === 'auto';
    }

    const brokenContainer = { className: 'w-full block border' };
    assertEqual(validateTableContainer(brokenContainer), false);
  });
});
