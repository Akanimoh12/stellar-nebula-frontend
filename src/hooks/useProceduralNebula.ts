import { useEffect, useRef, useState } from 'react'
import { useWorker } from './useWorker'
import {
  generateNebulaGeometry,
  type NebulaConfig,
  type NebulaGeometry,
} from '@/utils/procedural/nebula'
import type { NebulaWorkerRequest, NebulaWorkerResponse } from '@/workers/nebula-worker'

interface UseProceduralNebulaResult {
  geometry: NebulaGeometry | null
  isLoading: boolean
}

const supportsWorkers = typeof Worker !== 'undefined'

function createNebulaWorker(): Worker {
  return new Worker(new URL('../workers/nebula-worker.ts', import.meta.url), { type: 'module' })
}

/**
 * Generates nebula particle geometry for a given seed/config.
 *
 * The generation itself (see `generateNebulaGeometry`) can take well over
 * 50ms at higher particle counts, which showed up as a Lighthouse long task
 * and janked interactions while it ran. It is offloaded to a Web Worker
 * (`src/workers/nebula-worker.ts`) via `useWorker` so the main thread stays
 * responsive; `isLoading` is `true` while that computation is in flight (#383).
 *
 * Falls back to computing synchronously on the main thread if `Worker` is
 * unavailable (e.g. certain test/SSR environments) or if the worker itself
 * fails for any reason.
 */
export function useProceduralNebula(config: NebulaConfig | null): UseProceduralNebulaResult {
  const seed = config?.seed
  const pattern = config?.pattern
  const particleCount = config?.particleCount
  const radius = config?.radius

  const { run } = useWorker<NebulaWorkerRequest, NebulaWorkerResponse>(createNebulaWorker)
  const [result, setResult] = useState<UseProceduralNebulaResult>({
    geometry: null,
    isLoading: false,
  })
  // Guards against a stale async response overwriting state after the config
  // has changed again (or the hook has unmounted).
  const latestRequestRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!seed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult({ geometry: null, isLoading: false })
      return
    }

    const nebulaConfig: NebulaConfig = { seed, pattern, particleCount, radius }
    const requestId = ++latestRequestRef.current

    const commit = (next: UseProceduralNebulaResult) => {
      if (mountedRef.current && requestId === latestRequestRef.current) {
        setResult(next)
      }
    }

    const computeOnMainThread = () => {
      try {
        commit({ geometry: generateNebulaGeometry(nebulaConfig), isLoading: false })
      } catch {
        commit({ geometry: null, isLoading: false })
      }
    }

    commit({ geometry: result.geometry, isLoading: true })

    if (!supportsWorkers) {
      computeOnMainThread()
      return
    }

    run({ config: nebulaConfig })
      .then((response) => {
        if (response.error || !response.geometry) {
          computeOnMainThread()
        } else {
          commit({ geometry: response.geometry, isLoading: false })
        }
      })
      .catch(() => {
        // Worker itself failed to start/respond (e.g. blocked by CSP) - fall
        // back so the feature still works.
        computeOnMainThread()
      })
    // `result.geometry` is intentionally excluded: it is only read above to
    // keep showing the previous geometry while a new one loads, not to
    // retrigger generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, pattern, particleCount, radius, run])

  return result
}
