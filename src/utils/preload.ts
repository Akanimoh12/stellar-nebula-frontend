/**
 * Asset Preloading Utility
 *
 * Preloads critical assets (fonts, images, 3D assets) to optimize
 * Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS).
 */

export interface PreloadOptions {
  crossOrigin?: 'anonymous' | 'use-credentials'
  media?: string
  importance?: 'high' | 'low' | 'auto'
}

/**
 * Dynamically injects a <link rel="preload"> tag into document head.
 */
export function preloadAsset(
  href: string,
  asType: 'image' | 'font' | 'script' | 'style' | 'fetch',
  options: PreloadOptions = {}
): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null

  // Check if link already exists
  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`)
  if (existing) {
    return existing as HTMLLinkElement
  }

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = asType

  if (asType === 'font') {
    link.crossOrigin = options.crossOrigin ?? 'anonymous'
  } else if (options.crossOrigin) {
    link.crossOrigin = options.crossOrigin
  }

  if (options.media) {
    link.media = options.media
  }

  if (options.importance) {
    ;(link as HTMLLinkElement & { importance?: string }).importance = options.importance
  }

  document.head.appendChild(link)
  return link
}

/**
 * Preloads an image into the browser cache.
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      resolve()
      return
    }

    const img = new Image()
    img.src = src
    if (img.complete) {
      resolve()
      return
    }

    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`))
  })
}

/**
 * Preloads a font face using the CSS Font Loading API if available.
 */
export async function preloadFont(
  family: string,
  sourceUrl: string,
  descriptors: FontFaceDescriptors = {}
): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return

  try {
    const font = new FontFace(family, `url(${sourceUrl})`, descriptors)
    await font.load()
    document.fonts.add(font)
  } catch (_err) {
    // Graceful fallback to browser standard discovery
    preloadAsset(sourceUrl, 'font', { crossOrigin: 'anonymous' })
  }
}

/**
 * Critical assets required across primary routes.
 */
export const CRITICAL_ASSETS = {
  fonts: ['https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2'],
  images: ['/icon-192.png', '/vite.svg'],
}

/**
 * Initiates preloading of critical assets during startup or idle periods.
 */
export function preloadCriticalAssets(): void {
  if (typeof window === 'undefined') return

  const executePreload = () => {
    // Preload critical images
    for (const imgUrl of CRITICAL_ASSETS.images) {
      preloadAsset(imgUrl, 'image')
    }

    // Preconnect to Google Fonts domains
    const domains = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']
    for (const domain of domains) {
      if (!document.querySelector(`link[rel="preconnect"][href="${domain}"]`)) {
        const link = document.createElement('link')
        link.rel = 'preconnect'
        link.href = domain
        if (domain.includes('gstatic')) {
          link.crossOrigin = 'anonymous'
        }
        document.head.appendChild(link)
      }
    }
  }

  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  }

  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(executePreload, { timeout: 2000 })
  } else {
    setTimeout(executePreload, 1)
  }
}
