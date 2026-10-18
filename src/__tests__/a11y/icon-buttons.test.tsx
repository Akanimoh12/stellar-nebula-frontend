import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'
import { IconButton } from '@/components/IconButton'

expect.extend(toHaveNoViolations)

describe('IconButton Accessibility', () => {
  it('renders button with accessible name via aria-label', () => {
    render(
      <IconButton aria-label="Close modal">
        <svg data-testid="test-icon" viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </IconButton>
    )

    const button = screen.getByRole('button', { name: 'Close modal' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Close modal')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('hides child icon from screen readers with aria-hidden="true"', () => {
    render(
      <IconButton aria-label="Search items">
        <svg data-testid="search-icon" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
        </svg>
      </IconButton>
    )

    const wrapper = screen.getByTestId('search-icon').parentElement
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
  })

  it('has zero axe accessibility violations', async () => {
    const { container } = render(
      <div role="region" aria-label="Controls toolbar">
        <IconButton aria-label="Zoom in">
          <span>+</span>
        </IconButton>
        <IconButton aria-label="Zoom out" variant="ghost">
          <span>-</span>
        </IconButton>
        <IconButton aria-label="Reset view" variant="outline" size="sm">
          <span>0</span>
        </IconButton>
      </div>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('handles click events when active', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <IconButton aria-label="Refresh page" onClick={handleClick}>
        <span>↻</span>
      </IconButton>
    )

    const button = screen.getByRole('button', { name: 'Refresh page' })
    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not trigger click events when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <IconButton aria-label="Delete resource" disabled onClick={handleClick}>
        <span>🗑</span>
      </IconButton>
    )

    const button = screen.getByRole('button', { name: 'Delete resource' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies variant and size classes correctly', () => {
    const { rerender } = render(
      <IconButton aria-label="Settings" variant="ghost" size="lg" className="custom-class">
        <span>⚙</span>
      </IconButton>
    )

    const button = screen.getByRole('button', { name: 'Settings' })
    expect(button).toHaveClass('icon-button')
    expect(button).toHaveClass('icon-btn-ghost')
    expect(button).toHaveClass('icon-btn-lg')
    expect(button).toHaveClass('custom-class')

    rerender(
      <IconButton aria-label="Settings" variant="subtle" size="sm">
        <span>⚙</span>
      </IconButton>
    )
    expect(button).toHaveClass('icon-btn-subtle')
    expect(button).toHaveClass('icon-btn-sm')
  })

  it('can be triggered using keyboard navigation (Enter and Space)', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <IconButton aria-label="Submit action" onClick={handleClick}>
        <span>✓</span>
      </IconButton>
    )

    const button = screen.getByRole('button', { name: 'Submit action' })
    button.focus()
    expect(document.activeElement).toBe(button)

    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledTimes(1)

    await user.keyboard(' ')
    expect(handleClick).toHaveBeenCalledTimes(2)
  })
})
