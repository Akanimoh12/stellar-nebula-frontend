#!/usr/bin/env node
/**
 * Renders a human-readable Lighthouse budget report (markdown) from the
 * output of `lhci collect` (`.lighthouseci/manifest.json` + the per-run LHR
 * JSON files it references), for posting as a PR comment (#384).
 *
 * This is informational: pass/fail enforcement already happens when `lhci
 * autorun`'s assert step exits non-zero (see scripts/performance-ci.mjs),
 * which fails the CI job before this script even runs. This script just
 * explains *why*, with actual-vs-budget numbers, since a bare non-zero exit
 * code and a wall of lhci console output are hard to read in a PR.
 *
 * Usage: node scripts/lighthouse-budget-report.mjs [--out lighthouse-report.md]
 */

import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'

const LHCI_DIR = '.lighthouseci'
const OUT_ARG_INDEX = process.argv.indexOf('--out')
const OUT_FILE = OUT_ARG_INDEX !== -1 ? process.argv[OUT_ARG_INDEX + 1] : 'lighthouse-report.md'

// Mirrors the `error`-level assertions in .lighthouserc.cjs. Kept here (not
// imported from the CJS config) so this script has no dependency on the lhci
// config's module format.
const BUDGETS = [
  { key: 'first-contentful-paint', label: 'First Contentful Paint', unit: 'ms', max: 1800 },
  { key: 'largest-contentful-paint', label: 'Largest Contentful Paint', unit: 'ms', max: 2500 },
  { key: 'interactive', label: 'Time to Interactive', unit: 'ms', max: 4000 },
  { key: 'total-blocking-time', label: 'Total Blocking Time', unit: 'ms', max: 250 },
  { key: 'cumulative-layout-shift', label: 'Cumulative Layout Shift', unit: '', max: 0.1 },
]

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'))
}

async function main() {
  let manifest
  try {
    manifest = await readJson(join(LHCI_DIR, 'manifest.json'))
  } catch {
    console.warn(`No ${LHCI_DIR}/manifest.json found - skipping Lighthouse budget report.`)
    await fs.writeFile(
      OUT_FILE,
      '⚠️ No Lighthouse results were found (the `lhci collect` step may have failed before producing output).\n'
    )
    return
  }

  const representative = manifest.find((run) => run.isRepresentativeRun) ?? manifest[0]
  if (!representative) {
    await fs.writeFile(OUT_FILE, '⚠️ Lighthouse produced no runs.\n')
    return
  }

  const lhrPath = representative.jsonPath.startsWith('/')
    ? representative.jsonPath
    : join(dirname(join(LHCI_DIR, 'manifest.json')), representative.jsonPath)
  const lhr = await readJson(lhrPath)

  const rows = BUDGETS.map(({ key, label, unit, max }) => {
    const audit = lhr.audits?.[key]
    const actual = audit?.numericValue
    const pass = typeof actual === 'number' ? actual <= max : null
    const actualLabel =
      typeof actual === 'number'
        ? unit === 'ms'
          ? `${Math.round(actual)} ${unit}`
          : actual.toFixed(3)
        : 'n/a'
    const maxLabel = unit === 'ms' ? `${max} ${unit}` : String(max)
    const status = pass === null ? '❓' : pass ? '✅' : '❌'
    return `| ${label} | ${actualLabel} | ${maxLabel} | ${status} |`
  })

  const perfScore = lhr.categories?.performance?.score
  const perfScorePct = typeof perfScore === 'number' ? Math.round(perfScore * 100) : 'n/a'

  const lines = [
    '## 🔬 Lighthouse Performance Budget Report',
    '',
    `Performance score: **${perfScorePct}**/100 (budget: ≥ 80)`,
    '',
    '| Metric | Actual | Budget | Status |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    'Budgets are defined in `.lighthouserc.cjs` and `.size-limit.json`; see `docs/PERFORMANCE_BUDGETS.md`. ' +
      'A ❌ above means that metric breached its `error`-level budget and should already be failing this job.',
  ]

  await fs.writeFile(OUT_FILE, lines.join('\n') + '\n')
  console.log(lines.join('\n'))
}

main().catch((error) => {
  console.error('Failed to generate Lighthouse budget report:', error)
  // Non-fatal: this is a reporting aid, not the enforcement mechanism.
  process.exit(0)
})
