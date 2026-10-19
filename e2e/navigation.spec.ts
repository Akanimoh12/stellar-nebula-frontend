import { test, expect } from '@playwright/test'
import { AppPage } from './pages/app.page'
import { gotoStable, WAIT_TIMEOUTS } from './helpers/wait-helpers'

test.describe('Navigation', () => {
  test('loads the home page', async ({ page }) => {
    const app = new AppPage(page)
    await app.goto()

    await expect(page).toHaveTitle(/stellar nebula/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: WAIT_TIMEOUTS.standard,
    })
    await expect(app.main).toBeVisible({ timeout: WAIT_TIMEOUTS.standard })
  })

  test('navigates to all main routes', async ({ page }) => {
    const app = new AppPage(page)
    await app.goto()

    // navigateTo() waits for the URL commit + network idle + <main> visible,
    // so each route settles before the next click (no arbitrary sleeps).
    await app.navigateTo('nebula')
    await expect(page).toHaveURL(/\/nebula/, { timeout: WAIT_TIMEOUTS.standard })

    await app.navigateTo('ship')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: WAIT_TIMEOUTS.standard })

    await app.navigateTo('market')
    await expect(page).toHaveURL(/\/marketplace/, { timeout: WAIT_TIMEOUTS.standard })

    await app.navigateTo('home')
    await expect(page).toHaveURL('/', { timeout: WAIT_TIMEOUTS.standard })
  })

  test('shows 404 for unknown routes', async ({ page }) => {
    await gotoStable(page, '/this-route-does-not-exist', { waitForMain: false })
    await expect(page.getByText(/not found/i)).toBeVisible({
      timeout: WAIT_TIMEOUTS.standard,
    })
  })
})
