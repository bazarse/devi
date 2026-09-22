#!/usr/bin/env node
/**
 * Devi Mobile POS - Unified E2E Test Runner
 *
 * Discovers and executes all test suites across Tiers 1 through 4:
 * - Tier 1: Feature Coverage (>=5 test cases per feature for 21 features = 105 tests)
 * - Tier 2: Boundary & Corner Cases (>=5 test cases per feature for 21 features = 105 tests)
 * - Tier 3: Cross-Feature Combinations (15 pairwise interaction scenarios)
 * - Tier 4: Real-World Workload Scenarios (6 multi-step retail workflow scenarios)
 *
 * Usage:
 *   node tests/run-all-tests.js
 *   node tests/run-all-tests.js --tier=1
 *   node tests/run-all-tests.js --tier=2
 *   node tests/run-all-tests.js --tier=3
 *   node tests/run-all-tests.js --tier=4
 */

const fs = require('fs');
const path = require('path');
const { defaultHarness } = require('./helpers/test-harness');

async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find(a => a.startsWith('--tier='));
  const targetTier = tierArg ? tierArg.split('=')[1] : null;

  console.log('\x1b[1m\x1b[35m=================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[35m   DEVI MOBILE POS — PRODUCTION E2E TEST HARNESS (TIERS 1-4)    \x1b[0m');
  console.log('\x1b[1m\x1b[35m=================================================================\x1b[0m');
  console.log(`Node.js Version : ${process.version}`);
  console.log(`Execution Mode  : ${targetTier ? `Tier ${targetTier} only` : 'All Tiers (1, 2, 3, 4)'}`);
  console.log(`Working Dir     : ${process.cwd()}\n`);

  const testsDir = __dirname;
  const tiers = [
    { id: '1', name: 'Tier 1: Feature Coverage', dir: path.join(testsDir, 'tier1-features') },
    { id: '2', name: 'Tier 2: Boundary & Corner Cases', dir: path.join(testsDir, 'tier2-boundary') },
    { id: '3', name: 'Tier 3: Cross-Feature Combinations', dir: path.join(testsDir, 'tier3-combinations') },
    { id: '4', name: 'Tier 4: Real-World Workload Scenarios', dir: path.join(testsDir, 'tier4-realworld') }
  ];

  const activeTiers = targetTier ? tiers.filter(t => t.id === targetTier) : tiers;

  if (activeTiers.length === 0) {
    console.error(`\x1b[31mError: Unknown tier "${targetTier}". Valid options are 1, 2, 3, 4.\x1b[0m`);
    process.exit(1);
  }

  let totalDiscoveredFiles = 0;
  const tierStats = [];

  for (const tier of activeTiers) {
    if (!fs.existsSync(tier.dir)) {
      console.warn(`Warning: Directory not found: ${tier.dir}`);
      continue;
    }

    const testFiles = fs.readdirSync(tier.dir)
      .filter(f => f.endsWith('.test.js'))
      .sort();

    totalDiscoveredFiles += testFiles.length;

    console.log(`\x1b[1m\x1b[34m▶ Loading ${tier.name} (${testFiles.length} files)\x1b[0m`);

    // Reset defaultHarness for isolated tier tracking
    defaultHarness.reset();

    for (const file of testFiles) {
      const fullPath = path.join(tier.dir, file);
      // Clear module cache to allow fresh execution
      delete require.cache[require.resolve(fullPath)];
      require(fullPath);
    }

    const summary = await defaultHarness.run({ verbose: false });
    tierStats.push({
      tierId: tier.id,
      name: tier.name,
      files: testFiles.length,
      ...summary
    });

    console.log(`  \x1b[32m✔ ${tier.name} Completed:\x1b[0m ${summary.passed}/${summary.total} passed in ${summary.elapsed}ms\n`);
  }

  // Final Summary Report Table
  console.log('\x1b[1m\x1b[35m=================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[35m                    FINAL TEST EXECUTION REPORT                  \x1b[0m');
  console.log('\x1b[1m\x1b[35m=================================================================\x1b[0m');
  console.log(' Tier | Description                     | Files | Total | Passed | Failed | Time   ');
  console.log('------|---------------------------------|-------|-------|--------|--------|--------');

  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  let grandElapsed = 0;

  for (const ts of tierStats) {
    grandTotal += ts.total;
    grandPassed += ts.passed;
    grandFailed += ts.failed;
    grandElapsed += ts.elapsed;

    const tId = ts.tierId.padEnd(4);
    const tDesc = ts.name.padEnd(31).slice(0, 31);
    const tFiles = String(ts.files).padStart(5);
    const tTot = String(ts.total).padStart(5);
    const tPass = `\x1b[32m${String(ts.passed).padStart(6)}\x1b[0m`;
    const tFail = ts.failed > 0 ? `\x1b[31m${String(ts.failed).padStart(6)}\x1b[0m` : `${String(ts.failed).padStart(6)}`;
    const tTime = `${ts.elapsed}ms`.padStart(7);

    console.log(` ${tId} | ${tDesc} | ${tFiles} | ${tTot} | ${tPass} | ${tFail} | ${tTime}`);
  }

  console.log('------|---------------------------------|-------|-------|--------|--------|--------');
  console.log(` ALL  | TOTAL (Tiers 1-4)               | ${String(totalDiscoveredFiles).padStart(5)} | ${String(grandTotal).padStart(5)} | \x1b[32m${String(grandPassed).padStart(6)}\x1b[0m | ${grandFailed > 0 ? `\x1b[31m${String(grandFailed).padStart(6)}\x1b[0m` : String(grandFailed).padStart(6)} | ${grandElapsed}ms\n`);

  if (grandFailed > 0) {
    console.log(`\x1b[1m\x1b[31m❌ TEST RUN FAILED: ${grandFailed} tests failed out of ${grandTotal}.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[1m\x1b[32m🎉 ALL TESTS PASSED: 100% success rate across all ${grandTotal} tests!\x1b[0m\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('\x1b[31mFatal error running test suite:\x1b[0m', err);
  process.exit(1);
});
