/**
 * Tier 2 - Feature 20 Boundary: E2E Testing Suite Construction
 * Tests empty suites, async rejections with primitive values, assertThrows with regex, and suite isolation.
 */

const { describe, it, assert, assertEqual, assertThrows, TestHarness } = require('../helpers/test-harness');

describe('Tier 2 - Feature 20 Boundary: E2E Testing Suite Construction', () => {
  it('F20-B1: Empty suite block with zero tests executes cleanly without error', async () => {
    const harness = new TestHarness();
    harness.describe('Empty Block', () => {});
    const summary = await harness.run({ verbose: false });
    assertEqual(summary.total, 0);
    assertEqual(summary.passed, 0);
    assertEqual(summary.failed, 0);
  });

  it('F20-B2: assertThrows verifies matching against regex patterns', () => {
    const harness = new TestHarness();
    harness.assertThrows(() => {
      throw new Error('Database timeout after 5000ms');
    }, /timeout/i);
  });

  it('F20-B3: assertThrows throws error when target function does NOT throw', () => {
    const harness = new TestHarness();
    let caught = false;
    try {
      harness.assertThrows(() => {
        return 'I am successful';
      });
    } catch (e) {
      caught = true;
    }
    assertEqual(caught, true, 'assertThrows must fail when tested function succeeds');
  });

  it('F20-B4: Async test throwing non-Error object is recorded cleanly in failures', async () => {
    const harness = new TestHarness();
    harness.describe('String Throw', () => {
      harness.it('throws string', async () => {
        throw 'Custom string error';
      });
    });

    const summary = await harness.run({ verbose: false });
    assertEqual(summary.failed, 1);
    assertEqual(summary.success, false);
  });

  it('F20-B5: Resetting test harness clears all suites, stats, and failures', async () => {
    const harness = new TestHarness();
    harness.describe('Suite 1', () => {
      harness.it('Test 1', () => {});
    });
    await harness.run({ verbose: false });
    assertEqual(harness.stats.total, 1);

    harness.reset();
    assertEqual(harness.stats.total, 0);
    assertEqual(harness.suites.length, 0);
    assertEqual(harness.failures.length, 0);
  });
});
