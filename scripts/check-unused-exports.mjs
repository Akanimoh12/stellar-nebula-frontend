#!/usr/bin/env node
/**
 * Report exports under src/ that no other production module imports.
 *
 * Usage:
 *   node scripts/check-unused-exports.mjs                    # fail on exports not in the baseline
 *   node scripts/check-unused-exports.mjs --update-baseline  # rewrite .unused-exports-baseline.json
 *
 * Tests, stories and type declarations do not count as usage, so an export used
 * only by a test is reported. Existing findings live in the baseline; CI fails
 * only on new ones, and removing an export drops it from the baseline on update.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = resolve(ROOT, '.unused-exports-baseline.json')
const NON_PRODUCTION = /(\.(test|spec|stories)\.[jt]sx?$|\.d\.ts$|[\\/](__tests__|test)[\\/])/
const ENTRY_FILES = new Set(['src/main.tsx'])

const configPath = resolve(ROOT, 'tsconfig.app.json')
const parsed = ts.parseJsonConfigFileContent(
  ts.readConfigFile(configPath, ts.sys.readFile).config,
  ts.sys,
  ROOT
)
const program = ts.createProgram(parsed.fileNames, parsed.options)
const checker = program.getTypeChecker()

const rel = (file) => relative(ROOT, file).split('\\').join('/')
const isProduction = (file) => file.startsWith(`${ROOT}/src/`) && !NON_PRODUCTION.test(rel(file))
const sources = program.getSourceFiles().filter((f) => isProduction(f.fileName))

// file -> names imported by other production modules ('*' marks every export as used)
const used = new Map()
const markUsed = (file, name) => {
  if (!used.has(file)) used.set(file, new Set())
  used.get(file).add(name)
}
const resolveModule = (specifier, from) =>
  ts.resolveModuleName(specifier, from, parsed.options, ts.sys).resolvedModule?.resolvedFileName

for (const source of sources) {
  const visit = (node) => {
    let specifier
    let names = ['*']
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specifier = node.moduleSpecifier.text
      const bindings = node.importClause?.namedBindings
      names = []
      if (node.importClause?.name) names.push('default')
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) names.push((el.propertyName ?? el.name).text)
      } else if (bindings) {
        names.push('*')
      }
      if (!node.importClause) names.push('*')
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      specifier = node.moduleSpecifier.text
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        names = node.exportClause.elements.map((el) => (el.propertyName ?? el.name).text)
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifier = node.arguments[0].text
    }
    if (specifier) {
      const target = resolveModule(specifier, source.fileName)
      if (target) for (const name of names) markUsed(target, name)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

const findings = []
for (const source of sources) {
  const file = rel(source.fileName)
  if (ENTRY_FILES.has(file)) continue
  const moduleSymbol = checker.getSymbolAtLocation(source)
  if (!moduleSymbol) continue
  const importedNames = used.get(source.fileName)
  if (importedNames?.has('*')) continue
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    if (!importedNames?.has(exported.getName())) findings.push(`${file}#${exported.getName()}`)
  }
}
findings.sort()

if (process.argv.includes('--update-baseline')) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(findings, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${findings.length} unused exports to ${rel(BASELINE_PATH)}`)
  process.exit(0)
}

const baseline = new Set(
  existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : []
)
const added = findings.filter((entry) => !baseline.has(entry))
const removed = [...baseline].filter((entry) => !findings.includes(entry))

if (removed.length > 0) {
  console.log(
    `${removed.length} baseline entries are no longer unused; run with --update-baseline to prune them.`
  )
}
if (added.length > 0) {
  console.error(`Found ${added.length} new unused export(s):`)
  for (const entry of added) console.error(`  ${entry}`)
  console.error(
    '\nRemove the export (or import it from production code). If intentional, run with --update-baseline.'
  )
  process.exit(1)
}
console.log(`No new unused exports (${findings.length} baselined).`)
