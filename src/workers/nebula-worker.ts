/**
 * Web Worker that offloads expensive nebula geometry generation off the main
 * thread (#383). `generateNebulaGeometry` can run for well over 50ms at the
 * default particle count (and much longer at the max of 100 000), which was
 * previously showing up as a Lighthouse long task and janking interactions
 * during generation. Running it here keeps the main thread free to render
 * and respond to input while the worker computes.
 *
 * This file is bundled by Vite as a separate worker entry; import it with
 * `new Worker(new URL('../workers/nebula-worker.ts', import.meta.url), { type: 'module' })`.
 */
import { generateNebulaGeometry } from '@/utils/procedural/nebula'
import type { NebulaConfig, NebulaGeometry } from '@/utils/procedural/nebula'

export interface NebulaWorkerRequest {
  /** Correlates a response to the request that triggered it. */
  id: number
  config: NebulaConfig
}

export interface NebulaWorkerResponse {
  id: number
  geometry: NebulaGeometry | null
  error?: string
}

/**
 * Minimal structural type for the worker global scope, used instead of the
 * "webworker" lib (which conflicts with the "DOM" lib already required by
 * the rest of the app) to keep this file's typing self-contained.
 */
interface WorkerContext {
  postMessage: (message: NebulaWorkerResponse, transfer?: Transferable[]) => void
  onmessage: ((event: MessageEvent<NebulaWorkerRequest>) => void) | null
}

const ctx = self as unknown as WorkerContext

ctx.onmessage = (event) => {
  const { id, config } = event.data

  try {
    const geometry = generateNebulaGeometry(config)
    // Transfer the underlying ArrayBuffers instead of structured-cloning them -
    // avoids copying potentially tens of MB of Float32Array data back to the
    // main thread.
    ctx.postMessage({ id, geometry }, [
      geometry.positions.buffer,
      geometry.colors.buffer,
      geometry.sizes.buffer,
      geometry.opacities.buffer,
    ])
  } catch (error) {
    ctx.postMessage({
      id,
      geometry: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
