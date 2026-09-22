/**
 * Tier 1 - Feature 20: E2E Testing Suite Construction
 * Verifies that the E2E test harness, assertion utilities, lifecycle hooks,
 * and test runner execution mechanics function reliably.
 */

const { describe, it, assert, assertEqual, assertThrows, TestHarness } = require('../helpers/test-harness');

describe('Tier 1 - Feature 20: E2E Testing Suite Construction', () => {
  it('F20-T1: TestHarness instantiates cleanly with empty suites and initial zero stats', () => {
    const harness = new TestHarness();
    assertEqual(harness.suites.length, 0);
    assertEqual(harness.stats.total, 0);
    assertEqual(harness.stats.passed, 0);
    assertEqual(harness.stats.failed, 0);
  });

  it('F20-T2: TestHarness executes synchronous and asynchronous test functions and updates pass stats', async () => {
    const harness = new TestHarness();
    harness.describe('Sample Suite', () => {
      harness.it('Sync test', () => {
        harness.assertEqual(1 + 1, 2);
      });
      harness.it('Async test', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        harness.assert(true);
      });
    });

    const summary = await harness.run({ verbose: false });
    assertEqual(summary.total, 2);
    assertEqual(summary.passed, 2);
    assertEqual(summary.failed, 0);
    assertEqual(summary.success, true);
  });

  it('F20-T3: TestHarness captures failing assertions and records failure context', async () => {
    const harness = new TestHarness();
    harness.describe('Failing Suite', () => {
      harness.it('Intentional failure', () => {
        harness.assertEqual(1, 2, 'Numbers do not match');
      });
    });

    const summary = await harness.run({ verbose: false });
    assertEqual(summary.total, 1);
    assertEqual(summary.passed, 0);
    assertEqual(summary.failed, 1);
    assertEqual(summary.success, false);
    assertEqual(harness.failures.length, 1);
    assert(harness.failures[0].error.message.includes('Numbers do not match'));
  });

  it('F20-T4: TestHarness supports skip() to omit inactive tests from execution', async () => {
    const harness = new TestHarness();
    harness.describe('Skipped Suite', () => {
      harness.it('Active test', () => {
        harness.assert(true);
      });
      harness.skip('Skipped test', () => {
        throw new Error('Should not run');
      });
    });

    const summary = await harness.run({ verbose: false });
    assertEqual(summary.total, 2);
    assertEqual(summary.passed, 1);
    assertEqual(summary.skipped, 1);
    assertEqual(summary.failed, 0);
    assertEqual(summary.success, true);
  });

  it('F20-T5: TestHarness lifecycle hooks (beforeEach, afterEach) execute before and after each test', async () => {
    const harness = new TestHarness();
    let counter = 0;

    harness.describe('Lifecycle Suite', () => {
      harness.beforeEach(() => {
        counter += 10;
      });
      harness.afterEach(() => {
        counter += 1;
      });

      harness.it('Test 1', () => {
        harness.assertEqual(counter, 10);
      });
      harness.it('Test 2', () => {
        // beforeEach ran twice (+10, +10), afterEach ran once (+1) = 21
        harness.assertEqual(counter, 21);
      });
    });

    const summary = await harness.run({ verbose: false });
    assertEqual(summary.success, true);
    // After test 2 afterEach ran: 21 + 1 = 22
    assertEqual(counter, 22);
  });
});
