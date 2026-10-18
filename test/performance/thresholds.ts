/**
 * Performance Testing Thresholds
 *
 * Defines the minimum acceptable performance metrics for Stellar Nebula Frontend.
 * Tests and CI enforce these thresholds to prevent performance regressions.
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Minimum sustained frame rate during rendering (in FPS) */
  MIN_FPS: 45,
  /** Target frame rate for optimal smoothness */
  TARGET_FPS: 60,
  /** Maximum allowable memory usage/leak limit (in Megabytes) */
  MAX_MEMORY_MB: 200,
  /** Maximum allowable initial load/render time (in milliseconds) */
  MAX_LOAD_TIME_MS: 3000,
} as const

export type PerformanceThresholds = typeof PERFORMANCE_THRESHOLDS
