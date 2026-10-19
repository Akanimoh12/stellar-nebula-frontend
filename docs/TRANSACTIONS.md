# Transaction Management Guide

## Overview

The Stellar Nebula Frontend provides comprehensive transaction management features including fee estimation, transaction preview, and history caching.

## Fee Estimation (#450)

### Features

- Real-time fee breakdown calculation
- Operation-level fee estimation
- High fee detection and warnings
- Support for custom network rates

### Using Fee Estimation

#### Hook: `useFeeEstimation`

```typescript
import { useFeeEstimation } from '@/hooks/useFeeEstimation'
import type { Transaction } from '@stellar/stellar-sdk'

function MyComponent({ transaction }: { transaction: Transaction }) {
  const { estimate, isLoading, error } = useFeeEstimation(transaction)

  if (estimate) {
    console.log(`Total fee: ${estimate.formattedTotalFee} XLM`)
    console.log(`Per operation: ${estimate.formattedBaseFee} XLM`)
    console.log(`Operations: ${estimate.operationCount}`)
  }

  return <div>{/* ... */}</div>
}
```

#### Utility: `fee-calculator`

```typescript
import {
  calculateFeeBreakdown,
  getDetailedFeeEstimate,
  convertStroopsToLumens,
  isPricyTransaction,
} from '@/utils/fee-calculator'
import { BASE_FEE } from '@stellar/stellar-sdk'

const breakdown = calculateFeeBreakdown(transaction)
const estimate = getDetailedFeeEstimate(transaction, BASE_FEE)
const lumens = convertStroopsToLumens(breakdown.totalFee)
const isExpensive = isPricyTransaction(transaction)
```

### Fee Breakdown

- **Base Fee**: The base network fee per operation (in stroops)
- **Operation Count**: Number of operations in the transaction
- **Total Fee**: Sum of fees for all operations
- **Network Rate**: The per-operation fee rate from the network

### High Fee Detection

Transactions exceeding 0.05 XLM are flagged as high-fee. This threshold can be customized.

## Transaction Preview Component (#450)

### Features

- Visual transaction preview before signing
- Automatic fee estimation
- High-fee warnings
- Operation details display

### Usage

```typescript
import { TransactionPreview } from '@/components/TransactionPreview'
import type { Transaction } from '@stellar/stellar-sdk'

function SigningFlow({ transaction }: { transaction: Transaction }) {
  return (
    <TransactionPreview
      transaction={transaction}
      onConfirm={() => {
        // Sign and send
      }}
      onCancel={() => {
        // Cancel
      }}
      networkRate={100}
    />
  )
}
```

## Transaction History Caching (#449)

### Features

- Automatic transaction history caching
- Incremental fetching for new transactions
- Pagination support
- Cache invalidation and TTL management

### Using Transaction History

#### Hook: `useTransactionHistory`

```typescript
import { useTransactionHistory } from '@/hooks/useTransactionHistory'
import { useWallet } from '@/contexts/WalletContext'

function TransactionList() {
  const { walletState } = useWallet()
  const horizonServer = await createHorizonServer()

  const {
    transactions,
    isLoading,
    hasMore,
    fetchNewTransactions,
    loadMore,
    clearHistory,
  } = useTransactionHistory(horizonServer, walletState.publicKey, {
    limit: 50,
    autoFetch: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })

  return <div>{/* ... */}</div>
}
```

#### Service: `transaction-cache`

```typescript
import { getTransactionCacheService } from '@/services/transaction-cache'

const cacheService = getTransactionCacheService()

// Fetch transactions
const transactions = await cacheService.fetchTransactions(horizonServer, accountId)

// Fetch only new transactions
const newTransactions = await cacheService.fetchNewTransactions(
  horizonServer,
  accountId
)

// Check cache validity
if (cacheService.isCacheValid()) {
  console.log('Cache is still fresh')
}

// Get cache age
const ageMs = cacheService.getCacheAge()

// Clear cache
cacheService.clearCache()

// Subscribe to cache updates
const unsubscribe = cacheService.subscribe((state) => {
  console.log('Cache updated:', state.transactions.length)
})
```

### Cache Strategy

- **TTL**: 5 minutes (configurable)
- **Storage**: localStorage + in-memory
- **Incremental**: Fetches only new transactions on refresh
- **Pagination**: Supports cursor-based pagination for loading more

### Cache State

```typescript
interface TransactionCacheState {
  transactions: CachedTransaction[]
  cursor: string | null // For pagination
  lastFetch: number | null // Timestamp
  isLoading: boolean
  error: string | null
}
```

## Horizon Utilities (#449)

### Functions

#### `fetchAccountTransactions`

Fetch transactions for an account with filtering and pagination.

```typescript
import { fetchAccountTransactions } from '@/utils/horizon-utils'

const response = await fetchAccountTransactions(horizonServer, accountId, {
  limit: 50,
  cursor: 'previousCursor',
  order: 'desc',
})
```

#### `fetchIncrementalTransactions`

Fetch only transactions after a specific ID (for incremental updates).

```typescript
import { fetchIncrementalTransactions } from '@/utils/horizon-utils'

const newTransactions = await fetchIncrementalTransactions(
  horizonServer,
  accountId,
  lastSeenId,
  50
)
```

#### `getLatestTransaction`

Get the most recent transaction for an account.

```typescript
import { getLatestTransaction } from '@/utils/horizon-utils'

const latest = await getLatestTransaction(horizonServer, accountId)
```

#### `getTransactionById`

Fetch a specific transaction by hash.

```typescript
import { getTransactionById } from '@/utils/horizon-utils'

const tx = await getTransactionById(horizonServer, transactionHash)
```

## Best Practices

### Fee Estimation

1. Always show fee estimates before signing
2. Warn users about high fees (> 0.05 XLM)
3. Update estimates if network conditions change
4. Cache estimates for 30-60 seconds to reduce API calls

### Transaction History

1. Load history on wallet connection
2. Refetch new transactions every 5 minutes
3. Use pagination for accounts with many transactions
4. Clear cache on wallet disconnect
5. Implement error handling for failed fetches

### Performance

- Limit initial transaction fetch to 50 items
- Use incremental fetching for new transactions
- Implement pagination for older transactions
- Cache results in localStorage
- Debounce manual refetch requests

## Error Handling

All transaction operations include proper error handling:

```typescript
try {
  const estimate = await useFeeEstimation(transaction)
} catch (error) {
  if (error instanceof Error) {
    console.error('Fee estimation failed:', error.message)
  }
}
```

## Related Issues

- #450: No Transaction Fee Estimation
- #449: Transaction History Not Cached
