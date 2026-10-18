import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))

// Reset any runtime request handlers added during tests and clean up
// browser-like storage between tests so no suite leaks state into another (#421).
afterEach(() => {
  server.resetHandlers()

  // Clear both storage mechanisms. The localStorage mock below keeps an
  // internal object that `.clear()` empties; sessionStorage (if present in the
  // environment) is cleaned too for parity.
  localStorage.clear()
  try {
    sessionStorage.clear()
  } catch {
    // sessionStorage may not exist in every happy-dom configuration — ignore.
  }
})

// Clean up once tests finish
afterAll(() => server.close())

// happy-dom's localStorage may be unavailable or incomplete depending on the
// --localstorage-file flag. Provide a reliable in-memory shim for all tests.
const localStorageStore: Record<string, string> = {}
const localStorageMock: Storage = {
  get length() {
    return Object.keys(localStorageStore).length
  },
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
