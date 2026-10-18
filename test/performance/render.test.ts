import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRecommendedFrameloop, isTabVisible } from '../../src/utils/performance'
import { useRenderStatsStore } from '../../src/store/renderStatsStore'
import { useGraphicsStore } from '../../src/store/graphicsStore'

describe('Render Performance & Frame Budget Benchmarks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useRenderStatsStore.getState().reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useRenderStatsStore.getState().reset()
  })

  describe('Tab Visibility Frameloop Optimization', () => {
    it('halts Three.js animation frame loop when tab is hidden to save battery & CPU', () => {
      // Tab hidden: frameloop must return 'never'
      expect(getRecommendedFrameloop(false, 'always')).toBe('never')
      expect(getRecommendedFrameloop(false, 'demand')).toBe('never')
    })

    it('resumes standard rendering loop when tab becomes visible', () => {
      expect(getRecommendedFrameloop(true, 'always')).toBe('always')
      expect(getRecommendedFrameloop(true, 'demand')).toBe('demand')
    })

    it('reports document visibility status correctly', () => {
      expect(typeof isTabVisible()).toBe('boolean')
    })
  })

  describe('Three.js WebGL Render Budget Checks', () => {
    // Standard mobile & desktop budgets for real-time WebGL space simulation
    const MAX_ALLOWED_DRAW_CALLS = 100
    const MAX_ALLOWED_TRIANGLES = 250000

    it('tracks draw calls and validates against mobile rendering budget', () => {
      const store = useRenderStatsStore.getState()

      // Record a frame with 45 draw calls
      store.setRenderStats({
        drawCalls: 45,
        triangles: 120000,
        geometries: 12,
        textures: 8,
      })

      const currentStats = useRenderStatsStore.getState()
      expect(currentStats.drawCalls).toBe(45)
      expect(currentStats.drawCalls).toBeLessThanOrEqual(MAX_ALLOWED_DRAW_CALLS)
      expect(currentStats.triangles).toBeLessThanOrEqual(MAX_ALLOWED_TRIANGLES)
      expect(currentStats.updatedAt).not.toBeNull()
    })

    it('detects rendering budget regression when draw calls or triangles exceed limit', () => {
      const store = useRenderStatsStore.getState()

      // Simulate a budget violation (e.g. unbatched particle meshes)
      store.setRenderStats({
        drawCalls: 180,
        triangles: 500000,
        geometries: 80,
        textures: 35,
      })

      const currentStats = useRenderStatsStore.getState()
      const isDrawCallsExceeded = currentStats.drawCalls > MAX_ALLOWED_DRAW_CALLS
      const isTrianglesExceeded = currentStats.triangles > MAX_ALLOWED_TRIANGLES

      expect(isDrawCallsExceeded).toBe(true)
      expect(isTrianglesExceeded).toBe(true)
    })

    it('resets render statistics when unmounting or switching viewports', () => {
      const store = useRenderStatsStore.getState()
      store.setRenderStats({
        drawCalls: 50,
        triangles: 80000,
        geometries: 10,
        textures: 4,
      })

      expect(useRenderStatsStore.getState().drawCalls).toBe(50)

      store.reset()

      const resetStats = useRenderStatsStore.getState()
      expect(resetStats.drawCalls).toBe(0)
      expect(resetStats.triangles).toBe(0)
      expect(resetStats.geometries).toBe(0)
      expect(resetStats.textures).toBe(0)
      expect(resetStats.updatedAt).toBeNull()
    })
  })

  describe('Adaptive Graphics Performance Mode', () => {
    it('manages performance mode state for dynamic quality downscaling', () => {
      const initialMode = useGraphicsStore.getState().performanceMode

      useGraphicsStore.getState().setPerformanceMode(!initialMode)
      expect(useGraphicsStore.getState().performanceMode).toBe(!initialMode)

      // Restore
      useGraphicsStore.getState().setPerformanceMode(initialMode)
    })
  })
})
