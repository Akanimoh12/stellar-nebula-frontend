import React, { useState, useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export interface MotionToggleProps {
  /** Display variant: 'compact' renders a single toggle button, 'full' includes system reset option. */
  variant?: 'compact' | 'full'
  /** Optional callback fired when the paused/reduced state changes. */
  onMotionChange?: (isPaused: boolean, prefersReducedMotion: boolean) => void
  /** Optional additional CSS class name. */
  className?: string
  /** Optional custom label override. */
  label?: string
}

/**
 * Accessible motion & animation control satisfying WCAG 2.1 SC 2.2.2 (Pause, Stop, Hide).
 * Allows users to pause/resume nebula animations or toggle reduced motion mode,
 * with a minimum 44x44px touch target (WCAG 2.1 SC 2.5.5).
 */
export const MotionToggle: React.FC<MotionToggleProps> = ({
  variant = 'compact',
  onMotionChange,
  className = '',
  label,
}) => {
  const {
    prefersReducedMotion,
    systemPrefersReducedMotion,
    userOverride,
    isPaused,
    toggleReducedMotion,
    togglePause,
    setReducedMotion,
  } = useReducedMotion()

  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    onMotionChange?.(isPaused, prefersReducedMotion)
  }, [isPaused, prefersReducedMotion, onMotionChange])

  const handleToggle = () => {
    const nextPaused = !isPaused
    if (variant === 'full') {
      toggleReducedMotion()
    } else {
      togglePause()
    }
    setAnnouncement(
      nextPaused
        ? 'Animations paused. Reduced motion enabled.'
        : 'Animations resumed. Standard motion enabled.'
    )
  }

  const handleResetToSystem = () => {
    setReducedMotion(null)
    setAnnouncement(
      `Reset motion preference to system default (${systemPrefersReducedMotion ? 'reduced' : 'standard'} motion).`
    )
  }

  const buttonLabel =
    label ?? (isPaused ? 'Resume animations (motion reduced)' : 'Pause animations (reduce motion)')

  return (
    <div
      className={`motion-toggle-container inline-flex items-center gap-2 ${className}`.trim()}
      data-testid="motion-toggle-container"
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isPaused}
        aria-label={buttonLabel}
        data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
        data-paused={isPaused ? 'true' : 'false'}
        className="motion-toggle-btn inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-space-800 hover:bg-space-700 text-white border border-space-600 transition-colors min-h-[44px] min-w-[44px] text-sm font-medium"
        style={{
          minHeight: '44px',
          minWidth: '44px',
        }}
      >
        <span aria-hidden="true" className="inline-flex items-center justify-center">
          {isPaused ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-cosmic-cyan"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-nebula-core"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </span>
        <span>{isPaused ? 'Resume Motion' : 'Pause Motion'}</span>
      </button>

      {variant === 'full' && userOverride !== null && (
        <button
          type="button"
          onClick={handleResetToSystem}
          aria-label="Reset motion preference to system setting"
          className="motion-reset-btn inline-flex items-center justify-center px-3 py-2 rounded-full bg-space-900 hover:bg-space-800 text-xs text-cosmic-cyan border border-space-700 min-h-[44px] min-w-[44px]"
          style={{
            minHeight: '44px',
            minWidth: '44px',
          }}
        >
          Use System ({systemPrefersReducedMotion ? 'Reduced' : 'Normal'})
        </button>
      )}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

export default MotionToggle
