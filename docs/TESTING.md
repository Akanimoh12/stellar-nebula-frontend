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
