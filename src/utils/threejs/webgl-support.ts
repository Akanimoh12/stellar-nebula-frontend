import { useEffect, useState } from 'react'

const CONTEXT_NAMES = ['webgl2', 'webgl', 'experimental-webgl'] as const

/** Synchronous capability probe: creating a context does not need to wait for a render. */
export function detectWebGlSupport(): boolean {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  for (const name of CONTEXT_NAMES) {
    try {
      if (canvas.getContext(name)) return true
    } catch {
      // Some browsers throw instead of returning null for an unsupported context.
    }
  }
  return false
}

export function useWebGlSupport(): boolean {
  // Computed once on mount via the lazy initializer, rather than set from an
  // effect, which rendered once with `null` and then again with the answer.
  const [isWebGlSupported] = useState(detectWebGlSupport)

  useEffect(() => {
    if (!isWebGlSupported) {
      console.error('WebGL is not supported on this device')
    }
  }, [isWebGlSupported])

  return isWebGlSupported
}
