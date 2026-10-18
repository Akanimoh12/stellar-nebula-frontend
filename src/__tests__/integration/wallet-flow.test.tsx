import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WalletProvider } from '@/contexts/WalletContext'
import { WalletDisplay } from '@/components/Wallet/WalletDisplay'
import { ConnectModal } from '@/components/Wallet/ConnectModal'
import * as walletServices from '@/services/wallets'

// Mock the wallet services module
vi.mock('@/services/wallets', async () => {
  const actual = await vi.importActual<typeof import('@/services/wallets')>('@/services/wallets')
  return {
    ...actual,
    isFreighterInstalled: vi.fn(),
    connectFreighter: vi.fn(),
    getFreighterNetwork: vi.fn().mockResolvedValue('testnet'),
    isAlbedoAvailable: vi.fn().mockReturnValue(true),
    connectAlbedo: vi.fn(),
    getAlbedoNetwork: vi.fn().mockResolvedValue('testnet'),
    isLedgerAvailable: vi.fn().mockResolvedValue(false),
    isXBullInstalled: vi.fn().mockResolvedValue(false),
    isWalletConnectAvailable: vi.fn().mockReturnValue(false),
  }
})

function WalletIntegrationHarness() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <WalletProvider>
      <div data-testid="wallet-harness">
        <WalletDisplay onOpenConnectModal={() => setModalOpen(true)} />
        <ConnectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </WalletProvider>
  )
}

describe('Wallet Flow Component Integration', () => {
  const MOCK_PUBLIC_KEY = 'GBBD47IF6LWK7P7MDEVTESTTESTTESTTESTTESTTESTTESTTEST'

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('coordinates connect modal opening from wallet display when disconnected', () => {
    render(<WalletIntegrationHarness />)

    const connectButton = screen.getByRole('button', { name: /connect wallet/i })
    expect(connectButton).toBeInTheDocument()

    // Click to open modal
    fireEvent.click(connectButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/select your wallet/i)).toBeInTheDocument()
  })

  it('completes connection flow with Freighter, updates wallet state, and displays address', async () => {
    vi.mocked(walletServices.isFreighterInstalled).mockResolvedValue(true)
    vi.mocked(walletServices.connectFreighter).mockResolvedValue(MOCK_PUBLIC_KEY)

    render(<WalletIntegrationHarness />)

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }))

    // Click Freighter option
    const freighterOption = screen.getByText('Freighter')
    fireEvent.click(freighterOption)

    // Wait for wallet state update and modal close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Assert connected address is shown truncated in WalletDisplay
    await waitFor(() => {
      expect(screen.getByText(/GBBD47…EVTEST/i)).toBeInTheDocument()
    })
  })

  it('handles disconnect flow and returns components to initial state', async () => {
    vi.mocked(walletServices.isFreighterInstalled).mockResolvedValue(true)
    vi.mocked(walletServices.connectFreighter).mockResolvedValue(MOCK_PUBLIC_KEY)

    render(<WalletIntegrationHarness />)

    // Connect
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }))
    fireEvent.click(screen.getByText('Freighter'))

    await waitFor(() => {
      expect(screen.getByText(/GBBD47…EVTEST/i)).toBeInTheDocument()
    })

    // Find and click disconnect button
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    fireEvent.click(disconnectButton)

    // Verify reset to disconnected state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
    })
  })

  it('handles connection error and displays error message in modal', async () => {
    vi.mocked(walletServices.isFreighterInstalled).mockResolvedValue(true)
    vi.mocked(walletServices.connectFreighter).mockRejectedValue(new Error('User rejected connection'))

    render(<WalletIntegrationHarness />)

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }))
    fireEvent.click(screen.getByText('Freighter'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/user rejected connection/i)).toBeInTheDocument()
    })
  })
})
