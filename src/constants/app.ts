/**
 * General application-level constants.
 */

export const APP_NAME = 'Stellar Nebula'

export const APP_VERSION = '0.0.0'

/** Default API request timeout in milliseconds */
export const API_DEFAULT_TIMEOUT_MS = 10_000

/** Local-storage key used to persist wallet connection state */
export const STORAGE_KEY_WALLET = 'stellar_nebula_wallet'

/** Local-storage key used to persist user preferences */
export const STORAGE_KEY_PREFERENCES = 'stellar_nebula_prefs'

/** Polling interval for on-chain data refresh (ms) */
export const CHAIN_POLL_INTERVAL_MS = 5_000

/** Base delay for the first retry of a failed API request (ms); doubles on each attempt */
export const API_RETRY_BASE_DELAY_MS = 1000

/** Interval between gas price snapshots (ms) */
export const GAS_PRICE_POLL_INTERVAL_MS = 30_000

/** Number of analytics events sent per batch */
export const ANALYTICS_BATCH_SIZE = 10

/** How often queued analytics events are flushed (ms) */
export const ANALYTICS_FLUSH_INTERVAL_MS = 15_000

/** Default interval for the background data sync loop (ms) */
export const DATA_SYNC_DEFAULT_INTERVAL_MS = 30_000

/** Initial delay before reconnecting a dropped contract event stream (ms) */
export const EVENT_STREAM_RECONNECT_BASE_DELAY_MS = 1000

/** Upper bound for the exponential reconnect backoff of the contract event stream (ms) */
export const EVENT_STREAM_RECONNECT_MAX_DELAY_MS = 30_000

/** Maximum number of contract events requested per RPC page */
export const EVENT_STREAM_PAGE_LIMIT = 25

/** Frame rate the canvas FPS counter measures against */
export const TARGET_FPS = 60

/** Average FPS below which the scene is considered too slow for full effects */
export const PERFORMANCE_LOW_FPS_THRESHOLD = 30
