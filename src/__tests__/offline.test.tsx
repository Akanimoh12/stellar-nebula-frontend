import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/utils'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import OfflinePage from '../pages/OfflinePage'
import { useShipStore } from '../store/shipStore'
import { useResourceStore } from '../store/resourceStore'

describe('Offline Page & PWA Offline Capabilities (#324)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useShipStore.setState({
      ships: [
        {
          id: 'test-ship-1',
          name: 'Stellar Explorer',
          model: 'Vanguard',
          status: 'in-flight',
          cargoCapacity: 100,
          crewCapacity: 4,
          lastKnownSector: 'Sec-Alpha-9',
        },
      ],
      activeShipId: 'test-ship-1',
    })
    useResourceStore.setState({
      inventory: {
        credits: 500,
        fuel: 80,
        minerals: 120,
        nebulaDust: 4200,
        nebulite: 350,
        stellarium: 125,
        voidcrystal: 45,
        darkMatter: 10,
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders offline information, cached vessel diagnostics, and inventory', () => {
    render(
      <MemoryRouter>
        <OfflinePage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Lost in the Nebula/i)).toBeInTheDocument()
    expect(screen.getByText(/Stellar Explorer/i)).toBeInTheDocument()
    expect(screen.getByText(/Sec-Alpha-9/i)).toBeInTheDocument()
    expect(screen.getByText(/4,200/i)).toBeInTheDocument() // nebulaDust
    expect(screen.getByText(/125/i)).toBeInTheDocument() // stellarium
    expect(screen.getByText(/10/i)).toBeInTheDocument() // darkMatter
  })

  it('displays the list of verified precached subsystems and offline modules', () => {
    render(
      <MemoryRouter>
        <OfflinePage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Three.js WebGL Procedural Star Engine/i)).toBeInTheDocument()
    expect(screen.getByText(/Procedural Nebula Shaders/i)).toBeInTheDocument()
    expect(screen.getByText(/Stellar Offline Signature/i)).toBeInTheDocument()
  })

  it('handles the reconnection button click and triggers network probe', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))

    render(
      <MemoryRouter>
        <OfflinePage />
      </MemoryRouter>
    )

    const reconnectBtn = screen.getByRole('button', { name: /attempt reconnect/i })
    fireEvent.click(reconnectBtn)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/', expect.objectContaining({ method: 'HEAD' }))
    })
  })

  it('validates public/offline.html fallback file exists and contains offline features', () => {
    const offlineHtmlPath = resolve(process.cwd(), 'public/offline.html')
    expect(existsSync(offlineHtmlPath)).toBe(true)

    const content = readFileSync(offlineHtmlPath, 'utf8')
    expect(content).toContain('Nebula Nomad')
    expect(content).toContain('Subspace Carrier Lost')
    expect(content).toContain('Cached Vessel Diagnostics')
    expect(content).toContain('Cached Assets & Offline Modules')
    expect(content).toContain('attemptReconnect')
    expect(content).toContain('stellar-nebula:ship-store')
    expect(content).toContain('stellar-nebula:resource-store')
  })
})
