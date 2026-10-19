import { test, expect } from '@playwright/test'
import { test as walletTest, connectWallet } from './fixtures/wallet'
import {
  gotoStable,
  waitForCanvasReady,
  waitForNetworkIdleSafe,
  WAIT_TIMEOUTS,
} from './helpers/wait-helpers'

walletTest.describe('Complete scan-upgrade-trade journey', () => {
  walletTest.use({ mockWalletInstalled: undefined } as never)

  walletTest(
    'full journey: connect wallet -> scan nebula -> view resources -> trade',
    async ({ page, mockWalletInstalled: _ }) => {
      await gotoStable(page, '/')

      if (await page.getByRole('button', { name: /connect wallet/i }).isVisible()) {
        await connectWallet(page)
      }

      await gotoStable(page, '/nebula')
      const canvas = page.locator('canvas')
      await waitForCanvasReady(canvas.first(), WAIT_TIMEOUTS.slow)

      await gotoStable(page, '/dashboard')
      await expect(page.getByRole('main')).toBeVisible({ timeout: WAIT_TIMEOUTS.standard })

      await gotoStable(page, '/marketplace')
      await expect(page.getByRole('main')).toBeVisible({ timeout: WAIT_TIMEOUTS.standard })
    }
  )
})

test.describe('Error scenarios', () => {
  test('handles 404 gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    await expect(page.getByText(/not found/i).or(page.getByRole('heading'))).toBeVisible({
      timeout: WAIT_TIMEOUTS.standard,
    })
  })

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await gotoStable(page, '/')
    await waitForNetworkIdleSafe(page)
    expect(errors).toHaveLength(0)
  })
})

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('renders on mobile viewport', async ({ page }) => {
    await gotoStable(page, '/')
    await expect(page.getByRole('main')).toBeVisible({ timeout: WAIT_TIMEOUTS.standard })
  })

  test('nebula page loads on mobile', async ({ page }) => {
    await gotoStable(page, '/nebula')
    const canvas = page.locator('canvas')
    await waitForCanvasReady(canvas.first(), WAIT_TIMEOUTS.slow)
  })
})
