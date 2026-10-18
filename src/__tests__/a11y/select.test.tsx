import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'
import { Select, type SelectOption } from '@/components/Select'

expect.extend(toHaveNoViolations)

const NETWORK_OPTIONS: SelectOption[] = [
  { value: 'futurenet', label: 'Futurenet', description: 'Experimental Soroban network' },
  { value: 'testnet', label: 'Testnet', description: 'Staging Stellar network' },
  { value: 'mainnet', label: 'Mainnet', description: 'Production Stellar network' },
  { value: 'custom', label: 'Custom RPC (Unavailable)', disabled: true },
]

describe('Select & useCombobox — WAI-ARIA 1.2 Combobox pattern', () => {
  it('has no axe violations when closed and when expanded', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Select
        id="stellar-network"
        label="Stellar Network"
        options={NETWORK_OPTIONS}
        defaultValue="futurenet"
      />
    )

    // Closed state
    const closedResults = await axe(container)
    expect(closedResults).toHaveNoViolations()

    // Expanded state
    const combobox = screen.getByRole('combobox', { name: /stellar network/i })
    await user.click(combobox)
    expect(combobox).toHaveAttribute('aria-expanded', 'true')

    const openResults = await axe(container)
    expect(openResults).toHaveNoViolations()
  })

  it('exposes required ARIA combobox, listbox, and option attributes', async () => {
    const user = userEvent.setup()
    render(
      <Select
        id="quality-select"
        label="Graphics Quality"
        options={NETWORK_OPTIONS}
        defaultValue="testnet"
      />
    )

    const combobox = screen.getByRole('combobox', { name: /graphics quality/i })
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
    expect(combobox).toHaveAttribute('aria-controls', 'quality-select-listbox')

    await user.click(combobox)

    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(combobox).toHaveAttribute('aria-activedescendant', 'quality-select-option-1')

    const listbox = screen.getByRole('listbox', { name: /graphics quality/i })
    expect(listbox).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4)
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[3]).toHaveAttribute('aria-disabled', 'true')
  })

  it('supports keyboard navigation: ArrowDown, ArrowUp, Home, End, Enter, Space, and Escape', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <Select
        id="nav-select"
        label="Stellar Network"
        options={NETWORK_OPTIONS}
        defaultValue="futurenet"
        onChange={handleChange}
      />
    )

    const combobox = screen.getByRole('combobox', { name: /stellar network/i })
    combobox.focus()
    expect(document.activeElement).toBe(combobox)

    // ArrowDown opens the menu on current selection (index 0: Futurenet)
    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(combobox).toHaveAttribute('aria-activedescendant', 'nav-select-option-0')

    // ArrowDown moves to index 1 (Testnet)
    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-activedescendant', 'nav-select-option-1')

    // End jumps to last enabled option (index 2: Mainnet, skipping disabled index 3)
    await user.keyboard('{End}')
    expect(combobox).toHaveAttribute('aria-activedescendant', 'nav-select-option-2')

    // Home jumps back to first enabled option (index 0: Futurenet)
    await user.keyboard('{Home}')
    expect(combobox).toHaveAttribute('aria-activedescendant', 'nav-select-option-0')

    // ArrowUp wraps to last enabled option (index 2: Mainnet)
    await user.keyboard('{ArrowUp}')
    expect(combobox).toHaveAttribute('aria-activedescendant', 'nav-select-option-2')

    // Enter selects the highlighted option (Mainnet) and closes the menu
    await user.keyboard('{Enter}')
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(handleChange).toHaveBeenCalledWith('mainnet', NETWORK_OPTIONS[2])
    expect(combobox).toHaveTextContent('Mainnet')

    // Space re-opens the menu, Escape closes it without changing selection
    await user.keyboard(' ')
    expect(combobox).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(combobox).toHaveTextContent('Mainnet')
  })

  it('announces option selection to screen readers via aria-live region', async () => {
    const user = userEvent.setup()
    render(<Select id="announce-select" label="Network" options={NETWORK_OPTIONS} />)

    const combobox = screen.getByRole('combobox', { name: /network/i })
    await user.click(combobox)

    const testnetOption = screen.getByRole('option', { name: /testnet/i })
    await user.click(testnetOption)

    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    expect(liveRegion).toHaveTextContent('Selected Testnet')
  })

  it('supports typeahead character navigation and skips disabled options', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <Select
        id="typeahead-select"
        label="Network"
        options={NETWORK_OPTIONS}
        defaultValue="futurenet"
        onChange={handleChange}
      />
    )

    const combobox = screen.getByRole('combobox', { name: /network/i })
    combobox.focus()

    // Typing 'm' jumps to 'Mainnet' (index 2) and opens the listbox
    await user.keyboard('m')
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(combobox).toHaveAttribute('aria-activedescendant', 'typeahead-select-option-2')

    // Clicking a disabled option does not select it or close the menu
    const disabledOption = screen.getByRole('option', { name: /custom rpc/i })
    await user.click(disabledOption)
    expect(handleChange).not.toHaveBeenCalled()
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
  })

  it('associates error message with aria-invalid and aria-describedby', () => {
    render(
      <Select
        id="err-select"
        label="Network"
        options={NETWORK_OPTIONS}
        error="Network selection is required"
        required
      />
    )

    const combobox = screen.getByRole('combobox', { name: /network/i })
    expect(combobox).toHaveAttribute('aria-invalid', 'true')
    expect(combobox).toHaveAttribute('aria-required', 'true')
    expect(combobox).toHaveAttribute('aria-describedby', 'err-select-error')
    expect(screen.getByRole('alert')).toHaveTextContent('Network selection is required')
  })
})
