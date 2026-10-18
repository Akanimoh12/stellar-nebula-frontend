import { useEffect, useState } from 'react'
import { trackWebVital, type WebVitalMetric } from '@/services/monitoring'

export type WebVitalRating = 'good' | 'needs-improvement' | 'poor'

export interface WebVitalsState {
  fcp?: WebVitalMetric
  lcp?: WebVitalMetric
  cls?: WebVitalMetric
  fid?: WebVitalMetric
  ttfb?: WebVitalMetric
}

function getRating(name: WebVitalMetric['name'], value: number): WebVitalRating {
  switch (name) {
    case 'FCP':
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor'
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
    case 'FID':
      return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor'
    case 'TTFB':
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor'
    default:
      return 'good'
  }
}

/**
 * Initializes Core Web Vitals observation and reporting to Sentry/monitoring.
 */
export function initWebVitalsMonitoring(onReport?: (metric: WebVitalMetric) => void): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => {}
  }

  const observers: PerformanceObserver[] = []

  const report = (name: WebVitalMetric['name'], value: number, id?: string) => {
    const metric: WebVitalMetric = {
      name,
      value,
      rating: getRating(name, value),
      id,
    }
    trackWebVital(metric)
    onReport?.(metric)
  }

  // 1. TTFB (Time to First Byte)
  try {
    const navEntries = performance.getEntriesByType('navigation')
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming
      const ttfb = nav.responseStart - (nav.requestStart || 0)
      if (ttfb >= 0) {
        report('TTFB', ttfb, 'navigation-timing')
      }
    } else {
      const navObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        if (entries.length > 0) {
          const nav = entries[0] as PerformanceNavigationTiming
          const ttfb = nav.responseStart - (nav.requestStart || 0)
          if (ttfb >= 0) {
            report('TTFB', ttfb, 'navigation-observer')
          }
        }
      })
      navObserver.observe({ type: 'navigation', buffered: true })
      observers.push(navObserver)
    }
  } catch {
    // Navigation timing observer unsupported
  }

  // 2. FCP (First Contentful Paint)
  try {
    const paintObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          report('FCP', entry.startTime, entry.name)
        }
      }
    })
    paintObserver.observe({ type: 'paint', buffered: true })
    observers.push(paintObserver)
  } catch {
    // Paint observer unsupported
  }

  // 3. LCP (Largest Contentful Paint)
  try {
    let largestLcp = 0
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (lastEntry && lastEntry.startTime > largestLcp) {
        largestLcp = lastEntry.startTime
        report('LCP', largestLcp, (lastEntry as any).id || 'lcp-element')
      }
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    observers.push(lcpObserver)
  } catch {
    // LCP observer unsupported
  }

  // 4. CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
          report('CLS', clsValue, 'layout-shift')
        }
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
    observers.push(clsObserver)
  } catch {
    // CLS observer unsupported
  }

  // 5. FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0] as any
      if (firstInput) {
        const fid = firstInput.processingStart - firstInput.startTime
        report('FID', fid, firstInput.name)
      }
    })
    fidObserver.observe({ type: 'first-input', buffered: true })
    observers.push(fidObserver)
  } catch {
    // FID observer unsupported
  }

  return () => {
    for (const observer of observers) {
      observer.disconnect()
    }
  }
}

/**
 * React hook to observe Core Web Vitals in real-time.
 */
export function useWebVitals(): WebVitalsState {
  const [vitals, setVitals] = useState<WebVitalsState>({})

  useEffect(() => {
    const cleanup = initWebVitalsMonitoring((metric) => {
      setVitals((prev) => ({
        ...prev,
        [metric.name.toLowerCase()]: metric,
      }))
    })

    return cleanup
  }, [])

  return vitals
}
