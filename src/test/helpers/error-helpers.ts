import { createElement } from 'react'
import { vi } from 'vitest'

/**
 * Renders `children`, or throws `message` while `shouldThrow()` returns true.
 * Flip the flag between renders to test recovery.
 */
export function createThrowingComponent(message = 'Test error') {
  const control = { shouldThrow: true }

  function ThrowError() {
    if (control.shouldThrow) throw new Error(message)
    return createElement('p', null, 'Recovered content')
  }

  return { ThrowError, control }
}

/** Silences React's expected error boundary console output for one test file. */
export function silenceConsoleError() {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  return () => spy.mockRestore()
}
