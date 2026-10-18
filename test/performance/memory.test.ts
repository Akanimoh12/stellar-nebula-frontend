import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createResourceTracker } from '../../src/utils/performance/memoryLeakTracker'

describe('Memory Leak Detection & Resource Tracking', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Three.js GPU resource lifecycle', () => {
    it('tracks and safely releases geometry, texture, and material resources', () => {
      const tracker = createResourceTracker()
      const geometryDispose = vi.fn()
      const textureDispose = vi.fn()
      const materialDispose = vi.fn()

      tracker.trackResource('geometry', 'nebula-geom-01', geometryDispose)
      tracker.trackResource('texture', 'stardust-tex-01', textureDispose)
      tracker.trackResource('material', 'space-mat-01', materialDispose)

      expect(tracker.leakCount()).toBe(3)
      expect(tracker.hasLeaks()).toBe(true)

      // Release resources
      tracker.releaseResource('geometry', 'nebula-geom-01')
      tracker.releaseResource('texture', 'stardust-tex-01')
      tracker.releaseResource('material', 'space-mat-01')

      expect(geometryDispose).toHaveBeenCalledTimes(1)
      expect(textureDispose).toHaveBeenCalledTimes(1)
      expect(materialDispose).toHaveBeenCalledTimes(1)

      expect(tracker.leakCount()).toBe(0)
      expect(tracker.hasLeaks()).toBe(false)
    })

    it('generates a detailed leak report categorized by resource type', () => {
      const tracker = createResourceTracker()

      tracker.trackResource('geometry', 'geom-1', vi.fn())
      tracker.trackResource('geometry', 'geom-2', vi.fn())
      tracker.trackResource('texture', 'tex-1', vi.fn())
      tracker.trackResource('material', 'mat-1', vi.fn())

      const report = tracker.leakReport()

      expect(report).toEqual({
        geometry: 2,
        texture: 1,
        material: 1,
      })
      expect(tracker.leakCount()).toBe(4)
      expect(tracker.hasLeaks()).toBe(true)

      // Cleanup
      tracker.dispose()
      expect(tracker.hasLeaks()).toBe(false)
      expect(tracker.leakReport()).toEqual({})
    })

    it('prevents leaks on duplicate resource registration by disposing existing instance', () => {
      const tracker = createResourceTracker()
      const oldDispose = vi.fn()
      const newDispose = vi.fn()

      // Track same key twice
      tracker.trackResource('geometry', 'ship-hull', oldDispose)
      expect(oldDispose).not.toHaveBeenCalled()

      tracker.trackResource('geometry', 'ship-hull', newDispose)
      // Old resource should have been disposed to prevent duplicate accumulation
      expect(oldDispose).toHaveBeenCalledTimes(1)
      expect(tracker.leakCount()).toBe(1)

      tracker.releaseResource('geometry', 'ship-hull')
      expect(newDispose).toHaveBeenCalledTimes(1)
      expect(tracker.hasLeaks()).toBe(false)
    })
  })

  describe('Browser animation frames & event listeners', () => {
    it('tracks and cancels animation frame handles', () => {
      const tracker = createResourceTracker()
      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

      const frameId = 1234
      tracker.trackAnimationFrame(frameId)
      expect(tracker.leakCount()).toBe(1)

      tracker.releaseResource('animationFrame', String(frameId))
      expect(cancelSpy).toHaveBeenCalledWith(frameId)
      expect(tracker.hasLeaks()).toBe(false)
    })

    it('tracks and detaches DOM event listeners upon release', () => {
      const tracker = createResourceTracker()
      const target = new EventTarget()
      const removeSpy = vi.spyOn(target, 'removeEventListener')
      const listener = vi.fn()

      tracker.trackEventListener(target, 'resize', listener)
      expect(tracker.leakCount()).toBe(1)

      // Trigger event to verify listener works
      target.dispatchEvent(new Event('resize'))
      expect(listener).toHaveBeenCalledTimes(1)

      // Dispose all resources
      tracker.dispose()
      expect(removeSpy).toHaveBeenCalled()
      expect(tracker.hasLeaks()).toBe(false)
    })
  })

  describe('Full scene teardown simulation', () => {
    it('performs complete teardown of 100+ mesh resources without leaving memory leaks', () => {
      const tracker = createResourceTracker()
      const cleanupFns = Array.from({ length: 100 }, () => vi.fn())

      cleanupFns.forEach((fn, idx) => {
        tracker.trackResource(idx % 2 === 0 ? 'geometry' : 'texture', `res-${idx}`, fn)
      })

      expect(tracker.leakCount()).toBe(100)
      expect(tracker.hasLeaks()).toBe(true)

      // Global dispose simulation when switching sectors or unmounting
      tracker.dispose()

      cleanupFns.forEach((fn) => {
        expect(fn).toHaveBeenCalledTimes(1)
      })

      expect(tracker.leakCount()).toBe(0)
      expect(tracker.hasLeaks()).toBe(false)
    })
  })
})
