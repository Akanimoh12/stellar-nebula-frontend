#!/usr/bin/env node
/**
 * CI dependency gate (#341).
 *
 * `npm audit --audit-level=high` has no way to record a reviewed exception, so a
 * single unfixable build-time advisory would keep the job red forever and train
 * everyone to ignore it. This wraps `npm audit --json` and fails when:
 *
 *   - any high/critical advisory is not in .audit-allowlist.json,
 *   - a production dependency has any high/critical advisory (never allowlisted),
 *   - an allowlist entry has expired, or no longer matches anything (stale).
 *
 * Usage: node scripts/audit-check.mjs [--level=high|critical]
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }
const levelArg = process.argv.find((arg) => arg.startsWith('--level='))
const threshold = SEVERITY_RANK[levelArg ? levelArg.split('=')[1] : 'high'] ?? SEVERITY_RANK.high

function audit(extraArgs = []) {
  try {
    return JSON.parse(
      execFileSync('npm', ['audit', '--json', ...extraArgs], { cwd: root, encoding: 'utf8' })
    )
  } catch (error) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    if (error.stdout) return JSON.parse(error.stdout)
    throw error
  }
}

/** Collects advisory objects (not package-to-package links) above the threshold. */
function advisoriesOf(report) {
  const found = new Map()
  for (const [pkg, vuln] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via !== 'object') continue
      if ((SEVERITY_RANK[via.severity] ?? 0) < threshold) continue
      const id = via.url?.split('/').pop() ?? String(via.source)
      found.set(`${id}:${pkg}`, {
        id,
        package: pkg,
        severity: via.severity,
        title: via.title,
        url: via.url,
      })
    }
  }
  return [...found.values()]
}

const allowlist =
  JSON.parse(readFileSync(path.join(root, '.audit-allowlist.json'), 'utf8')).advisories ?? []
const today = new Date().toISOString().slice(0, 10)
const problems = []

for (const entry of allowlist) {
  if (!entry.id || !entry.package || !entry.reason || !entry.expires) {
    problems.push(
      `Allowlist entry ${JSON.stringify(entry.id)} is missing id, package, reason or expires.`
    )
  } else if (entry.expires < today) {
    problems.push(
      `Allowlist entry ${entry.id} (${entry.package}) expired on ${entry.expires}; re-review or fix it.`
    )
  }
}

const all = advisoriesOf(audit())
const production = advisoriesOf(audit(['--omit=dev']))
const isAllowed = (advisory) =>
  allowlist.some(
    (entry) =>
      entry.id === advisory.id && entry.package === advisory.package && entry.expires >= today
  )

for (const advisory of production) {
  problems.push(
    `Production dependency ${advisory.package}: ${advisory.severity} ${advisory.id} — ${advisory.title} (${advisory.url}). ` +
      'Runtime advisories cannot be allowlisted.'
  )
}

const productionKeys = new Set(production.map((a) => `${a.id}:${a.package}`))
const unreviewed = all.filter((a) => !productionKeys.has(`${a.id}:${a.package}`) && !isAllowed(a))
for (const advisory of unreviewed) {
  problems.push(
    `${advisory.package}: ${advisory.severity} ${advisory.id} — ${advisory.title} (${advisory.url})`
  )
}

for (const entry of allowlist) {
  if (!all.some((a) => a.id === entry.id && a.package === entry.package)) {
    problems.push(
      `Allowlist entry ${entry.id} (${entry.package}) no longer matches any advisory; remove it.`
    )
  }
}

const allowed = all.filter(isAllowed)
console.log(
  `npm audit: ${all.length} advisories at or above threshold, ${allowed.length} allowlisted, ${production.length} in production dependencies.`
)
for (const advisory of allowed) console.log(`  allowlisted: ${advisory.package} ${advisory.id}`)

if (problems.length > 0) {
  console.error(`\nDependency audit failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
  console.error(
    '\nFix with `npm audit fix` / an upgrade, or add a reviewed entry to .audit-allowlist.json (see docs/SECURITY.md).'
  )
  process.exit(1)
}
console.log('Dependency audit passed.')
