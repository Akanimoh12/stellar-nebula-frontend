import { createRequire } from 'node:module'
import { expect, type Page } from '@playwright/test'
import type { AxeResults, ImpactValue, Result, RunOptions } from 'axe-core'

const require = createRequire(import.meta.url)
const AXE_SOURCE = require.resolve('axe-core/axe.min.js')

/** Impacts that fail a test. Moderate and minor issues are reported but allowed. */
const BLOCKING_IMPACTS: ImpactValue[] = ['serious', 'critical']

type AxeWindow = Window & {
  axe: { run: (context: Element | Document, options: RunOptions) => Promise<AxeResults> }
}

export interface A11yCheckOptions {
  /** CSS selector to scope the scan to. Defaults to the whole document. */
  include?: string
  /** Rule ids to skip, each with a linked issue explaining why. */
  disableRules?: string[]
}

/** Injects axe-core into the page and returns its violations. */
export async function runAxe(page: Page, options: A11yCheckOptions = {}): Promise<AxeResults> {
  await page.addScriptTag({ path: AXE_SOURCE })
  return page.evaluate(
    ({ include, disableRules }) => {
      const { axe } = window as unknown as AxeWindow
      const rules = Object.fromEntries(disableRules.map((id) => [id, { enabled: false }]))
      return axe.run(include ? document.querySelector(include) ?? document : document, {
        rules,
        resultTypes: ['violations'],
      })
    },
    { include: options.include, disableRules: options.disableRules ?? [] }
  )
}

/** One readable line per violation, with the first few offending selectors. */
export function formatViolations(violations: Result[]): string {
  return violations
    .map((v) => {
      const targets = v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(', ')
      return `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes: ${targets}) ${v.helpUrl}`
    })
    .join('\n')
}

/** Fails the test on serious or critical axe violations and lists them clearly. */
export async function expectNoA11yViolations(page: Page, options: A11yCheckOptions = {}) {
  const { violations } = await runAxe(page, options)
  const blocking = violations.filter((v) => v.impact && BLOCKING_IMPACTS.includes(v.impact))
  expect(blocking, formatViolations(blocking)).toEqual([])
}
