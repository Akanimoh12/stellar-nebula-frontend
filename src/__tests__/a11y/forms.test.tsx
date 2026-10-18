import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useFormAccessibility } from '@/hooks/useFormAccessibility'

// ── useFormAccessibility ──────────────────────────────────────────────────────

function FormFieldHarness({ showError = false, showHint = false }) {
  const ids = useFormAccessibility()
  return (
    <div>
      <label htmlFor={ids.labelId}>Wallet address</label>
      <input
        id={ids.inputId}
        type="text"
        aria-describedby={showError ? ids.errorId : showHint ? ids.hintId : undefined}
        aria-invalid={showError ? 'true' : 'false'}
      />
      {showHint && <p id={ids.hintId}>Enter your Stellar public key (G…)</p>}
      {showError && (
        <p id={ids.errorId} role="alert">
          Invalid public key format
        </p>
      )}
    </div>
  )
}

describe('#395 — form input label associations', () => {
  it('associates the label with the input via matching htmlFor / id', () => {
    render(<FormFieldHarness />)
    const input = screen.getByRole('textbox', { name: 'Wallet address' })
    expect(input).toBeInTheDocument()
  })

  it('exposes the error message through aria-describedby when invalid', () => {
    render(<FormFieldHarness showError />)
    const input = screen.getByRole('textbox', { name: 'Wallet address' })
    expect(input).toHaveAttribute('aria-invalid', 'true')

    const errorId = input.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()
    const errorEl = document.getElementById(errorId!)
    expect(errorEl).toHaveTextContent('Invalid public key format')
  })

  it('exposes hint text through aria-describedby when provided', () => {
    render(<FormFieldHarness showHint />)
    const input = screen.getByRole('textbox', { name: 'Wallet address' })
    expect(input).toHaveAttribute('aria-invalid', 'false')

    const hintId = input.getAttribute('aria-describedby')
    expect(hintId).toBeTruthy()
    const hintEl = document.getElementById(hintId!)
    expect(hintEl).toHaveTextContent('Enter your Stellar public key')
  })

  it('generates unique IDs for each instance so two fields do not collide', () => {
    function TwoFields() {
      const a = useFormAccessibility()
      const b = useFormAccessibility()
      return (
        <>
          <label htmlFor={a.labelId}>Name</label>
          <input id={a.inputId} />
          <label htmlFor={b.labelId}>Email</label>
          <input id={b.inputId} />
        </>
      )
    }

    render(<TwoFields />)
    const [nameInput, emailInput] = screen.getAllByRole('textbox')
    expect(nameInput.id).not.toBe(emailInput.id)
    expect(nameInput).toBeInTheDocument()
    expect(emailInput).toBeInTheDocument()
  })

  it('each field is reachable by its label text', () => {
    function TwoFields() {
      const a = useFormAccessibility()
      const b = useFormAccessibility()
      return (
        <>
          <label htmlFor={a.labelId}>Name</label>
          <input id={a.inputId} />
          <label htmlFor={b.labelId}>Email</label>
          <input id={b.inputId} />
        </>
      )
    }

    render(<TwoFields />)
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument()
  })
})
