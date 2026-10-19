# Configuration Constants

Tunable values live in `src/constants/` and are imported from there rather than hardcoded
in components or services. Change a value in one place to change it everywhere.

Runtime environment settings (contract IDs, network selection, API keys) are read from
environment variables; see `.env.example` and `src/config/env.ts`.

## Where things live

| Module                     | Contents                                                               |
| -------------------------- | ---------------------------------------------------------------------- |
| `src/constants/app.ts`     | App-wide timings, batch sizes, retry and polling intervals, FPS limits |
| `src/constants/game.ts`    | Gameplay values: ship, resources, nebula, economy, scan cooldowns      |
| `src/constants/stellar.ts` | Horizon/RPC URLs, network passphrases, transaction timeout, stroops    |
| `src/config/stellar.ts`    | Per-network runtime config (URLs and passphrases, plus contract IDs)   |

## Application timings and limits (`src/constants/app.ts`)

| Constant                               | Value  | Used by                                           |
| -------------------------------------- | ------ | ------------------------------------------------- |
| `API_DEFAULT_TIMEOUT_MS`               | 10 000 | Default API request timeout                       |
| `API_RETRY_BASE_DELAY_MS`              | 1 000  | First retry delay for failed API calls (doubles)  |
| `CHAIN_POLL_INTERVAL_MS`               | 5 000  | On-chain data refresh interval                    |
| `GAS_PRICE_POLL_INTERVAL_MS`           | 30 000 | Gas price monitor snapshots                       |
| `ANALYTICS_BATCH_SIZE`                 | 10     | Analytics events per batch                        |
| `ANALYTICS_FLUSH_INTERVAL_MS`          | 15 000 | Analytics flush cadence                           |
| `DATA_SYNC_DEFAULT_INTERVAL_MS`        | 30 000 | Background data sync loop                         |
| `EVENT_STREAM_RECONNECT_BASE_DELAY_MS` | 1 000  | Contract event stream reconnect backoff start     |
| `EVENT_STREAM_RECONNECT_MAX_DELAY_MS`  | 30 000 | Contract event stream reconnect backoff cap       |
| `EVENT_STREAM_PAGE_LIMIT`              | 25     | Contract events requested per RPC page            |
| `TARGET_FPS`                           | 60     | FPS counter reference frame rate                  |
| `PERFORMANCE_LOW_FPS_THRESHOLD`        | 30     | Sustained FPS below this enables performance mode |

## Gameplay (`src/constants/game.ts`)

| Constant                        | Value     | Meaning                                             |
| ------------------------------- | --------- | --------------------------------------------------- |
| `SCAN_COOLDOWN_MS`              | 60 000    | Cooldown between scans of the same point            |
| `SCAN_CHANNEL_DURATION_SEC`     | 2         | Scan animation duration                             |
| `UPGRADE_CONFIRMATION_DELAY_MS` | 700       | Simulated confirmation delay for off-chain upgrades |
| `CARGO_MAX_CAPACITY`            | 500       | Maximum cargo units                                 |
| `ECONOMY_MAX_CREDITS`           | 1 000 000 | Credit ceiling per player                           |

See the file itself for the full list (ship, nebula, rarity and economy values).

## Stellar (`src/constants/stellar.ts`)

| Constant                     | Value      | Meaning                                            |
| ---------------------------- | ---------- | -------------------------------------------------- |
| `STELLAR_TX_TIMEOUT_SECONDS` | 30         | Transaction validity window for built transactions |
| `STELLAR_STROOPS_PER_XLM`    | 10 000 000 | Stroops per XLM, used when displaying fees         |
| `STELLAR_MIN_BALANCE_XLM`    | 1          | Minimum balance to keep an account active          |

Network URLs and passphrases for testnet, futurenet and mainnet are also defined there.

> **Known mismatch:** `STELLAR_MAINNET_RPC_URL` is `https://soroban.stellar.org`, while the
> mainnet entry in `src/config/stellar.ts` uses `https://soroban-rpc.stellar.org`. Confirm the
> intended mainnet RPC before unifying the two.

## Adding a new constant

1. Put it in the module that matches its domain, with a doc comment that states the unit
   (for example `(ms)`, `(seconds)`, `(0–1)`).
2. Use numeric separators for large values (`10_000`), matching the existing files.
3. Import it from `@/constants/...` rather than repeating the literal.
4. Update the table above if the value is user-tunable or affects behavior.
