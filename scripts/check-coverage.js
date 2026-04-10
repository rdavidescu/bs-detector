/**
 * Coverage threshold check for CI.
 * Vitest generates coverage data — this script verifies thresholds are met.
 * If coverage is below thresholds defined in vitest.config.js, the process exits with code 1.
 *
 * Note: Vitest's built-in thresholds will fail the test run directly.
 * This script exists as a safety net and for clearer CI output.
 */
import { readFileSync, existsSync } from 'fs';

const COVERAGE_FILE = 'coverage/coverage-summary.json';

if (!existsSync(COVERAGE_FILE)) {
  // eslint-disable-next-line no-console
  console.log('No coverage report found — skipping check (expected during early scaffolding)');
  process.exit(0);
}

const coverage = JSON.parse(readFileSync(COVERAGE_FILE, 'utf-8'));
const total = coverage.total;

const thresholds = { lines: 85, branches: 75, functions: 85, statements: 85 };
let passed = true;

for (const [metric, threshold] of Object.entries(thresholds)) {
  const actual = total[metric]?.pct ?? 0;
  if (actual < threshold) {
    // eslint-disable-next-line no-console
    console.error(`❌ ${metric}: ${actual}% < ${threshold}% threshold`);
    passed = false;
  } else {
    // eslint-disable-next-line no-console
    console.log(`✅ ${metric}: ${actual}% >= ${threshold}%`);
  }
}

process.exit(passed ? 0 : 1);
