import { useCallback, type RefObject } from 'react'
import type { ResourceType } from '@/types/game'
import { SCAN_POINTS_META } from './scanPoints'

interface ScanPointKeyboardNavOptions {
  wrapperRef: RefObject<HTMLDivElement | null>
  focusedPointId: string | null
  setFocusedPointId: (pointId: string | null) => void
  onScan: (pointId: string, resourceType: ResourceType, amount: number) => void
  onTogglePause: () => void
}

/**
 * Keyboard handling for the nebula canvas wrapper: Enter/Space scans the focused point,
 * arrow keys and Home/End move between points, and P toggles motion pause.
 */
export function useScanPointKeyboardNav({
  wrapperRef,
  focusedPointId,
  setFocusedPointId,
  onScan,
  onTogglePause,
}: ScanPointKeyboardNavOptions) {
  return useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Handle Enter / Space to scan focused point
      if ((event.key === 'Enter' || event.key === ' ') && focusedPointId) {
        event.preventDefault()
        const point = SCAN_POINTS_META.find((p) => p.id === focusedPointId)
        if (point) {
          onScan(point.id, point.resourceType, point.resourceAmount)
        }
        return
      }

      // Arrow keys for focus navigation between scan points when a point is focused
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        // If focus is on wrapper itself (not on a button), cycle to next point
        const active = document.activeElement
        const isButtonFocused = SCAN_POINTS_META.some(
          (p) => active?.getAttribute('data-scan-id') === p.id
        )
        if (!isButtonFocused && wrapperRef.current?.contains(active)) {
          // Only intercept if wrapper contains focus but not button -> let CameraControls handle orbit
          return
        }
        if (isButtonFocused) {
          event.preventDefault()
          const currentIdx = SCAN_POINTS_META.findIndex((p) => p.id === focusedPointId)
          const nextIdx = (currentIdx + 1) % SCAN_POINTS_META.length
          const nextId = SCAN_POINTS_META[nextIdx].id
          setFocusedPointId(nextId)
          const nextBtn = wrapperRef.current?.querySelector<HTMLButtonElement>(
            `[data-scan-id="${nextId}"]`
          )
          nextBtn?.focus()
        }
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        const active = document.activeElement
        const isButtonFocused = SCAN_POINTS_META.some(
          (p) => active?.getAttribute('data-scan-id') === p.id
        )
        if (isButtonFocused) {
          event.preventDefault()
          const currentIdx = SCAN_POINTS_META.findIndex((p) => p.id === focusedPointId)
          const prevIdx = (currentIdx - 1 + SCAN_POINTS_META.length) % SCAN_POINTS_META.length
          const prevId = SCAN_POINTS_META[prevIdx].id
          setFocusedPointId(prevId)
          const prevBtn = wrapperRef.current?.querySelector<HTMLButtonElement>(
            `[data-scan-id="${prevId}"]`
          )
          prevBtn?.focus()
        }
      }

      // Home / End to jump to first/last
      if (event.key === 'Home' && focusedPointId) {
        event.preventDefault()
        const firstId = SCAN_POINTS_META[0].id
        setFocusedPointId(firstId)
        wrapperRef.current?.querySelector<HTMLButtonElement>(`[data-scan-id="${firstId}"]`)?.focus()
      }
      if (event.key === 'End' && focusedPointId) {
        event.preventDefault()
        const lastId = SCAN_POINTS_META[SCAN_POINTS_META.length - 1].id
        setFocusedPointId(lastId)
        wrapperRef.current?.querySelector<HTMLButtonElement>(`[data-scan-id="${lastId}"]`)?.focus()
      }

      if (event.key.toLowerCase() === 'p' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        onTogglePause()
      }
    },
    [focusedPointId, onScan, onTogglePause, setFocusedPointId, wrapperRef]
  )
}
