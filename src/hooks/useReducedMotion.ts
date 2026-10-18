import { useState, useEffect, useCallback } from 'react'

export const REDUCED_MOTION_STORAGE_KEY = 'stellar-nebula:reduced-motion'
export const ANIMATION_PAUSED_STORAGE_KEY = 'stellar-nebula:animations-paused'
const MOTION_CHANGE_EVENT = 'stellar-nebula:motion-preference-change'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export interface UseReducedMotionReturn {
  /** Effective reduced-motion state (manual override if set, otherwise OS/browser preference). */
  prefersReducedMotion: boolean
  /** Raw OS/browser media query value for `(prefers-reduced-motion: reduce)`. */
  systemPrefersReducedMotion: boolean
  /** Manual user override (`true` | `false`), or `null` when following system preference. */
  userOverride: boolean | null
  /** Whether animations are currently paused (either manually paused or reduced motion enabled). */
  isPaused: boolean
  /** Whether the user has explicitly paused animations via the pause control. */
  isManuallyPaused: boolean
  /** Set a manual reduced-motion override (`true`, `false`, or `null` to follow system). */
  setReducedMotion: (override: boolean | null) => void
  /** Toggle reduced-motion mode on or off. */
  toggleReducedMotion: () => void
  /** Explicitly pause animations. */
  pauseAnimations: () => void
  /** Resume animations (and disable reduced-motion override if it was blocking). */
  resumeAnimations: () => void
  /** Toggle animation pause state. */
  togglePause: () => void
}

function getSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function readStoredBoolean(key: string): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

function writeStoredBoolean(key: string, value: boolean | null): void {
  if (typeof window === 'undefined') return
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, String(value))
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

function syncDocumentMotionAttributes(reducedMotion: boolean, paused: boolean): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false')
  root.setAttribute('data-animations-paused', paused ? 'true' : 'false')
  if (reducedMotion || paused) {
    root.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
  }
}

function notifyMotionChange(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MOTION_CHANGE_EVENT))
}

/**
 * Accessibility hook for WCAG 2.1 SC 2.2.2 (Pause, Stop, Hide) and SC 2.3.3 (Animation from Interactions).
 * Respects system `prefers-reduced-motion: reduce` while allowing manual user override and pause/resume controls.
 */
export function useReducedMotion(): UseReducedMotionReturn {
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] =
    useState<boolean>(getSystemReducedMotion)
  const [userOverride, setUserOverride] = useState<boolean | null>(() =>
    readStoredBoolean(REDUCED_MOTION_STORAGE_KEY)
  )
  const [isManuallyPaused, setIsManuallyPaused] = useState<boolean>(
    () => readStoredBoolean(ANIMATION_PAUSED_STORAGE_KEY) === true
  )

  const prefersReducedMotion = userOverride !== null ? userOverride : systemPrefersReducedMotion
  const isPaused = isManuallyPaused || prefersReducedMotion

  // Listen to OS/browser prefers-reduced-motion media query changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersReducedMotion(event.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  // Synchronize state across multiple hook instances in the same tab or across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncFromStorage = () => {
      setUserOverride(readStoredBoolean(REDUCED_MOTION_STORAGE_KEY))
      setIsManuallyPaused(readStoredBoolean(ANIMATION_PAUSED_STORAGE_KEY) === true)
    }

    window.addEventListener(MOTION_CHANGE_EVENT, syncFromStorage)
    window.addEventListener('storage', syncFromStorage)
    return () => {
      window.removeEventListener(MOTION_CHANGE_EVENT, syncFromStorage)
      window.removeEventListener('storage', syncFromStorage)
    }
  }, [])

  // Sync attributes onto <html> for CSS rules
  useEffect(() => {
    syncDocumentMotionAttributes(prefersReducedMotion, isPaused)
  }, [prefersReducedMotion, isPaused])

  const setReducedMotion = useCallback((override: boolean | null) => {
    writeStoredBoolean(REDUCED_MOTION_STORAGE_KEY, override)
    setUserOverride(override)
    if (override === false) {
      writeStoredBoolean(ANIMATION_PAUSED_STORAGE_KEY, false)
      setIsManuallyPaused(false)
    }
    notifyMotionChange()
  }, [])

  const toggleReducedMotion = useCallback(() => {
    const currentEffective =
      readStoredBoolean(REDUCED_MOTION_STORAGE_KEY) ?? getSystemReducedMotion()
    const nextValue = !currentEffective
    writeStoredBoolean(REDUCED_MOTION_STORAGE_KEY, nextValue)
    setUserOverride(nextValue)
    if (!nextValue) {
      writeStoredBoolean(ANIMATION_PAUSED_STORAGE_KEY, false)
      setIsManuallyPaused(false)
    }
    notifyMotionChange()
  }, [])

  const pauseAnimations = useCallback(() => {
    writeStoredBoolean(ANIMATION_PAUSED_STORAGE_KEY, true)
    setIsManuallyPaused(true)
    notifyMotionChange()
  }, [])

  const resumeAnimations = useCallback(() => {
    writeStoredBoolean(ANIMATION_PAUSED_STORAGE_KEY, false)
    setIsManuallyPaused(false)
    if (readStoredBoolean(REDUCED_MOTION_STORAGE_KEY) !== null || getSystemReducedMotion()) {
      writeStoredBoolean(REDUCED_MOTION_STORAGE_KEY, false)
      setUserOverride(false)
    }
    notifyMotionChange()
  }, [])

  const togglePause = useCallback(() => {
    const currentlyPaused =
      readStoredBoolean(ANIMATION_PAUSED_STORAGE_KEY) === true ||
      (readStoredBoolean(REDUCED_MOTION_STORAGE_KEY) ?? getSystemReducedMotion())
    if (currentlyPaused) {
      resumeAnimations()
    } else {
      pauseAnimations()
    }
  }, [pauseAnimations, resumeAnimations])

  return {
    prefersReducedMotion,
    systemPrefersReducedMotion,
    userOverride,
    isPaused,
    isManuallyPaused,
    setReducedMotion,
    toggleReducedMotion,
    pauseAnimations,
    resumeAnimations,
    togglePause,
  }
}
