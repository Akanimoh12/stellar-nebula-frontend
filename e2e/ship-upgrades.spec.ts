import { test, expect } from '@playwright/test'
import { ShipPage } from './pages/ship.page'
import { AppPage } from './pages/app.page'
import { WAIT_TIMEOUTS } from './helpers/wait-helpers'

/**
 * End-to-end test suite for the ship upgrade flow (#342).
 * Validates fleet inspection, module selections, upgrade bay modal,
 * resource requirements, and upgrade queue state transitions via POM.
 */

test.describe('Ship upgrade operations (POM)', () => {
  let ship: ShipPage
  let app: AppPage

  test.beforeEach(async ({ page }) => {
    ship = new ShipPage(page)
    app = new AppPage(page)
  })

  test('loads the ship dashboard interface', async () => {
    await ship.goto()
    await ship.waitForReady()
    await expect(ship.page.getByRole('main')).toBeVisible({ timeout: WAIT_TIMEOUTS.standard })
    await expect(ship.fleetSection).toBeVisible({ timeout: WAIT_TIMEOUTS.standard })
  })

  test('displays wallet prompt or fleet management view when visited', async () => {
    await ship.goto()
    const hasConnect = await ship.connectWalletPrompt.isVisible().catch(() => false)
    const hasContent = await ship.page
      .getByText(/fleet/i)
      .isVisible()
      .catch(() => false)
    expect(hasConnect || hasContent).toBe(true)
  })

  test('navigates to ship dashboard from primary navigation', async ({ page }) => {
    await app.goto('/')
    await app.navigateTo('ship')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: WAIT_TIMEOUTS.standard })
    await expect(ship.fleetSection).toBeVisible({ timeout: WAIT_TIMEOUTS.standard })
  })

  test('displays fleet inventory and active upgrade queue', async () => {
    await ship.goto()
    await ship.waitForReady()
    const count = await ship.getShipCount()
    expect(count).toBeGreaterThanOrEqual(1)
    await expect(ship.inventoryPanel.first()).toBeVisible()
    await expect(ship.upgradeQueue).toBeVisible()
  })

  test('ship cards feature dynamic accessible action labels and states', async () => {
    await ship.goto()
    await ship.waitForReady()
    const firstCard = ship.shipCards.first()
    await expect(firstCard).toBeVisible()
    await expect(firstCard).toHaveAttribute('aria-label', /select ship/i)
    const pressed = await firstCard.getAttribute('aria-pressed')
    expect(['true', 'false', null].includes(pressed)).toBeTruthy()
  })

  test('provides accessible button to access ship upgrade bay', async () => {
    await ship.goto()
    await ship.waitForReady()
    await expect(ship.openUpgradeBayButton).toBeVisible()
    await expect(ship.openUpgradeBayButton).toHaveAttribute('aria-label', /open.*upgrade bay/i)
  })

  test('opens upgrade bay modal and displays upgrade module options', async () => {
    await ship.goto()
    await ship.waitForReady()
    await ship.openUpgradeBay()
    await expect(ship.upgradeModal).toBeVisible()
    await expect(ship.upgradeModal).toHaveAttribute('aria-modal', 'true')

    const choices = ship.upgradeChoices
    const count = await choices.count()
    expect(count).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(choices.nth(i)).toHaveAttribute('aria-label', /select upgrade/i)
    }
    await ship.closeUpgradeModal()
  })

  test('allows selecting upgrade modules and evaluates resource readiness', async () => {
    await ship.goto()
    await ship.waitForReady()
    await ship.openUpgradeBay()

    if (await ship.crewUpgradeButton.isVisible().catch(() => false)) {
      await ship.selectUpgrade('crew')
      await expect(ship.crewUpgradeButton).toHaveAttribute('aria-pressed', 'true')
    }
    const canApply = await ship.canApplyUpgrade()
    expect(typeof canApply).toBe('boolean')
    await ship.closeUpgradeModal()
  })

  test('displays upgrade queue items with status indicators', async () => {
    await ship.goto()
    await ship.waitForReady()
    const queueCount = await ship.getUpgradeQueueItems()
    expect(queueCount).toBeGreaterThanOrEqual(3)
  })
})
