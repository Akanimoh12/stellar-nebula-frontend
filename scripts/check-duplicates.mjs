#!/usr/bin/env node
/**
 * Duplicate dependency checker (#381).
 *
 * React and Three.js are large, and more than one copy of either in the
 * final bundle inflates bundle size, breaks React's singleton context/hook
 * rules (two React copies => "Invalid hook call"), and can break Three.js's
 * instanceof-based checks across @react-three/fiber and @react-three/drei.
 *
 * This script reads package-lock.json (the single source of truth for what
 * npm actually resolved, independent of hoisting) and fails if any package
 * in CRITICAL_PACKAGES resolves to more than one distinct version.
 *
 * Usage: node scripts/check-duplicates.mjs
 */

import { readFileSync } from 'node:fs'

const LOCKFILE = 'package-lock.json'

// Packages where a second copy is either impossible to use correctly
// (singleton-dependent) or meaningfully bloats the bundle.
const CRITICAL_PACKAGES = ['react', 'react-dom', 'three']

function loadLockfile() {
  let raw
  try {
    raw = readFileSync(LOCKFILE, 'utf8')
  } catch (error) {
    console.error(`::error::Could not read ${LOCKFILE}: ${error.message}`)
    process.exit(1)
  }
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error(`::error::Could not parse ${LOCKFILE}: ${error.message}`)
    process.exit(1)
  }
}

/**
 * Returns, for each package name in `names`, the set of distinct versions
 * resolved anywhere in the dependency tree (lockfile v3 "packages" map).
 */
function findVersionsByPackage(lockfile, names) {
  const packages = lockfile.packages ?? {}
  const result = new Map(names.map((name) => [name, new Map()]))

  for (const [pkgPath, info] of Object.entries(packages)) {
    if (!info || !info.version) continue
    // pkgPath looks like "node_modules/foo" or "node_modules/bar/node_modules/foo"
    const segments = pkgPath.split('node_modules/')
    const pkgName = segments[segments.length - 1]
    if (!result.has(pkgName)) continue

    const versions = result.get(pkgName)
    const count = versions.get(info.version) ?? 0
    versions.set(info.version, count + 1)
  }

  return result
}

function main() {
  const lockfile = loadLockfile()
  const versionsByPackage = findVersionsByPackage(lockfile, CRITICAL_PACKAGES)

  let hasDuplicates = false

  for (const name of CRITICAL_PACKAGES) {
    const versions = versionsByPackage.get(name)
    if (!versions || versions.size === 0) {
      console.log(`⚠️  ${name}: not found in lockfile (skipping)`)
      continue
    }

    if (versions.size > 1) {
      hasDuplicates = true
      console.error(`::error::Duplicate "${name}" versions detected:`)
      for (const [version, count] of versions) {
        console.error(`    - ${version} (${count} location${count === 1 ? '' : 's'})`)
      }
    } else {
      const [[version]] = versions
      console.log(`✅ ${name}: single version (${version})`)
    }
  }

  if (hasDuplicates) {
    console.error(
      '\nMultiple versions of a singleton dependency were resolved. Add/adjust an "overrides" ' +
        'entry in package.json to pin a single version, then run `npm install` to regenerate ' +
        'package-lock.json.'
    )
    process.exit(1)
  }

  console.log('\nNo duplicate critical dependencies found.')
}

main()
