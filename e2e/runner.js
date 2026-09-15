#!/usr/bin/env node

/**
 * Bakery CRM & Loyalty MVP - Master E2E Test Suite Runner
 * Single command entrypoint: node e2e/runner.js
 */

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// If running in plain Node without tsx loader, delegate transparently to tsx / npx tsx
const isTsxRunning = Boolean(
  process.env.TSX_RUNNING === '1' ||
  process.execArgv.some((a) => a.includes('tsx')) ||
  process.argv.some((a) => a.includes('tsx'))
);

if (!isTsxRunning) {
  const currentFile = fileURLToPath(import.meta.url);
  const isWindows = process.platform === 'win32';
  const localTsx = resolve(dirname(currentFile), '..', 'node_modules', '.bin', isWindows ? 'tsx.cmd' : 'tsx');
  const bin = existsSync(localTsx) ? localTsx : (isWindows ? 'npx.cmd' : 'npx');
  const args = existsSync(localTsx)
    ? [currentFile, ...process.argv.slice(2)]
    : ['tsx', currentFile, ...process.argv.slice(2)];

  const child = spawnSync(bin, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, TSX_RUNNING: '1' }
  });
  process.exit(child.status ?? (child.error ? 1 : 0));
}

// Inside TSX execution context: run test suites
async function main() {
  const { register } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const { resolve, dirname } = await import('node:path');

  try {
    const loaderPath = resolve(dirname(fileURLToPath(import.meta.url)), 'loader.js');
    register(pathToFileURL(loaderPath));
  } catch (err) {
    console.warn('Loader register note:', err);
  }

  const { runRegisteredTests, clearRegisteredSuites } = await import('./harness.ts');
  const { registerTier1Tests } = await import('./tier1-features.ts');
  const { registerTier2Tests } = await import('./tier2-boundaries.ts');
  const { registerTier3Tests } = await import('./tier3-combinations.ts');
  const { registerTier4Tests } = await import('./tier4-scenarios.ts');

  console.log('\n================================================================================');
  console.log('🥖  PANIFICADORA CRM & FIDELIZAÇÃO (UMUARAMA-PR) — E2E TEST RUNNER');
  console.log('================================================================================\n');

  const args = process.argv.slice(2);
  const tierArg = args.find((a) => a.startsWith('--tier='))?.split('=')[1];

  let suitesToRun = [];

  if (tierArg === '1') {
    suitesToRun.push({ name: 'Tier 1: Feature Coverage (Isolation)', register: registerTier1Tests });
  } else if (tierArg === '2') {
    suitesToRun.push({ name: 'Tier 2: Boundary & Corner Cases', register: registerTier2Tests });
  } else if (tierArg === '3') {
    suitesToRun.push({ name: 'Tier 3: Cross-Feature Combinations', register: registerTier3Tests });
  } else if (tierArg === '4') {
    suitesToRun.push({ name: 'Tier 4: Real-World Scenarios', register: registerTier4Tests });
  } else {
    suitesToRun = [
      { name: 'Tier 1: Feature Coverage (Isolation)', register: registerTier1Tests },
      { name: 'Tier 2: Boundary & Corner Cases', register: registerTier2Tests },
      { name: 'Tier 3: Cross-Feature Combinations', register: registerTier3Tests },
      { name: 'Tier 4: Real-World Scenarios', register: registerTier4Tests },
    ];
  }

  let grandTotalPassed = 0;
  let grandTotalFailed = 0;
  const overallStart = performance.now();

  for (const suite of suitesToRun) {
    clearRegisteredSuites();
    suite.register();

    console.log(`▶ Running ${suite.name}...`);
    const tierStart = performance.now();
    const result = await runRegisteredTests();
    const tierDuration = ((performance.now() - tierStart) / 1000).toFixed(2);

    grandTotalPassed += result.passed;
    grandTotalFailed += result.failed;

    if (result.failed > 0) {
      console.log(`  ❌ ${suite.name}: ${result.passed} passed, ${result.failed} FAILED (${tierDuration}s)`);
      for (const t of result.results) {
        if (!t.passed) {
          console.error(`     • [FAIL] ${t.suite} > ${t.name}`);
          console.error(`       Error: ${t.error?.message}\n`);
        }
      }
    } else {
      console.log(`  ✔ ${suite.name}: All ${result.passed} tests passed! (${tierDuration}s)\n`);
    }
  }

  const grandTotalDuration = ((performance.now() - overallStart) / 1000).toFixed(2);
  const totalTests = grandTotalPassed + grandTotalFailed;

  console.log('================================================================================');
  console.log('📊  TEST EXECUTION SUMMARY');
  console.log('================================================================================');
  console.log(`Total Tests Executed : ${totalTests}`);
  console.log(`Total Passed         : \x1b[32m${grandTotalPassed}\x1b[0m`);
  console.log(`Total Failed         : ${grandTotalFailed > 0 ? `\x1b[31m${grandTotalFailed}\x1b[0m` : '0'}`);
  console.log(`Execution Time       : ${grandTotalDuration}s`);
  console.log('================================================================================\n');

  if (grandTotalFailed > 0) {
    console.error(`❌ Suite failed with ${grandTotalFailed} errors.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${grandTotalPassed} E2E TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
