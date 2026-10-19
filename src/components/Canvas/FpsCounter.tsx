import { useCallback, useEffect, useState } from 'react'
import { useFrameRateMonitor } from '@/hooks/useFrameRateMonitor'
import { useRenderStatsStore } from '@/store/renderStatsStore'
import type { FpsBenchmarkSample } from '@/utils/performance/fpsBenchmark'
import { trackEvent } from '@/services/analytics'
import { TARGET_FPS } from '@/constants/app'

/** Chrome-only, non-standard `performance.memory`; absent elsewhere. */
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

const toMB = (bytes: number) => Math.round((bytes / 1_048_576) * 10) / 10

/**
 * Snapshot of every metric this component displays, used both for the
 * on-screen overlay and for the "export metrics" download (issue #322).
 */
export interface FpsCounterMetrics {
  fps: number
  averageFps: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  memoryUsedMB: number | null
  memoryLimitMB: number | null
  capturedAt: string
}

function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function FpsCounter() {
  const [memUsed, setMemUsed] = useState<number | null>(null)
  const [memLimit, setMemLimit] = useState<number | null>(null)
  const [history, setHistory] = useState<FpsCounterMetrics[]>([])

  const drawCalls = useRenderStatsStore((s) => s.drawCalls)
  const triangles = useRenderStatsStore((s) => s.triangles)
  const geometries = useRenderStatsStore((s) => s.geometries)
  const textures = useRenderStatsStore((s) => s.textures)

  // Stable, so the monitor's sampling loop is not restarted on every render.
  // Render stats are read from the store at sample time rather than closed over.
  const handleSample = useCallback((sample: FpsBenchmarkSample) => {
    const { drawCalls, triangles, geometries, textures } = useRenderStatsStore.getState()
    // Integration with the monitoring service (issue #322's suggested
    // approach), the same event shape the Debug performance monitor sends.
    trackEvent('performance_metric', {
      metric: 'fps',
      value: sample.fps,
      drawCalls,
      triangles,
    })

    // One history entry per completed sample (1s window), as the 120-entry
    // (~2 minute) cap assumes. Appending from an effect instead re-rendered on
    // every draw-call change and filled the buffer far faster than 1/s.
    const mem = (performance as PerformanceWithMemory).memory
    setHistory((prev) =>
      [
        ...prev,
        {
          fps: sample.fps,
          averageFps: sample.averageFps,
          drawCalls,
          triangles,
          geometries,
          textures,
          memoryUsedMB: mem ? toMB(mem.usedJSHeapSize) : null,
          memoryLimitMB: mem ? toMB(mem.jsHeapSizeLimit) : null,
          capturedAt: new Date().toISOString(),
        },
      ].slice(-120)
    )
  }, [])

  const { fps, averageFps } = useFrameRateMonitor({
    enabled: true,
    targetFps: TARGET_FPS,
    sampleWindowMs: 1000,
    onSample: handleSample,
  })

  // performance.memory is Chrome-only and non-standard; sampled on the same
  // 1s cadence the FPS monitor uses rather than every frame.
  useEffect(() => {
    const interval = setInterval(() => {
      const mem = (performance as PerformanceWithMemory).memory
      if (mem) {
        setMemUsed(mem.usedJSHeapSize)
        setMemLimit(mem.jsHeapSizeLimit)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const exportMetrics = useCallback(() => {
    trackEvent('performance_metrics_exported', { sampleCount: history.length })
    downloadJSON(`nebula-perf-${Date.now()}.json`, {
      current: history[history.length - 1] ?? null,
      history,
    })
  }, [history])

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        padding: '6px 8px',
        background: 'rgba(0,0,0,0.6)',
        color: '#e5e7eb',
        fontFamily: 'monospace',
        fontSize: 11,
        borderRadius: 4,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 120,
      }}
    >
      <div style={{ color: fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171' }}>
        {fps} FPS <span style={{ opacity: 0.6 }}>(avg {averageFps})</span>
      </div>
      <div>Draws: {drawCalls}</div>
      <div>Tris: {triangles.toLocaleString()}</div>
      <div>
        Geo/Tex: {geometries}/{textures}
      </div>
      {memUsed !== null && memLimit !== null && (
        <div>
          Mem: {toMB(memUsed)}/{toMB(memLimit)} MB
        </div>
      )}
      <button
        type="button"
        onClick={exportMetrics}
        style={{
          marginTop: 2,
          padding: '2px 4px',
          fontSize: 10,
          fontFamily: 'inherit',
          background: 'rgba(255,255,255,0.08)',
          color: 'inherit',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 3,
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        Export
      </button>
    </div>
  )
}
