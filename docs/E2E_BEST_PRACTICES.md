# E2E Best Practices — Deterministic Waits

> Context: issue #410 — E2E tests intermittently failed due to race conditions
> (network requests, animations, rendering). This guide documents the patterns
> introduced to reach 95%+ stability. Follow it for every new E2E test.

## 1. Golden rule: wait for state, never for time

```ts
// ❌ Flaky — sleeps a fixed duration regardless of app state
await page.waitForTimeout(500)

// ✅ Stable — waits for an observable condition (auto-retries until timeout)
await expect(dialog).not.toBeVisible({ timeout: WAIT_TIMEOUTS.slow })
await expect.poll(async () => market.isOrderBookVisible(), { timeout: WAIT_TIMEOUTS.slow }).toBe(true)
```

`waitForTimeout` is banned in `e2e/` (except inside `wait-helpers.ts` polling
internals). If you feel the urge to sleep, identify the state you are actually
waiting for (visibility, URL, text, network response) and wait for that.

## 2. Use the shared helpers (`e2e/helpers/wait-helpers.ts`)

| Helper | When to use |
|---|---|
| `gotoStable(page, url)` | Every navigation. `domcontentloaded` → safe network-idle → `<main>` visible. Replaces `page.goto()` + `waitForLoadState('networkidle')`. |
| `waitForNetworkIdleSafe(page)` | After actions that trigger fetches. Falls back to `load` so Horizon polling / HMR sockets can't hang the test. |
| `waitForVisible` / `waitForHidden` | Explicit visibility checks for modals, spinners, toasts. |
| `waitForCanvasReady(canvas)` | WebGL/canvas. Checks visibility **plus** non-zero bounding box (a 0×0 canvas can pass `toBeVisible`). |
| `waitForApiResponse(page, pattern)` | Synchronize with backend calls instead of sleeping after a click. |
| `waitForCondition(fn)` | Non-DOM predicates (wallet connected flag, counts). Prefer `expect.poll` / `toBeVisible` for DOM. |
| `waitForAnyVisible(locators)` | Divergent states (connect-prompt vs scan-button). Returns winner index. |
| `disableAnimations(page)` | Optional in visual tests; config already forces `reducedMotion: 'reduce'`. |

```ts
import { gotoStable, waitForCanvasReady, WAIT_TIMEOUTS } from './helpers/wait-helpers'

await gotoStable(page, '/nebula')
await waitForCanvasReady(canvas.first(), WAIT_TIMEOUTS.slow)
```

Page objects (`e2e/pages/*.page.ts`) already use these helpers — call
`page.goto()` via `app.goto()` / `nebula.goto()` / `market.goto()` /
`ship.goto()` / `wallet.goto()` and `waitForReady()` / `waitForCanvas()`
instead of reimplementing waits in specs.

## 3. Network-idle detection (the right way)

Bare `page.waitForLoadState('networkidle')` flakes when the app holds a
persistent connection open (Stellar Horizon polling, analytics, HMR). Pattern:

```ts
// helper implementation (simplified)
await page.waitForLoadState('networkidle', { timeout }).catch(() =>
  page.waitForLoadState('load', { timeout }).catch(() => {})
)
```

Plus: after navigation, also wait for `<main>` visible. That proves React
hydrated and the route actually rendered — not just that the socket went quiet.

Timeout budget (see `playwright.config.ts`):

- `timeout: 60_000` per test — WebGL compile + wallet-mock headroom on CI.
- `expect.timeout: 10_000` — every auto-retrying assertion.
- `actionTimeout: 15_000` — click/fill/select.
- `navigationTimeout: 30_000` — goto/reload.
- `webServer.timeout: 180_000` — Vite cold start on CI runners.

`WAIT_TIMEOUTS = { standard: 10s, slow: 15s, navigation: 30s }` mirrors these.

## 4. Element visibility checks

- Prefer Playwright's auto-retrying assertions: `toBeVisible`, `toBeEnabled`,
  `toHaveURL`, `toHaveAttribute`, `expect.poll`. They retry until `expect.timeout`.
- For page objects, end every `goto()` / `openX()` / `selectX()` with a `waitFor`
  on the element the *next* step needs (dialog visible, fleet section visible,
  market header for the selected asset).
- Canvas: always `waitForCanvasReady`, not just `toBeVisible`.
- Modals: wait for `hidden` after close (`dialog.waitFor({ state: 'hidden' })`)
  before asserting the next screen.
- Lists/totals: `expect.poll(() => count)` for async mock data, not fixed sleeps.

## 5. Animations and rendering

- `playwright.config.ts` sets `reducedMotion: 'reduce'` — keep it.
- Don't assert mid-animation state (e.g. toast sliding in). Wait for the
  terminal state (`transactionBanner.or(upgradeModal)` visible).
- For pixel-sensitive tests, call `disableAnimations(page)` in `beforeEach`.

## 6. Wallet / modal flows (most flaky historically)

```ts
await wallet.connectWithFreighter() // waits for dialog-hidden OR indicator-visible
await waitForCondition(() => wallet.isConnected(), { timeout: WAIT_TIMEOUTS.slow }).catch(() => {})
```

`connectWithFreighter()` races the two valid terminal states instead of
sleeping 500–600ms. Specs then poll `isConnected()` explicitly.

## 7. Checklist for new / modified E2E tests

- [ ] No `waitForTimeout`, no bare `waitForLoadState('networkidle')`, no `waitForSelector` — use `wait-helpers.ts` or auto-retrying `expect`.
- [ ] Every `goto` goes through `gotoStable` (directly or via POM `goto()`).
- [ ] Every navigation asserts `toHaveURL` + `<main>` visible.
- [ ] Canvas tests use `waitForCanvasReady`.
- [ ] Async data (order book, harvest totals) uses `expect.poll`.
- [ ] Modal open/close waits for `visible` / `hidden` explicitly.
- [ ] New timeouts come from `WAIT_TIMEOUTS`, matching `playwright.config.ts`.
- [ ] Test passes 5× locally: `npx playwright test <file> --repeat-each=5` and on CI (retries ≤ 2 cover infra flakes, not logic flakes).

## 8. Debugging a flake

1. Run with trace: `npx playwright test --retries=0` then `npx playwright show-report`.
2. Video + screenshot are retained on failure (`retain-on-failure` / `only-on-failure`).
3. Look for the *first* wait that timed out in the trace — the flake is usually
   the step *before* it (missing settle wait), not the assertion itself.
4. Fix by adding the missing observable wait, never by increasing a sleep.
