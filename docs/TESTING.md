# Testing Guide & API Mocking

This document outlines the testing architecture for Stellar Nebula Frontend, including Mock Service Worker (MSW) setup and test data factories.

## Mock Service Worker (MSW)

All external API interactions (Stellar Horizon, Soroban RPC, and the game backend) are mocked using MSW (`msw/node`). This guarantees tests do not issue live network requests and execute predictably.

### Architecture

- **`src/test/mocks/handlers.ts`**: Contains default HTTP request handlers for:
  - Horizon account endpoints (`https://horizon-testnet.stellar.org/accounts/:accountId`)
  - Soroban RPC methods (`getHealth`, `getAccount`, etc.)
  - Nebula game backend (`/api/v1/player/:publicKey`, `/api/v1/nebula/zones`, `/api/v1/scan`)
- **`src/test/mocks/server.ts`**: Configures the MSW server instance with the default handlers.
- **`src/test/setup.ts`**: Hooks into the Vitest lifecycle to start listening before tests, reset handlers between tests, and close the server on completion.

### Overriding Handlers in Tests

To simulate error responses or custom scenarios in individual tests, use `server.use(...)`:

```typescript
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

it('handles server error gracefully', async () => {
  server.use(
    http.get('https://api.test/api/v1/nebula/zones', () => {
      return new HttpResponse(null, { status: 500 })
    })
  )

  // execute component test expecting error state
})
```

---

## Test Data Factories

Pre-configured factories generate realistic, consistent fixtures with `@faker-js/faker`. Available from `@/test/factories`:

- **Users / Players**: `buildUser()`, `buildUserList(count)`
- **Nebula Zones**: `buildNebula()`, `buildNebulaList(count)`
- **Ships**: `buildShip()`, `buildShipList(count)`
- **Resources**: `buildResource()`, `buildResourceList(count)`, `buildCargoItem()`
- **Stellar Accounts & Transactions**: `buildStellarAccount()`, `buildStellarTransaction()`

### Example Usage

```typescript
import { buildUser, buildNebula } from '@/test/factories'

const player = buildUser({ username: 'CommanderNova', credits: 50000 })
const zone = buildNebula({ type: 'dark', radius: 300 })
```

---

## Running Tests

```bash
# Unit & component integration tests
npm test

# Performance benchmarks with thresholds
npm run performance:test

# Coverage report
npm run test:coverage
```

---

## Snapshot policy

The suite currently has no snapshot files. Prefer explicit assertions (`getByRole`, `toHaveTextContent`) over snapshots, because large snapshots get updated without being read.

If you add a snapshot:

- Keep it small: one component state, not a whole page.
- Use inline snapshots (`toMatchInlineSnapshot`) when the output is a few lines.
- Review every snapshot diff in the PR as you would review code. Never run `vitest -u` just to make CI green.
- Delete snapshots that no longer protect against a real regression. Vitest reports obsolete snapshots at the end of a run; remove them in the same PR.

## Hook testing

Test hooks with `renderHook` from `@testing-library/react` (the old `@testing-library/react-hooks` package is not needed with React 18 and later). Put tests in `src/hooks/__tests__/`.

- Wrap state updates in `act`.
- Pass changing inputs through `initialProps` and `rerender`.
- Use `vi.useFakeTimers()` for debounced or delayed hooks, and restore real timers in `afterEach`.
- Cover the fallback paths too (missing or corrupt storage, unavailable APIs).

Examples: `useDebounce.test.ts`, `useLocalStorage.test.ts`.

## Accessibility in E2E

`e2e/accessibility.spec.ts` runs axe on the main routes. Use the helper in any spec:

```ts
import { expectNoA11yViolations } from './helpers/a11y-helpers'

await expectNoA11yViolations(page)
await expectNoA11yViolations(page, { include: '[role="dialog"]' })
```

Serious and critical violations fail the test, and the failure message lists each rule, its help text, the offending selectors and a link to the fix. To skip a rule, pass `disableRules` and link the issue that tracks it.
