# Performance Optimization Guide

This document outlines the performance architectural patterns, rendering lifecycle optimizations, and battery conservation strategies implemented in the Stellar Nebula frontend.

## 1. Animation Frame Loop Optimization (#380)

### Background & Problem
Web applications utilizing 3D graphics (Three.js / React Three Fiber) and continuous physics calculations frequently consume CPU and GPU cycles on every display refresh tick via `requestAnimationFrame`. When a user navigates to another browser tab or minimizes the browser window, standard animation frame loops can continue firing or accumulate unthrottled cycles, resulting in:
- High idle CPU usage (typically 15% - 40% on modern multi-core devices).
- Severe battery drain on mobile devices and laptops.
- Thermal throttling and device overheating.
- Frame-rate stuttering when returning to the tab due to accumulated deltas.

### Page Visibility API Integration
The Page Visibility API (`document.visibilityState` and the `visibilitychange` event) is now integrated across all animation and rendering components:
- **`usePageVisibility` Hook** (`src/hooks/useAnimationFrame.ts`):
  Tracks tab active state reactively and unsubscribes cleanly upon unmount.
- **`useAnimationFrame` Hook** (`src/hooks/useAnimationFrame.ts`):
  Guards the frame callback against inactive tabs, automatically canceling scheduled `requestAnimationFrame` ticks when `document.hidden` is true, and safely resetting delta timestamps upon reactivation to prevent jump artifacts.
- **`NebulaCanvas` Component** (`src/components/Canvas/NebulaCanvas.tsx`):
  Toggles `@react-three/fiber`'s `frameloop` prop dynamically:
  - `frameloop="always"` when visible.
  - `frameloop="never"` when hidden.
  Setting `frameloop="never"` suspends the internal WebGL rendering pipeline, completely halting shader execution and scene evaluations.
- **`useFrameRateMonitor` Hook** (`src/hooks/useFrameRateMonitor.ts`):
  Suspends frame rate tracking during inactive periods, preventing skewed FPS metrics and saving background cycles.

### Results & Acceptance Criteria
- **Idle Inactivity**: CPU utilization falls to ~0% when the tab is hidden.
- **Seamless Resumption**: Canvas and animations resume smoothly without jump-cuts upon tab reactivation.
- **Battery Optimization**: Significantly reduces power draw on mobile browsers and portable devices.

### Utility Functions (`src/utils/performance.ts`)
- `isTabVisible()`: Synchronous check for document visibility.
- `onVisibilityChange(onVisible, onHidden)`: Helper to subscribe to visibility transitions.
- `getRecommendedFrameloop(isVisible, mode)`: Returns the appropriate R3F frameloop state (`'always' | 'demand' | 'never'`).
- `getBatteryStatus()`: Reads battery charging state and level if supported by the browser.

## 2. Transaction History Caching (#449)

### Problem
Every page load or wallet connection triggered a full fetch of transaction history from Horizon, causing:
- Slow page loads (2-3 seconds for typical accounts)
- Unnecessary API calls
- Poor user experience on slow connections
- Excessive bandwidth usage

### Solution
Implemented intelligent caching with localStorage persistence and incremental updates:

#### Cache Strategy
- **TTL**: 5 minutes (configurable)
- **Storage**: localStorage + in-memory for fast access
- **Incremental Fetching**: Only fetch new transactions on refresh
- **Pagination**: Cursor-based pagination for loading older transactions

#### Implementation
- `TransactionCacheService` (`src/services/transaction-cache.ts`): Core caching service
- `useTransactionHistory` Hook: React integration with auto-fetch and refetch intervals
- `horizon-utils.ts`: Helper functions for Horizon API calls

#### Performance Gains
- **First Load**: ~2-3 seconds (initial API call)
- **Subsequent Loads**: <100ms (from cache)
- **API Call Reduction**: ~90% fewer calls for repeat visits
- **Bandwidth Savings**: Eliminate redundant transaction fetches

#### Usage Example
```typescript
const {
  transactions,
  isLoading,
  hasMore,
  fetchNewTransactions,
  loadMore,
} = useTransactionHistory(horizonServer, accountId, {
  limit: 50,
  autoFetch: true,
  refetchInterval: 5 * 60 * 1000,
})
```

### Optimization Techniques
1. **Lazy Loading**: Load more transactions on demand
2. **Pagination**: Fetch in batches of 50 instead of all at once
3. **Debouncing**: Debounce manual refresh to prevent rapid API calls
4. **Selective Refresh**: Only fetch new transactions instead of entire history

## 3. Transaction Fee Estimation (#450)

### Problem
Users couldn't see estimated fees before signing transactions, leading to:
- Unexpected fees after signing
- Loss of trust in the application
- Poor user decision-making

### Solution
Implemented real-time fee estimation and preview component:

#### Features
- Fee breakdown by operation
- Automatic high-fee detection and warnings
- Visual transaction preview before signing
- Support for custom network rates

#### Implementation
- `fee-calculator.ts`: Fee calculation utilities
- `useFeeEstimation` Hook: React hook for fee estimation
- `TransactionPreview` Component: Visual preview before signing

#### Usage Example
```typescript
const { estimate, isLoading, error } = useFeeEstimation(transaction, {
  networkRate: BASE_FEE,
  autoEstimate: true,
})
```

### Benefits
- Informed user decision-making
- Reduced transaction rejections
- Improved user experience
- Trust and transparency
