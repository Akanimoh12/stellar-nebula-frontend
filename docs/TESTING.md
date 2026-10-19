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

## Storage Cleanup Between Tests (#421)

`src/test/setup.ts` automatically clears `localStorage` and `sessionStorage` in an `afterEach` hook so that **no test leaks persisted state into the next test**. This eliminates a class of flaky failures caused by test ordering.

### What the setup does

1. **`localStorage.clear()`** — empties the in-memory shim every test uses.
2. **`sessionStorage.clear()`** — cleaned for parity (guarded against environments where it does not exist).
3. **`restoreMocks` / `clearMocks`** — configured in `vitest.config.ts` so `vi.fn()` / `vi.spyOn()` state is restored automatically.
4. **`unstubEnvs` / `unstubGlobals`** — any `vi.stubEnv()` or `vi.stubGlobal()` call is undone between tests.

### Guidelines

- **Do not** rely on `localStorage` values set by a previous test.
- If a test _must_ seed storage, do so in its own `beforeEach` or inline setup — it will be cleared after the test completes.
- You may still call `localStorage.clear()` explicitly if a test wants a clean slate at a precise point _within_ its body, but there is no need to add it to `beforeEach` / `afterEach` — the global hook handles it.


## Speeding Up the Test Suite (#427)

The unit project in `vitest.config.ts` already runs test files in parallel. To keep local runs fast:

- Run only the files you changed, for example `npx vitest run src/services`.
- Use `npx vitest` (watch mode) during development instead of repeated full runs.
- Keep tests off the network. MSW (`src/test/mocks/server.ts`) and module mocks such as `vi.mock('@stellar/stellar-sdk')` avoid real I/O.
- Avoid real timers. Use `vi.useFakeTimers()` for debounce, retry, and polling logic.
- Keep the integration and storybook projects out of the default run. `npm test` already excludes storybook.
