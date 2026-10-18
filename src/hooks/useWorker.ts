import { useCallback, useEffect, useRef } from 'react'

/** Any request/response shape this hook can correlate must carry an `id`. */
interface Identified {
  id: number
}

interface PendingEntry<TResponse> {
  resolve: (value: TResponse) => void
  reject: (reason: unknown) => void
}

export interface UseWorkerResult<TRequest, TResponse> {
  /**
   * Sends `payload` to the worker (an `id` is attached automatically) and
   * resolves with the correlated response. Rejects if the worker throws a
   * global error or is terminated while the request is in flight.
   */
  run: (payload: Omit<TRequest, 'id'>) => Promise<TResponse>
  /** Terminates the underlying worker immediately, rejecting any in-flight requests. */
  terminate: () => void
}

/**
 * Generic hook for talking to a Web Worker from a React component (#383).
 *
 * - Creates the worker lazily, on the first call to `run`, and reuses it for
 *   subsequent calls instead of spawning a new worker per request.
 * - Correlates concurrent requests by an auto-incrementing `id` so that
 *   out-of-order responses (the worker can finish requests in any order)
 *   resolve the correct caller.
 * - Terminates the worker on unmount so it doesn't keep running in the
 *   background after the component is gone.
 *
 * @param createWorker Factory that constructs a new `Worker` instance, e.g.
 *   `() => new Worker(new URL('../workers/foo-worker.ts', import.meta.url), { type: 'module' })`.
 *   Vite needs the `new URL(...)` call written inline (not passed in as a
 *   variable) at each call site, so this hook takes the whole factory rather
 *   than a URL.
 */
export function useWorker<TRequest extends Identified, TResponse extends Identified>(
  createWorker: () => Worker
): UseWorkerResult<TRequest, TResponse> {
  const workerRef = useRef<Worker | null>(null)
  const nextIdRef = useRef(0)
  const pendingRef = useRef(new Map<number, PendingEntry<TResponse>>())

  const rejectAllPending = useCallback((reason: unknown) => {
    for (const entry of pendingRef.current.values()) {
      entry.reject(reason)
    }
    pendingRef.current.clear()
  }, [])

  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    rejectAllPending(new Error('Worker terminated'))
  }, [rejectAllPending])

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      const worker = createWorker()

      worker.onmessage = (event: MessageEvent<TResponse>) => {
        const { id } = event.data
        const entry = pendingRef.current.get(id)
        if (entry) {
          pendingRef.current.delete(id)
          entry.resolve(event.data)
        }
      }

      worker.onerror = (event: ErrorEvent) => {
        rejectAllPending(event.error ?? new Error(event.message || 'Worker error'))
      }

      workerRef.current = worker
    }
    return workerRef.current
  }, [createWorker, rejectAllPending])

  const run = useCallback(
    (payload: Omit<TRequest, 'id'>) => {
      return new Promise<TResponse>((resolve, reject) => {
        const worker = getWorker()
        const id = nextIdRef.current++
        pendingRef.current.set(id, { resolve, reject })
        worker.postMessage({ ...payload, id } as TRequest)
      })
    },
    [getWorker]
  )

  // Terminate the worker when the component using it unmounts.
  useEffect(() => {
    return () => {
      terminate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- terminate is intentionally stable-enough for an unmount-only cleanup
  }, [])

  return { run, terminate }
}
