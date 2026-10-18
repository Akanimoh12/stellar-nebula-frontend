/**
 * Performance Utilities
 *
 * Provides utilities to monitor and optimize rendering loops,
 * tab visibility, battery awareness, and CPU conservation.
 */

export * from './performance/index'

/**
 * Checks whether the document is currently visible.
 */
export function isTabVisible(): boolean {
  if (typeof document === 'undefined') return true
  return !document.hidden
}

/**
 * Subscribes to visibility change events.
 *
 * @param onVisible Callback when document becomes visible
 * @param onHidden Callback when document becomes hidden
 * @returns Cleanup function to remove the listener
 */
export function onVisibilityChange(
  onVisible?: () => void,
  onHidden?: () => void
): () => void {
  if (typeof document === 'undefined') {
    return () => {}
  }

  const handler = () => {
    if (document.hidden) {
      onHidden?.()
    } else {
      onVisible?.()
    }
  }

  document.addEventListener('visibilitychange', handler)
  return () => {
    document.removeEventListener('visibilitychange', handler)
  }
}

/**
 * Returns battery status API if supported by the browser.
 */
export async function getBatteryStatus(): Promise<{
  charging?: boolean
  level?: number
  chargingTime?: number
  dischargingTime?: number
} | null> {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
    return null
  }
  try {
    const battery = await (navigator as any).getBattery()
    return {
      charging: battery.charging,
      level: battery.level,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
    }
  } catch {
    return null
  }
}

/**
 * Suggests frameloop mode based on tab visibility.
 * When hidden, returns 'never' to stop Three.js animation frame loop.
 * When visible, returns 'always' or 'demand'.
 */
export function getRecommendedFrameloop(
  isVisible: boolean,
  mode: 'always' | 'demand' = 'always'
): 'always' | 'demand' | 'never' {
  if (!isVisible) {
    return 'never'
  }
  return mode
}
