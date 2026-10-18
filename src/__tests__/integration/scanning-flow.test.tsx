import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useScanCooldown } from '@/hooks/useScanCooldown'
import { useGameStore } from '@/store/gameStore'
import type { ResourceType } from '@/types/game'

interface ScanControlProps {
  pointId: string
  resourceType: ResourceType
  onScanSuccess: (resource: ResourceType, amount: number) => void
}

function ScanningComponentHarness({ pointId, resourceType, onScanSuccess }: ScanControlProps) {
  const { canScan, startCooldown, getRemainingSeconds } = useScanCooldown()
  const [isScanning, setIsScanning] = useState(false)
  const remaining = getRemainingSeconds(pointId)
  const available = canScan(pointId) && !isScanning

  const handleScan = async () => {
    if (!canScan(pointId)) return
    setIsScanning(true)

    // Simulate API call to /api/v1/scan
    const response = await fetch('https://api.test/api/v1/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pointId, resourceType }),
    })
    const payload = (await response.json()) as { success: boolean }

    if (payload.success) {
      // Apply cooldown (5000ms)
      startCooldown(pointId, 5000)
      onScanSuccess(resourceType, 42)
    }
    setIsScanning(false)
  }

  return (
    <div data-testid={`scan-point-${pointId}`}>
      <h3>Scan Point: {pointId}</h3>
      <p>Status: {available ? 'Ready' : isScanning ? 'Scanning…' : `Cooldown (${remaining}s)`}</p>
      <button
        type="button"
        disabled={!available}
        onClick={handleScan}
      >
        {isScanning ? 'Scanning…' : 'Initiate Scan'}
      </button>
    </div>
  )
}

describe('Scanning Flow Component Integration', () => {
  const POINT_ID = 'nebula-alpha-scan'

  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.setState({
      scanCooldowns: [],
      activeOperation: null,
      phase: 'playing',
    })
  })

  it('coordinates scanning initiation, API request, and state transition to cooldown', async () => {
    const handleSuccess = vi.fn()

    render(
      <ScanningComponentHarness
        pointId={POINT_ID}
        resourceType="nebulite"
        onScanSuccess={handleSuccess}
      />
    )

    const scanButton = screen.getByRole('button', { name: /initiate scan/i })
    expect(scanButton).toBeEnabled()
    expect(screen.getByText(/status: ready/i)).toBeInTheDocument()

    // Initiate scan
    await act(async () => {
      fireEvent.click(scanButton)
    })

    // Assert scan completed successfully and callback invoked
    expect(handleSuccess).toHaveBeenCalledWith('nebulite', 42)

    // Assert button is now disabled due to active cooldown
    expect(scanButton).toBeDisabled()
    expect(screen.getByText(/cooldown/i)).toBeInTheDocument()

    // Verify game store records the active cooldown
    const cooldowns = useGameStore.getState().scanCooldowns
    expect(cooldowns.some((c) => c.nebulaId === POINT_ID)).toBe(true)
  })

  it('prevents multiple concurrent scans on the same scan point', async () => {
    const handleSuccess = vi.fn()

    render(
      <ScanningComponentHarness
        pointId={POINT_ID}
        resourceType="stellarium"
        onScanSuccess={handleSuccess}
      />
    )

    const scanButton = screen.getByRole('button', { name: /initiate scan/i })

    // First scan triggers cooldown
    await act(async () => {
      fireEvent.click(scanButton)
    })

    expect(handleSuccess).toHaveBeenCalledTimes(1)
    expect(scanButton).toBeDisabled()

    // Second click should be prevented
    await act(async () => {
      fireEvent.click(scanButton)
    })

    expect(handleSuccess).toHaveBeenCalledTimes(1)
  })

  it('restores scan capability after cooldown expiration', async () => {
    const handleSuccess = vi.fn()

    render(
      <ScanningComponentHarness
        pointId={POINT_ID}
        resourceType="voidcrystal"
        onScanSuccess={handleSuccess}
      />
    )

    // Execute scan
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /initiate scan/i }))
    })

    expect(screen.getByRole('button', { name: /initiate scan/i })).toBeDisabled()

    // Clear cooldowns in game store
    act(() => {
      useGameStore.setState({ scanCooldowns: [] })
    })

    // Button should be re-enabled
    expect(screen.getByRole('button', { name: /initiate scan/i })).toBeEnabled()
    expect(screen.getByText(/status: ready/i)).toBeInTheDocument()
  })
})
