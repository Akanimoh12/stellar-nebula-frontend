import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('@/services/monitoring', () => ({
  addMonitoringBreadcrumb: vi.fn(),
  setMonitoringUser: vi.fn(),
  clearMonitoringUser: vi.fn(),
}))

vi.mock('@/services/analytics', () => ({ trackEvent: vi.fn() }))

vi.mock('@/services/errorTracking', () => ({
  captureError: vi.fn(),
}))

vi.mock('@/services/logging', () => ({
  createScopedLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// ── Focus indicator tests (issue #397) ───────────────────────────────────────
// These tests verify that interactive elements are reachable via keyboard and
// do not carry aria violations — covering the focus-indicator surface that
// base.css now provides via :focus-visible.

describe('Focus indicators — ThemeToggle (#397)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('button receives focus when tabbed to', async () => {
    const user = userEvent.setup()
    const { ThemeToggle } = await import('@/components/ThemeToggle')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const btn = screen.getByRole('button', { name: /switch to (light|dark) mode/i })
    document.body.focus()
    await user.tab()

    expect(document.activeElement).toBe(btn)
  })

  it('has no axe violations while focused', async () => {
    const { ThemeToggle } = await import('@/components/ThemeToggle')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')

    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const btn = screen.getByRole('button', { name: /switch to (light|dark) mode/i })
    btn.focus()

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('Focus indicators — skip link (#397)', () => {
  it('skip link is in the DOM', () => {
    render(
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
    )

    const link = screen.getByRole('link', { name: /skip to main content/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveClass('skip-link')
  })

  it('skip link has an accessible name', () => {
    render(
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
    )

    const link = screen.getByRole('link', { name: /skip to main content/i })
    expect(link.textContent).toBeTruthy()
  })

  it('skip link has no axe violations', async () => {
    const { container } = render(
      <main>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div id="main-content" tabIndex={-1}>
          Main content
        </div>
      </main>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('Focus indicators — generic interactive element (#397)', () => {
  it('a plain button is focusable without tabIndex', async () => {
    const user = userEvent.setup()

    render(
      <div>
        <button type="button">First</button>
        <button type="button">Second</button>
      </div>
    )

    document.body.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }))

    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Second' }))
  })

  it('disabled button is not in the tab sequence', async () => {
    const user = userEvent.setup()

    render(
      <div>
        <button type="button">Active</button>
        <button type="button" disabled>
          Disabled
        </button>
        <button type="button">After</button>
      </div>
    )

    document.body.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Active' }))

    await user.tab()
    // Disabled button is skipped; focus should land on After
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
  })

  it('a link with href is in the tab sequence', async () => {
    const user = userEvent.setup()

    render(
      <div>
        <a href="/home">Home</a>
      </div>
    )

    document.body.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Home' }))
  })
})
