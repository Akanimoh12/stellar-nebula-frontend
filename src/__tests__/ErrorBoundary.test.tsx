import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '../test/utils'
import ErrorBoundary from '../components/ErrorBoundary/ErrorBoundary'
import { captureError } from '../services/errorTracking'
import { trackEvent } from '../services/analytics'
import { createThrowingComponent, silenceConsoleError } from '../test/helpers/error-helpers'

vi.mock('../services/errorTracking', () => ({ captureError: vi.fn() }))
vi.mock('../services/analytics', () => ({ trackEvent: vi.fn() }))

let restoreConsole: () => void
beforeEach(() => {
  vi.clearAllMocks()
  restoreConsole = silenceConsoleError()
})
afterEach(() => {
  restoreConsole()
})

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>Healthy</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('renders the default fallback with the error message', () => {
    const { ThrowError } = createThrowingComponent('Render exploded')
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Render exploded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload application/i })).toBeInTheDocument()
  })

  it('renders a custom fallback when provided', () => {
    const { ThrowError } = createThrowingComponent()
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('reports the error to tracking, analytics and onError', () => {
    const onError = vi.fn()
    const { ThrowError } = createThrowingComponent('Tracked failure')
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(captureError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Tracked failure' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    )
    expect(trackEvent).toHaveBeenCalledWith(
      'error_reported',
      expect.objectContaining({ autoRetry: false })
    )
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('recovers when Try Again is clicked after the cause is fixed', () => {
    const { ThrowError, control } = createThrowingComponent()
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    control.shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('Recovered content')).toBeInTheDocument()
  })

  it('retries transient errors automatically', async () => {
    const { ThrowError, control } = createThrowingComponent('network request failed')
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith(
      'error_reported',
      expect.objectContaining({ autoRetry: true })
    )

    control.shouldThrow = false
    expect(await screen.findByText('Recovered content', {}, { timeout: 2000 })).toBeInTheDocument()
  })
})
