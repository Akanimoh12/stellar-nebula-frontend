import { describe, expect, it, vi } from 'vitest'
import { createResourceTracker } from '../../src/utils/performance/memoryLeakTracker'
import { PERFORMANCE_THRESHOLDS } from './thresholds'

describe('Memory Usage & Leak Detection Thresholds', () => {
  it('asserts memory consumption remains below threshold (≤200MB)', () => {
    // In node/browser environments, check memory heap or mock heap usage
    const memoryUsageMB =
      typeof process !== 'undefined' && process.memoryUsage
        ? process.memoryUsage().heapUsed / (1024 * 1024)
        : 85

    expect(memoryUsageMB).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.MAX_MEMORY_MB)
  })

  it('detects unreleased resources and fails when leaks occur', () => {
    const tracker = createResourceTracker()
    const disposeFn = vi.fn()

    // Track a resource and intentionally do not release it
    tracker.trackResource('geometry', 'leaked-geometry-1', disposeFn)

    expect(tracker.hasLeaks()).toBe(true)
    expect(tracker.leakCount()).toBeGreaterThan(0)
  })

  it('passes leak detection when all resources are properly disposed', () => {
    const tracker = createResourceTracker()
    const geometryDispose = vi.fn()
    const textureDispose = vi.fn()

    tracker.trackResource('geometry', 'geo-1', geometryDispose)
    tracker.trackResource('texture', 'tex-1', textureDispose)

    expect(tracker.hasLeaks()).toBe(true)

    // Release both resources
    tracker.releaseResource('geometry', 'geo-1')
    tracker.releaseResource('texture', 'tex-1')

    expect(geometryDispose).toHaveBeenCalledTimes(1)
    expect(textureDispose).toHaveBeenCalledTimes(1)
    expect(tracker.hasLeaks()).toBe(false)
    expect(tracker.leakCount()).toBe(0)
  })

  it('tracks and cleans up animation frames and event listeners', () => {
    const tracker = createResourceTracker()
    const removeListener = vi.fn()

    const frameId = 101
    tracker.trackAnimationFrame(frameId)
    tracker.trackEventListener(window, 'resize', () => undefined, removeListener)

    expect(tracker.leakCount()).toBe(2)

    tracker.releaseAnimationFrame(frameId)
    tracker.releaseEventListener(window, 'resize')

    expect(removeListener).toHaveBeenCalledTimes(1)
    expect(tracker.hasLeaks()).toBe(false)
  })
})
