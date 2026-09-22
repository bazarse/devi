/**
 * Devi Mobile POS - Unified E2E Test Harness
 * Pure Node.js zero-dependency test runner with rich assertions and reporting.
 */

class TestHarness {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: 0,
      endTime: 0
    };
    this.failures = [];
  }

  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeEachHooks: [],
      afterEachHooks: [],
      beforeAllHooks: [],
      afterAllHooks: []
    };
    const parentSuite = this.currentSuite;
    this.currentSuite = suite;
    this.suites.push(suite);

    try {
      fn();
    } finally {
      this.currentSuite = parentSuite;
    }
  }

  it(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be declared inside a describe() block`);
    }
    this.currentSuite.tests.push({
      name,
      fn,
      skip: false
    });
  }

  test(name, fn) {
    this.it(name, fn);
  }

  skip(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be declared inside a describe() block`);
    }
    this.currentSuite.tests.push({
      name,
      fn,
      skip: true
    });
  }

  beforeEach(fn) {
    if (this.currentSuite) this.currentSuite.beforeEachHooks.push(fn);
  }

  afterEach(fn) {
    if (this.currentSuite) this.currentSuite.afterEachHooks.push(fn);
  }

  beforeAll(fn) {
    if (this.currentSuite) this.currentSuite.beforeAllHooks.push(fn);
  }

  afterAll(fn) {
    if (this.currentSuite) this.currentSuite.afterAllHooks.push(fn);
  }

  // Assertion helpers
  assert(condition, message = 'Assertion failed') {
    if (!condition) {
      const err = new Error(message);
      Error.captureStackTrace(err, this.assert);
      throw err;
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
      const err = new Error(msg);
      Error.captureStackTrace(err, this.assertEqual);
      throw err;
    }
  }

  assertNotEqual(actual, expected, message) {
    if (actual === expected) {
      const msg = message || `Expected actual NOT to equal ${JSON.stringify(expected)}`;
      const err = new Error(msg);
      Error.captureStackTrace(err, this.assertNotEqual);
      throw err;
    }
  }

  assertDeepEqual(actual, expected, message) {
    const act = JSON.stringify(actual);
    const exp = JSON.stringify(expected);
    if (act !== exp) {
      const msg = message || `Deep equality mismatch:\nExpected: ${exp}\nActual:   ${act}`;
      const err = new Error(msg);
      Error.captureStackTrace(err, this.assertDeepEqual);
      throw err;
    }
  }

  assertTruthy(val, message = 'Expected truthy value') {
    this.assert(Boolean(val), message);
  }

  assertFalsy(val, message = 'Expected falsy value') {
    this.assert(!Boolean(val), message);
  }

  assertIncludes(haystack, needle, message) {
    if (typeof haystack === 'string' || Array.isArray(haystack)) {
      if (!haystack.includes(needle)) {
        throw new Error(message || `Expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
      }
    } else {
      throw new Error(`assertIncludes target must be string or array, got ${typeof haystack}`);
    }
  }

  assertMatch(str, regex, message) {
    if (!regex.test(str)) {
      throw new Error(message || `Expected "${str}" to match ${regex}`);
    }
  }

  assertThrows(fn, expectedRegexOrMessage) {
    let threw = false;
    let thrownError = null;
    try {
      fn();
    } catch (e) {
      threw = true;
      thrownError = e;
    }
    if (!threw) {
      throw new Error('Expected function to throw, but it succeeded');
    }
    if (expectedRegexOrMessage) {
      const msg = thrownError?.message || String(thrownError);
      if (expectedRegexOrMessage instanceof RegExp) {
        if (!expectedRegexOrMessage.test(msg)) {
          throw new Error(`Thrown error "${msg}" did not match ${expectedRegexOrMessage}`);
        }
      } else if (typeof expectedRegexOrMessage === 'string') {
        if (!msg.includes(expectedRegexOrMessage)) {
          throw new Error(`Thrown error "${msg}" did not include "${expectedRegexOrMessage}"`);
        }
      }
    }
    return thrownError;
  }

  async assertThrowsAsync(asyncFn, expectedRegexOrMessage) {
    let threw = false;
    let thrownError = null;
    try {
      await asyncFn();
    } catch (e) {
      threw = true;
      thrownError = e;
    }
    if (!threw) {
      throw new Error('Expected async function to throw, but it succeeded');
    }
    if (expectedRegexOrMessage) {
      const msg = thrownError?.message || String(thrownError);
      if (expectedRegexOrMessage instanceof RegExp) {
        if (!expectedRegexOrMessage.test(msg)) {
          throw new Error(`Thrown error "${msg}" did not match ${expectedRegexOrMessage}`);
        }
      } else if (typeof expectedRegexOrMessage === 'string') {
        if (!msg.includes(expectedRegexOrMessage)) {
          throw new Error(`Thrown error "${msg}" did not include "${expectedRegexOrMessage}"`);
        }
      }
    }
    return thrownError;
  }

  async run(options = {}) {
    const verbose = options.verbose ?? true;
    this.stats.startTime = Date.now();

    for (const suite of this.suites) {
      if (verbose) {
        console.log(`\n  \x1b[1m\x1b[36m▶ ${suite.name}\x1b[0m`);
      }

      for (const hook of suite.beforeAllHooks) {
        await hook();
      }

      for (const test of suite.tests) {
        this.stats.total++;
        if (test.skip) {
          this.stats.skipped++;
          if (verbose) console.log(`    \x1b[33m- [SKIP] ${test.name}\x1b[0m`);
          continue;
        }

        let passed = false;
        let testError = null;
        const testStart = Date.now();

        try {
          for (const hook of suite.beforeEachHooks) {
            await hook();
          }

          await test.fn();

          for (const hook of suite.afterEachHooks) {
            await hook();
          }

          passed = true;
          this.stats.passed++;
        } catch (err) {
          this.stats.failed++;
          testError = err;
          this.failures.push({
            suiteName: suite.name,
            testName: test.name,
            error: err
          });
        }

        const elapsed = Date.now() - testStart;
        if (verbose) {
          if (passed) {
            console.log(`    \x1b[32m✔\x1b[0m ${test.name} \x1b[90m(${elapsed}ms)\x1b[0m`);
          } else {
            console.log(`    \x1b[31m✖ ${test.name}\x1b[0m \x1b[90m(${elapsed}ms)\x1b[0m`);
            console.log(`      \x1b[31m${testError?.message || testError}\x1b[0m`);
          }
        }
      }

      for (const hook of suite.afterAllHooks) {
        await hook();
      }
    }

    this.stats.endTime = Date.now();
    return this.getSummary();
  }

  getSummary() {
    const elapsed = this.stats.endTime - this.stats.startTime;
    return {
      ...this.stats,
      elapsed,
      success: this.stats.failed === 0
    };
  }

  reset() {
    this.suites = [];
    this.currentSuite = null;
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: 0,
      endTime: 0
    };
    this.failures = [];
  }
}

// Global default instance
const defaultHarness = new TestHarness();

// Set globals for test ergonomics
global.describe = defaultHarness.describe.bind(defaultHarness);
global.it = defaultHarness.it.bind(defaultHarness);
global.test = defaultHarness.test.bind(defaultHarness);
global.skip = defaultHarness.skip.bind(defaultHarness);
global.beforeEach = defaultHarness.beforeEach.bind(defaultHarness);
global.afterEach = defaultHarness.afterEach.bind(defaultHarness);
global.beforeAll = defaultHarness.beforeAll.bind(defaultHarness);
global.afterAll = defaultHarness.afterAll.bind(defaultHarness);
global.assert = defaultHarness.assert.bind(defaultHarness);
global.assertEqual = defaultHarness.assertEqual.bind(defaultHarness);
global.assertNotEqual = defaultHarness.assertNotEqual.bind(defaultHarness);
global.assertDeepEqual = defaultHarness.assertDeepEqual.bind(defaultHarness);
global.assertTruthy = defaultHarness.assertTruthy.bind(defaultHarness);
global.assertFalsy = defaultHarness.assertFalsy.bind(defaultHarness);
global.assertIncludes = defaultHarness.assertIncludes.bind(defaultHarness);
global.assertMatch = defaultHarness.assertMatch.bind(defaultHarness);
global.assertThrows = defaultHarness.assertThrows.bind(defaultHarness);
global.assertThrowsAsync = defaultHarness.assertThrowsAsync.bind(defaultHarness);

module.exports = {
  TestHarness,
  defaultHarness,
  describe: defaultHarness.describe.bind(defaultHarness),
  it: defaultHarness.it.bind(defaultHarness),
  test: defaultHarness.test.bind(defaultHarness),
  skip: defaultHarness.skip.bind(defaultHarness),
  beforeEach: defaultHarness.beforeEach.bind(defaultHarness),
  afterEach: defaultHarness.afterEach.bind(defaultHarness),
  beforeAll: defaultHarness.beforeAll.bind(defaultHarness),
  afterAll: defaultHarness.afterAll.bind(defaultHarness),
  assert: defaultHarness.assert.bind(defaultHarness),
  assertEqual: defaultHarness.assertEqual.bind(defaultHarness),
  assertNotEqual: defaultHarness.assertNotEqual.bind(defaultHarness),
  assertDeepEqual: defaultHarness.assertDeepEqual.bind(defaultHarness),
  assertTruthy: defaultHarness.assertTruthy.bind(defaultHarness),
  assertFalsy: defaultHarness.assertFalsy.bind(defaultHarness),
  assertIncludes: defaultHarness.assertIncludes.bind(defaultHarness),
  assertMatch: defaultHarness.assertMatch.bind(defaultHarness),
  assertThrows: defaultHarness.assertThrows.bind(defaultHarness),
  assertThrowsAsync: defaultHarness.assertThrowsAsync.bind(defaultHarness)
};
