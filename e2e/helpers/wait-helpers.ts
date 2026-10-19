import { expect, type Locator, type Page, type Response } from '@playwright/test'

/**
 * Deterministic wait utilities for E2E tests (#410).
 *
 * Why this exists:
 * - `page.waitForTimeout(ms)` sleeps for a fixed duration regardless of app state,
 *   which is the #1 source of flaky E2E tests. Prefer explicit, state-based waits.
 * - `waitForLoadState('networkidle')` alone can hang/flake when the app keeps
 *   long-lived connections open (Horizon polling, websockets, analytics).
 * - Canvas/WebGL rendering and CSS animations need their own readiness signals.
 *
 * Rule of thumb: wait for something observable (visibility, enabled state,
 * network response, text content) instead of waiting for time to pass.
 */

export const WAIT_TIMEOUTS = {
  /** Default assertion/action budget. Mirrors `expect.timeout` in playwright.config.ts */
  standard: 10_000,
  /** Slow resources: canvas/WebGL first frame, DEX mock data, wallet modals */
  slow: 15_000,
  /** Navigation + initial page hydration */
  navigation: 30_000,
} as const

export interface StableGotoOptions {
  /** Wait for `<main>` landmark to be visible after navigation. Defaults to true. */
  waitForMain?: boolean
  /** Timeout applied to network-idle + visibility waits. */
  timeout?: number
}

/**
 * Safe replacement for `page.waitForLoadState('networkidle')`.
 *
 * Tries `networkidle` first (best signal that API calls settled), then falls
 * back to `load` + `domcontentloaded` so tests don't time out when the app
 * holds a persistent connection open (Stellar polling, telemetry, HMR).
 */
export async function waitForNetworkIdleSafe(
  page: Page,
  timeout: number = WAIT_TIMEOUTS.navigation
): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout })
    .catch(() => page.waitForLoadState('load', { timeout }).catch(() => {}))
}

/**
 * Navigate to a URL and wait until the page is deterministically ready:
 * DOM committed -> network settled (safe) -> `<main>` visible.
 *
 * Use this instead of `page.goto()` + `waitForLoadState('networkidle')` in specs.
 */
export async function gotoStable(
  page: Page,
  url: string,
  options: StableGotoOptions = {}
): Promise<void> {
  const { waitForMain = true, timeout = WAIT_TIMEOUTS.navigation } = options
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
  await waitForNetworkIdleSafe(page, timeout)
  if (waitForMain) {
    await page.getByRole('main').waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
  }
}

/** Wait for a locator to become visible. Thin wrapper that documents intent. */
export async function waitForVisible(
  locator: Locator,
  timeout: number = WAIT_TIMEOUTS.standard
): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout })
}

/** Wait for a locator to detach or become hidden (modals, spinners, toasts). */
export async function waitForHidden(
  locator: Locator,
  timeout: number = WAIT_TIMEOUTS.standard
): Promise<void> {
  await locator.waitFor({ state: 'hidden', timeout })
}

/** Wait for a locator to become attached to the DOM (may still be hidden). */
export async function waitForAttached(
  locator: Locator,
  timeout: number = WAIT_TIMEOUTS.standard
): Promise<void> {
  await locator.waitFor({ state: 'attached', timeout })
}

/**
 * Poll an async predicate until it returns a truthy value.
 * Prefer Playwright's auto-retrying assertions (`expect.poll`, `toBeVisible`)
 * for DOM state; use this for non-DOM conditions (counts, in-memory flags).
 */
export async function waitForCondition(
  predicate: () => Promise<boolean> | boolean,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const { timeout = WAIT_TIMEOUTS.standard, interval = 100, message } = options
  await expect
    .poll(async () => predicate(), { timeout, intervals: [interval], message })
    .toBe(true)
}

/**
 * Wait until a `<canvas>` element is visible AND has a non-zero layout box.
 * Canvas visibility alone is not enough: WebGL may report visible before the
 * first frame is painted, and a 0x0 canvas passes `toBeVisible()` in some drivers.
 */
export async function waitForCanvasReady(
  canvas: Locator,
  timeout: number = WAIT_TIMEOUTS.slow
): Promise<void> {
  await canvas.waitFor({ state: 'visible', timeout })
  await expect
    .poll(
      async () =>
        canvas.evaluate((el) => {
          const rect = (el as HTMLElement).getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        }),
      { timeout, intervals: [100] }
    )
    .toBe(true)
}

/**
 * Wait for the next API response matching a URL pattern or predicate.
 * Use to synchronize tests with backend calls instead of sleeping.
 *
 * @example
 * const respPromise = waitForApiResponse(page, /horizon-testnet|api\//)
 * await page.getByRole('button', { name: /refresh/i }).click()
 * await respPromise
 */
export async function waitForApiResponse(
  page: Page,
  urlOrPredicate: string | RegExp | ((response: Response) => boolean),
  timeout: number = WAIT_TIMEOUTS.standard
): Promise<Response> {
  return page.waitForResponse(urlOrPredicate, { timeout })
}

/**
 * Reduce animation flakiness for deterministic screenshots/assertions.
 * Injects CSS that short-circuits transitions/animations and
 * `prefers-reduced-motion` is also forced via the Playwright config.
 * Safe to call in `beforeEach`; idempotent per page.
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `,
  })
}

/**
 * Wait for one of several locators to become visible; returns the index of
 * the winner. Useful for pages with divergent states (connect prompt vs scan
 * button) without resorting to `Promise.race` + arbitrary timeouts scattered
 * across page objects.
 */
export async function waitForAnyVisible(
  locators: Locator[],
  timeout: number = WAIT_TIMEOUTS.standard
): Promise<number> {
  const start = Date.now()
  for (;;) {
    for (let i = 0; i < locators.length; i++) {
      if (await locators[i].isVisible().catch(() => false)) return i
    }
    if (Date.now() - start > timeout) {
      throw new Error(`Timed out after ${timeout}ms waiting for any locator to be visible`)
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}
