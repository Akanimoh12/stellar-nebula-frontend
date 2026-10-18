/**
 * Service worker test helpers (#422).
 *
 * Provides mock factories for the Service Worker API surface used by the app
 * (vite-plugin-pwa's virtual:pwa-register, CacheStorage, ServiceWorkerRegistration).
 * These run in happy-dom / Node — no real service worker runtime is involved.
 */

import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Cache / CacheStorage mocks
// ---------------------------------------------------------------------------

/** A minimal in-memory mock of the Cache interface. */
export function createMockCache(): Cache {
  const store = new Map<string, Response>()
  return {
    match: vi.fn(async (request: RequestInfo) => {
      const url = typeof request === 'string' ? request : (request as Request).url
      return store.get(url) ?? undefined
    }),
    matchAll: vi.fn(async () => [...store.values()]),
    add: vi.fn(async (request: RequestInfo) => {
      const url = typeof request === 'string' ? request : (request as Request).url
      store.set(url, new Response('cached'))
    }),
    addAll: vi.fn(async (requests: RequestInfo[]) => {
      for (const r of requests) {
        const url = typeof r === 'string' ? r : (r as Request).url
        store.set(url, new Response('cached'))
      }
    }),
    put: vi.fn(async (request: RequestInfo, response: Response) => {
      const url = typeof request === 'string' ? request : (request as Request).url
      store.set(url, response)
    }),
    delete: vi.fn(async (request: RequestInfo) => {
      const url = typeof request === 'string' ? request : (request as Request).url
      return store.delete(url)
    }),
    keys: vi.fn(async () => [...store.keys()].map((u) => new Request(u))),
  } as unknown as Cache
}

/** A minimal in-memory CacheStorage mock. */
export function createMockCacheStorage(): CacheStorage {
  const caches = new Map<string, Cache>()
  return {
    open: vi.fn(async (name: string) => {
      if (!caches.has(name)) caches.set(name, createMockCache())
      return caches.get(name)!
    }),
    has: vi.fn(async (name: string) => caches.has(name)),
    delete: vi.fn(async (name: string) => caches.delete(name)),
    keys: vi.fn(async () => [...caches.keys()]),
    match: vi.fn(async (request: RequestInfo) => {
      for (const cache of caches.values()) {
        const hit = await cache.match(request)
        if (hit) return hit
      }
      return undefined
    }),
  } as unknown as CacheStorage
}

// ---------------------------------------------------------------------------
// ServiceWorkerRegistration mock
// ---------------------------------------------------------------------------

export interface MockServiceWorkerRegistration {
  registration: ServiceWorkerRegistration
  /** Simulate a waiting worker becoming available. */
  triggerWaiting: () => void
  /** Simulate the controller changing (new SW activated). */
  triggerControllerChange: () => void
}

export function createMockSWRegistration(): MockServiceWorkerRegistration {
  let onupdatefound: (() => void) | null = null

  const waitingSW = {
    state: 'installed' as ServiceWorkerState,
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    scriptURL: '/sw.js',
    onstatechange: null,
  } as unknown as ServiceWorker

  const activeSW = {
    state: 'activated' as ServiceWorkerState,
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    scriptURL: '/sw.js',
    onstatechange: null,
  } as unknown as ServiceWorker

  const registration = {
    installing: null,
    waiting: null as ServiceWorker | null,
    active: activeSW,
    scope: '/',
    updateViaCache: 'imports' as ServiceWorkerUpdateViaCache,
    update: vi.fn(async () => {}),
    unregister: vi.fn(async () => true),
    get onupdatefound() {
      return onupdatefound
    },
    set onupdatefound(fn: (() => void) | null) {
      onupdatefound = fn
    },
    addEventListener: vi.fn((event: string, cb: () => void) => {
      if (event === 'updatefound') onupdatefound = cb
    }),
    removeEventListener: vi.fn(),
    navigationPreload: {
      enable: vi.fn(),
      disable: vi.fn(),
      setHeaderValue: vi.fn(),
      getState: vi.fn(async () => ({ enabled: false, headerValue: '' })),
    },
    dispatchEvent: vi.fn(),
  } as unknown as ServiceWorkerRegistration

  return {
    registration,
    triggerWaiting() {
      ;(registration as { waiting: ServiceWorker | null }).waiting = waitingSW
      onupdatefound?.()
    },
    triggerControllerChange() {
      const evt = new Event('controllerchange')
      navigator.serviceWorker?.dispatchEvent?.(evt)
    },
  }
}

// ---------------------------------------------------------------------------
// virtual:pwa-register mock factory
// ---------------------------------------------------------------------------

export interface MockRegisterSW {
  /** The mock `updateSW` function returned by `registerSW`. */
  updateSW: ReturnType<typeof vi.fn>
  /** Call the `onNeedRefresh` callback that was passed to `registerSW`. */
  triggerNeedRefresh: () => void
  /** Call the `onOfflineReady` callback that was passed to `registerSW`. */
  triggerOfflineReady: () => void
}

/**
 * Creates a mock of the `virtual:pwa-register` module. Call this before the
 * test and pass the returned `registerSW` to `vi.mock`.
 */
export function createMockRegisterSW(): MockRegisterSW {
  let onNeedRefresh: (() => void) | undefined
  let onOfflineReady: (() => void) | undefined
  const updateSW = vi.fn(async () => {})

  const registerSW = vi.fn((options?: { onNeedRefresh?: () => void; onOfflineReady?: () => void }) => {
    onNeedRefresh = options?.onNeedRefresh
    onOfflineReady = options?.onOfflineReady
    return updateSW
  })

  // Attach to `import('virtual:pwa-register')` — the hook uses a dynamic import.
  vi.mock('virtual:pwa-register', () => ({ registerSW }))

  return {
    updateSW,
    triggerNeedRefresh: () => onNeedRefresh?.(),
    triggerOfflineReady: () => onOfflineReady?.(),
  }
}
