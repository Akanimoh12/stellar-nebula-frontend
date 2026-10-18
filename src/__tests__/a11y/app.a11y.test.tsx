import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { toHaveNoViolations } from 'jest-axe'
import { axe } from './setup'

expect.extend(toHaveNoViolations)

/**
 * Page-level accessibility (#338): every routed page is rendered inside the real
 * wallet and notification providers and checked with axe, which covers the
 * WCAG 2.0/2.1 A and AA rules (plus best practices). Component-level suites in
 * this directory cover the navigation, wallet modal and shared widgets.
 */

vi.mock('@services/wallets', async () => ({
  ...(await (await import('@/test/mocks/walletServices')).createWalletServicesMock()),
}))

vi.mock('@/services/monitoring', () => ({
  addMonitoringBreadcrumb: vi.fn(),
  setMonitoringUser: vi.fn(),
  clearMonitoringUser: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock('@/services/analytics', () => ({ trackEvent: vi.fn() }))

// Same test configuration the page-level suites use; `env` validates at import.
vi.mock('@config/env', () => ({
  env: {
    NODE_ENV: 'test',
    APP_NAME: 'Stellar Nebula',
    APP_VERSION: '0.0.0',
    STELLAR_NETWORK: 'testnet',
    STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
    STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
    STELLAR_PASSPHRASE: 'Test SDF Network ; September 2015',
    NEBULA_CONTRACT_ID: 'CTEST',
    TOKEN_CONTRACT_ID: 'CTEST2',
    API_BASE_URL: 'https://api.test',
    API_TIMEOUT_MS: 10000,
    ENABLE_DEV_TOOLS: false,
    ENABLE_FPS_COUNTER: false,
    SENTRY_DSN: null,
    LOGROCKET_APP_ID: null,
    ENABLE_MONITORING: false,
    LOG_LEVEL: 'error',
    ANALYTICS_ENDPOINT: null,
  },
  isDev: false,
  isProd: false,
  isStaging: false,
}))

vi.mock('@/services/logging', () => ({
  createScopedLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// WebGL is unavailable in the test DOM. The canvas has its own keyboard and ARIA
// tests; here a labelled stand-in keeps the rest of the page under test.
vi.mock('@components/Canvas', () => ({
  NebulaCanvas: () => (
    <div role="application" aria-label="Nebula exploration canvas" tabIndex={0} />
  ),
}))

async function renderPage(page: ReactElement) {
  const { WalletProvider } = await import('@/contexts/WalletContext')
  const { NotificationProvider } = await import('@/contexts/NotificationContext')

  return render(
    <MemoryRouter>
      <WalletProvider>
        <NotificationProvider>
          <main>{page}</main>
        </NotificationProvider>
      </WalletProvider>
    </MemoryRouter>
  )
}

const pages: Array<[name: string, load: () => Promise<{ default: () => ReactElement | null }>]> = [
  ['Home', () => import('@/pages/Home')],
  ['NebulaView', () => import('@/pages/NebulaView')],
  ['ShipDashboard', () => import('@/pages/ShipDashboard')],
  ['Marketplace', () => import('@/pages/Marketplace')],
  ['LeaderboardPage', () => import('@/pages/LeaderboardPage')],
  ['NotFound', () => import('@/pages/NotFound')],
]

describe('App pages — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe.each(pages)('%s page', (_name, load) => {
    it('has no WCAG 2.1 AA violations', async () => {
      const { default: Page } = await load()
      const { container } = await renderPage(<Page />)
      // Let wallet detection and any initial data effects settle first.
      await waitFor(() => expect(container.firstChild).not.toBeNull())

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }, 45000)

    it('exposes a heading so screen-reader users can orient', async () => {
      const { default: Page } = await load()
      await renderPage(<Page />)
      expect((await screen.findAllByRole('heading')).length).toBeGreaterThan(0)
    })

    it('gives every interactive control an accessible name', async () => {
      const { default: Page } = await load()
      await renderPage(<Page />)
      await waitFor(() => expect(document.body.firstChild).not.toBeNull())

      const controls = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')]
      for (const control of controls) {
        const name =
          control.getAttribute('aria-label') ??
          control.getAttribute('aria-labelledby') ??
          control.textContent?.trim()
        expect(name, control.outerHTML.slice(0, 120)).toBeTruthy()
      }
    })
  })
})
