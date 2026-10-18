import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'
import { SkipLink, SkipLinks } from '@/components/SkipLink'

expect.extend(toHaveNoViolations)

describe('Skip Navigation Links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skip links for main content and navigation', () => {
    render(<SkipLinks />)

    const mainLink = screen.getByRole('link', { name: /skip to main content/i })
    const navLink = screen.getByRole('link', { name: /skip to navigation/i })

    expect(mainLink).toBeInTheDocument()
    expect(mainLink).toHaveAttribute('href', '#main-content')
    expect(mainLink).toHaveClass('skip-link')

    expect(navLink).toBeInTheDocument()
    expect(navLink).toHaveAttribute('href', '#navigation')
    expect(navLink).toHaveClass('skip-link')
  })

  it('renders a single SkipLink with targetId and custom children', () => {
    render(
      <SkipLink targetId="custom-section" className="custom-skip">
        Skip to custom section
      </SkipLink>
    )

    const link = screen.getByRole('link', { name: /skip to custom section/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '#custom-section')
    expect(link).toHaveClass('skip-link')
    expect(link).toHaveClass('custom-skip')
  })

  it('moves focus to the target element when clicked', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <SkipLinks mainId="target-main" navId="target-nav" />
        <nav id="target-nav">
          <a href="/home">Home</a>
        </nav>
        <main id="target-main">
          <h1>Main Content Heading</h1>
        </main>
      </div>
    )

    const mainLink = screen.getByRole('link', { name: /skip to main content/i })
    const mainTarget = document.getElementById('target-main')!

    await user.click(mainLink)
    expect(document.activeElement).toBe(mainTarget)
  })

  it('moves focus to navigation target when navigation skip link is clicked', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <SkipLinks mainId="target-main" navId="target-nav" />
        <nav id="target-nav">
          <a href="/home">Home</a>
        </nav>
        <main id="target-main">
          <h1>Main Content Heading</h1>
        </main>
      </div>
    )

    const navLink = screen.getByRole('link', { name: /skip to navigation/i })
    const navTarget = document.getElementById('target-nav')!

    await user.click(navLink)
    expect(document.activeElement).toBe(navTarget)
  })

  it('receives focus in proper tab order', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <SkipLinks />
        <button type="button">Next button</button>
      </div>
    )

    document.body.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: /skip to main content/i }))

    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: /skip to navigation/i }))

    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /next button/i }))
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <div>
        <SkipLinks />
        <nav id="navigation">
          <a href="/">Home</a>
        </nav>
        <main id="main-content">
          <h1>Stellar Nebula</h1>
        </main>
      </div>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
