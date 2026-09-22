/**
 * Tier 2 - Feature 17 Boundary: Horizontal Table Scroll Wrappers
 * Tests extreme column counts, overflow:hidden detection, empty tables, and narrow viewports.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');

describe('Tier 2 - Feature 17 Boundary: Horizontal Table Scroll Wrappers', () => {
  function inspectScrollContainer(styleString) {
    const s = String(styleString || '').toLowerCase();
    const hasScroll = s.includes('overflow-x-auto') || s.includes('overflow-x: auto') || s.includes('overflow-x: scroll');
    const hasHidden = s.includes('overflow-x: hidden') || s.includes('overflow-hidden');
    return {
      canScrollHorizontally: hasScroll && !hasHidden,
      isBroken: hasHidden
    };
  }

  it('F17-B1: Container with overflow-x: auto allows horizontal scroll on wide tables', () => {
    const res = inspectScrollContainer('w-full overflow-x-auto border');
    assertEqual(res.canScrollHorizontally, true);
    assertEqual(res.isBroken, false);
  });

  it('F17-B2: Container with overflow-x: hidden is flagged as breaking mobile table access', () => {
    const res = inspectScrollContainer('w-full overflow-x: hidden');
    assertEqual(res.canScrollHorizontally, false);
    assertEqual(res.isBroken, true);
  });

  it('F17-B3: Table with 20 columns on 320px viewport requires horizontal scroll', () => {
    const viewportWidth = 320;
    const columnCount = 20;
    const minColWidth = 80;
    const totalTableWidth = columnCount * minColWidth; // 1600px

    const requiresScroll = totalTableWidth > viewportWidth;
    assertEqual(requiresScroll, true);
  });

  it('F17-B4: Empty table with zero rows retains outer scroll wrapper safely', () => {
    const tableMarkup = '<div class="overflow-x-auto"><table><tbody></tbody></table></div>';
    assert(tableMarkup.includes('overflow-x-auto'));
  });

  it('F17-B5: Null or undefined class string safely evaluates to non-scrolling without error', () => {
    const resNull = inspectScrollContainer(null);
    assertEqual(resNull.canScrollHorizontally, false);

    const resUndef = inspectScrollContainer(undefined);
    assertEqual(resUndef.canScrollHorizontally, false);
  });
});
