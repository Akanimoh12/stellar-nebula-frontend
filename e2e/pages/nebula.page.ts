import { expect, type Page, type Locator } from '@playwright/test'
import {
  gotoStable,
  waitForAnyVisible,
  waitForCanvasReady,
  WAIT_TIMEOUTS,
} from '../helpers/wait-helpers'

export class NebulaPage {
  readonly page: Page
  readonly heading: Locator
  readonly canvas: Locator
  readonly connectPrompt: Locator
  readonly scanButton: Locator
  readonly walletDisplay: Locator
  readonly harvestPanel: Locator
  readonly latestReward: Locator
  readonly inventory: Locator
  readonly harvestLog: Locator
  readonly inventoryFilterAll: Locator
  readonly inventoryFilterStocked: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /survey active stellar/i })
    this.canvas = page.locator('canvas').first()
    this.connectPrompt = page.getByRole('button', { name: /connect wallet/i })
    this.scanButton = page.getByRole('button', { name: /scan nebula/i })
    this.walletDisplay = page.locator('[aria-label*="Balance"], [aria-label*="Wallet"]')
    this.harvestPanel = page.locator('.nebula-scan-panel')
    this.latestReward = page.locator('.scan-reward')
    this.inventory = page.locator('.inventory-panel')
    this.harvestLog = page.locator('.harvest-panel')
    this.inventoryFilterAll = page.getByRole('button', { name: /filter resources by all/i })
    this.inventoryFilterStocked = page.getByRole('button', { name: /filter resources by stocked/i })
  }

  async goto() {
    await gotoStable(this.page, '/nebula')
  }

  async waitForCanvas(timeout = WAIT_TIMEOUTS.slow) {
    await waitForCanvasReady(this.canvas, timeout)
  }

  async waitForPageReady() {
    await this.page.getByRole('main').waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
    await this.waitForCanvas().catch(() => {})
  }

  async getVisibleAction(): Promise<'connect' | 'scan' | 'none'> {
    // Wait for either divergent state to resolve instead of racing raw waits.
    const winner = await waitForAnyVisible(
      [this.connectPrompt, this.scanButton],
      WAIT_TIMEOUTS.standard
    ).catch(() => -1)
    if (winner === 0) return 'connect'
    if (winner === 1) return 'scan'
    if (await this.connectPrompt.isVisible().catch(() => false)) return 'connect'
    if (await this.scanButton.isVisible().catch(() => false)) return 'scan'
    return 'none'
  }

  async clickCanvasAt(x = 300, y = 300) {
    const box = await this.canvas.boundingBox()
    if (!box) throw new Error('Canvas not visible')
    await this.page.mouse.click(box.x + x, box.y + y)
  }

  async scanAnomaly() {
    // Try to find scan points - clickable anomalies in canvas
    // Fallback: click canvas center
    await this.waitForCanvas()
    await this.clickCanvasAt(200, 200)
    // Wait for the scan to settle: harvest panels stay visible and any
    // in-flight reward update resolves. Explicit visibility instead of sleep.
    await expect(this.harvestLog.first().or(this.inventory.first())).toBeVisible({
      timeout: WAIT_TIMEOUTS.standard,
    })
  }

  async getHarvestTotals() {
    const cards = this.page.locator('.harvest-totals .metric-card')
    const count = await cards.count()
    const totals: Record<string, string> = {}
    for (let i = 0; i < count; i++) {
      const label = await cards.nth(i).locator('.metric-label').textContent()
      const value = await cards.nth(i).locator('strong').textContent()
      if (label && value) totals[label.trim()] = value.trim()
    }
    return totals
  }

  async getInventoryRows() {
    return this.page.locator('.resource-card')
  }

  async filterInventory(filter: 'all' | 'stocked' | 'low' | 'empty') {
    const btn = this.page.getByRole('button', {
      name: new RegExp(`filter resources by ${filter}`, 'i'),
    })
    await btn.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
    await btn.click()
    // Wait for the pressed state to settle instead of assuming instant update.
    await expect(btn).toHaveAttribute('aria-pressed', 'true', {
      timeout: WAIT_TIMEOUTS.standard,
    })
  }

  async isInventoryVisible() {
    return this.inventory
      .first()
      .isVisible()
      .catch(() => false)
  }

  async getCanvasAccessibleLabel() {
    return this.canvas.getAttribute('aria-label')
  }
}
