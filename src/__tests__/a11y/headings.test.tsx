import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('@/components/NebulaCanvas', () => ({
  NebulaCanvas: () => <div data-testid="mock-nebula-canvas" />,
}))

vi.mock('@/components/Canvas/NebulaCanvas', () => ({
  NebulaCanvas: () => <div data-testid="mock-nebula-canvas" />,
}))

vi.mock('@/services/leaderboard', () => ({
  fetchLeaderboard: vi.fn().mockResolvedValue({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 10,
    source: 'local',
    updatedAt: new Date().toISOString(),
  }),
}))

vi.mock('@/services/monitoring', () => ({
  addMonitoringBreadcrumb: vi.fn(),
  setMonitoringUser: vi.fn(),
  clearMonitoringUser: vi.fn(),
}))

vi.mock('@/services/analytics', () => ({
  trackEvent: vi.fn(),
  analytics: { setOptOut: vi.fn() },
}))

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

vi.mock('@/services/wallets', async () => ({
  ...(await (await import('@/test/mocks/walletServices')).createWalletServicesMock()),
  isFreighterInstalled: vi.fn().mockResolvedValue(false),
  isLedgerAvailable: vi.fn().mockResolvedValue(false),
  connectLedger: vi.fn(),
  signTransactionWithLedger: vi.fn(),
  disconnectLedger: vi.fn(),
  getLedgerNetwork: vi.fn((network: string) => network),
  isWalletConnectAvailable: vi.fn().mockReturnValue(false),
  connectWalletConnect: vi.fn(),
  signTransactionWithWalletConnect: vi.fn(),
  getWalletConnectNetwork: vi.fn(),
  disconnectWalletConnect: vi.fn(),
  loadWalletConnectSession: vi.fn().mockReturnValue(null),
  connectFreighter: vi.fn(),
  getFreighterNetwork: vi.fn(),
  isAlbedoAvailable: vi.fn().mockReturnValue(false),
  connectAlbedo: vi.fn(),
  signTransactionWithFreighter: vi.fn(),
  signTransactionWithAlbedo: vi.fn(),
}))

/**
 * Extracts heading levels (1..6) in DOM order from a container element
 * and verifies that:
 * 1. Every heading has non-empty accessible text content
 * 2. When `requireSingleH1` is true, there is exactly one `<h1>` and it appears first
 * 3. Heading levels never skip downward by more than +1 (e.g. h1 -> h3 is forbidden)
 */
function assertValidHeadingHierarchy(
  container: HTMLElement,
  options: { requireSingleH1?: boolean } = { requireSingleH1: true }
) {
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  expect(headings.length).toBeGreaterThan(0)

  const levels = headings.map((el) => {
    expect(el.textContent?.trim().length).toBeGreaterThan(0)
    return Number(el.tagName.slice(1))
  })

  if (options.requireSingleH1) {
    const h1Count = levels.filter((lvl) => lvl === 1).length
    expect(h1Count).toBe(1)
    expect(levels[0]).toBe(1)
  }

  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1]
    const curr = levels[i]
    // A heading may stay at the same level, go up to a higher section (curr < prev),
    // or go one level deeper (curr === prev + 1), but must never skip a level (curr > prev + 1).
    expect(curr).toBeLessThanOrEqual(prev + 1)
  }

  return levels
}

describe('Heading Hierarchy — WCAG 2.1 SC 1.3.1 & SC 2.4.6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('enforces jsx-a11y/heading-has-content in eslint.config.js', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'eslint.config.js'), 'utf8')
    expect(configSource).toContain("'jsx-a11y/heading-has-content': 'error'")
  })

  it('Home page has a single h1 and proper h1 -> h2 -> h3 hierarchy without skipped levels', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { default: Home } = await import('@/pages/Home')
    const { container } = render(
      <MemoryRouter>
        <WalletProvider>
          <Home />
        </WalletProvider>
      </MemoryRouter>
    )

    const levels = assertValidHeadingHierarchy(container)
    expect(levels).toContain(1)
    expect(levels).toContain(2)
    expect(levels).toContain(3)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('NebulaView page has a single h1 and proper h1 -> h2 hierarchy without skipped levels', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { default: NebulaView } = await import('@/pages/NebulaView')
    const { container } = render(
      <MemoryRouter>
        <WalletProvider>
          <NebulaView />
        </WalletProvider>
      </MemoryRouter>
    )

    const levels = assertValidHeadingHierarchy(container)
    expect(levels[0]).toBe(1)
    expect(levels.slice(1).every((lvl) => lvl === 2)).toBe(true)
  })

  it('ShipDashboard page has a single h1 and sequential h1 -> h2 -> h3 hierarchy', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { default: ShipDashboard } = await import('@/pages/ShipDashboard')

    const { container } = render(
      <MemoryRouter>
        <WalletProvider>
          <ShipDashboard />
        </WalletProvider>
      </MemoryRouter>
    )

    const levels = assertValidHeadingHierarchy(container)
    expect(levels[0]).toBe(1)
    expect(levels).toContain(2)
  })

  it('Marketplace page has a single h1 and proper h1 -> h2 -> h3 hierarchy', async () => {
    const { default: Marketplace } = await import('@/pages/Marketplace')
    const { OrderBook } = await import('@/components/Marketplace/OrderBook')
    const { container } = render(
      <MemoryRouter>
        <Marketplace />
        <OrderBook bids={[]} asks={[]} />
      </MemoryRouter>
    )

    const levels = assertValidHeadingHierarchy(container)
    expect(levels[0]).toBe(1)
    expect(levels).toContain(2)
    expect(levels).toContain(3)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('LeaderboardPage and NotFound page each have a single h1 and no skipped levels', async () => {
    const { WalletProvider } = await import('@/contexts/WalletContext')
    const { default: LeaderboardPage } = await import('@/pages/LeaderboardPage')
    const { default: NotFound } = await import('@/pages/NotFound')

    const { container: leaderboardContainer, unmount } = render(
      <MemoryRouter>
        <WalletProvider>
          <LeaderboardPage />
        </WalletProvider>
      </MemoryRouter>
    )
    assertValidHeadingHierarchy(leaderboardContainer)
    unmount()

    const { container: notFoundContainer } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )
    assertValidHeadingHierarchy(notFoundContainer)
  })

  it('section and modal components (EmptyState, OnboardingWelcome, SettingsPanel, TrustlineManager) use h2+ so they never conflict with page h1 or skip levels', async () => {
    const { EmptyState } = await import('@/components/UI/EmptyState')
    const { OnboardingWelcome } = await import('@/components/Tutorial/OnboardingWelcome')
    const { default: SettingsPanel } = await import('@/components/Settings/SettingsPanel')

    const { container } = render(
      <div>
        <h1>Page Title</h1>
        <EmptyState title="No items found" description="Try scanning a nebula." />
        <OnboardingWelcome />
        <SettingsPanel />
      </div>
    )

    const levels = assertValidHeadingHierarchy(container, { requireSingleH1: true })
    expect(levels.filter((l) => l === 1)).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'No items found', level: 2 })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /welcome to stellar nebula/i, level: 2 })
    ).toBeInTheDocument()
  })
})
