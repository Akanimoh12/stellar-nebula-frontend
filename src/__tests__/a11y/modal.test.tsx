import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/UI/Modal'
import { getFocusableElements, focusFirst } from '@/utils/focus-management'

// ── Modal accessibility (#396) ────────────────────────────────────────────────

function ModalWithTrigger({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <button type="button">Outside the modal</button>
      <Modal
        isOpen={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        title="Confirm action"
      >
        <button type="button">Primary action</button>
        <button type="button">Secondary action</button>
      </Modal>
    </>
  )
}

describe('#396 — modal focus management', () => {
  it('exposes the dialog with aria-modal="true"', async () => {
    const user = userEvent.setup()
    render(<ModalWithTrigger />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('moves focus into the dialog when it opens', async () => {
    const user = userEvent.setup()
    render(<ModalWithTrigger />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<ModalWithTrigger />)
    const trigger = screen.getByRole('button', { name: 'Open modal' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps Tab inside the dialog — never reaches the page behind', async () => {
    const user = userEvent.setup()
    render(<ModalWithTrigger />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    expect(screen.getByRole('button', { name: 'Outside the modal' })).not.toHaveFocus()
  })

  it('wraps Shift+Tab backwards at the first focusable control', async () => {
    const user = userEvent.setup()
    render(<ModalWithTrigger />)
    await user.click(screen.getByRole('button', { name: 'Open modal' }))
    const closeBtn = screen.getByRole('button', { name: /close dialog/i })
    closeBtn.focus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Secondary action' })).toHaveFocus()
  })
})

// ── focus-management utils ────────────────────────────────────────────────────

describe('focus-management utilities', () => {
  it('getFocusableElements returns only visible, non-disabled controls', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <button>Visible</button>
      <button disabled>Disabled</button>
      <button aria-hidden="true">Hidden</button>
      <input type="text" />
    `
    document.body.appendChild(container)

    const elements = getFocusableElements(container)
    const labels = elements.map((el) => (el as HTMLButtonElement | HTMLInputElement).textContent?.trim() || el.tagName)
    expect(labels).toContain('Visible')
    expect(labels).not.toContain('Disabled')

    document.body.removeChild(container)
  })

  it('focusFirst moves focus to the first focusable element', () => {
    const container = document.createElement('div')
    container.innerHTML = `<button>First</button><button>Second</button>`
    document.body.appendChild(container)

    focusFirst(container)
    expect(document.activeElement?.textContent).toBe('First')

    document.body.removeChild(container)
  })
})
