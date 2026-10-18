import { useEffect, useRef, useState, useCallback } from 'react'

export interface FrameInfo {
  timestamp: number
  delta: number
  frameCount: number
}

export interface UseAnimationFrameOptions {
  enabled?: boolean
  pauseWhenHidden?: boolean
  fpsLimit?: number
}

/**
 * Hook to track tab visibility state using the Page Visibility API.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true
    return !document.hidden
  })

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return isVisible
}

/**
 * Optimized requestAnimationFrame hook that integrates Page Visibility API
 * to pause animation loops when the tab is inactive, reducing CPU and mobile battery consumption.
 */
export function useAnimationFrame(
  callback: (frameInfo: FrameInfo) => void,
  options: UseAnimationFrameOptions = {}
): {
  isPaused: boolean
  pause: () => void
  resume: () => void
} {
  const { enabled = true, pauseWhenHidden = true, fpsLimit } = options

  const [manuallyPaused, setManuallyPaused] = useState(false)
  const isVisible = usePageVisibility()

  const isPaused = !enabled || manuallyPaused || (pauseWhenHidden && !isVisible)

  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

  const rafIdRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const frameCountRef = useRef<number>(0)
  const minFrameInterval = fpsLimit && fpsLimit > 0 ? 1000 / fpsLimit : 0

  const loop = useCallback(
    function frame(timestamp: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp
      }

      const delta = timestamp - lastTimeRef.current

      if (delta >= minFrameInterval) {
        lastTimeRef.current = timestamp - (delta % (minFrameInterval || 1))
        frameCountRef.current += 1

        callbackRef.current({
          timestamp,
          delta,
          frameCount: frameCountRef.current,
        })
      }

      rafIdRef.current = requestAnimationFrame(frame)
    },
    [minFrameInterval]
  )

  useEffect(() => {
    if (isPaused) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      // Reset lastTimeRef so resuming does not cause a huge delta jump
      lastTimeRef.current = null
      return
    }

    rafIdRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      lastTimeRef.current = null
    }
  }, [isPaused, loop])

  const pause = useCallback(() => setManuallyPaused(true), [])
  const resume = useCallback(() => setManuallyPaused(false), [])

  return { isPaused, pause, resume }
}
