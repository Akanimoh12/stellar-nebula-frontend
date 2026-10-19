import type { Page, Locator } from '@playwright/test'
import { gotoStable, waitForNetworkIdleSafe, WAIT_TIMEOUTS } from '../helpers/wait-helpers'

export class ShipPage {
  readonly page: Page
  readonly heading: Locator
  readonly openUpgradeBayButton: Locator
  readonly upgradeModal: Locator
  readonly upgradeModalTitle: Locator
  readonly upgradeChoices: Locator
  readonly cargoUpgradeButton: Locator
  readonly crewUpgradeButton: Locator
  readonly deepScanUpgradeButton: Locator
  readonly applyUpgradeButton: Locator
  readonly cancelUpgradeButton: Locator
  readonly shipCards: Locator
  readonly fleetSection: Locator
  readonly inventoryPanel: Locator
  readonly upgradeQueue: Locator
  readonly confirmModal: Locator
  readonly confirmButton: Locator
  readonly cancelConfirmButton: Locator
  readonly transactionBanner: Locator
  readonly connectWalletPrompt: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /fleet command/i }).first()
    this.openUpgradeBayButton = page.getByRole('button', {
      name: /open ship upgrade bay|open upgrade bay/i,
    })
    this.upgradeModal = page.getByRole('dialog', { name: /upgrade/i })
    this.upgradeModalTitle = page.getByRole('heading', { name: /upgrade/i })
    this.upgradeChoices = page.locator('.upgrade-choice')
    this.cargoUpgradeButton = page.getByRole('button', { name: /cargo expansion/i })
    this.crewUpgradeButton = page.getByRole('button', { name: /crew quarters/i })
    this.deepScanUpgradeButton = page.getByRole('button', { name: /deep scan array/i })
    this.applyUpgradeButton = page.getByRole('button', { name: /apply upgrade/i })
    this.cancelUpgradeButton = page.getByRole('button', { name: /cancel upgrade/i })
    this.shipCards = page.locator('.ship-card')
    this.fleetSection = page.locator('.ship-list')
    this.inventoryPanel = page.locator('.inventory-panel')
    this.upgradeQueue = page.locator('.queue-list')
    this.confirmModal = page.getByRole('dialog', { name: /confirm/i })
    this.confirmButton = page.getByRole('button', {
      name: /confirm.*transaction|review and sign|apply upgrade/i,
    })
    this.cancelConfirmButton = page.getByRole('button', { name: /cancel/i })
    this.transactionBanner = page.locator('.transaction-banner')
    this.connectWalletPrompt = page.getByRole('button', { name: /connect wallet/i })
  }

  async goto() {
    await gotoStable(this.page, '/dashboard')
  }

  async waitForReady() {
    await this.page
      .getByRole('main')
      .waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
    await waitForNetworkIdleSafe(this.page)
    await this.fleetSection.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.slow })
  }

  async getShipCount() {
    return this.shipCards.count()
  }

  async getActiveShipName() {
    const active = this.page.locator('.ship-card.is-active .ship-name')
    if (await active.isVisible().catch(() => false)) {
      return active.textContent()
    }
    return null
  }

  async selectShipByIndex(index = 0) {
    const card = this.shipCards.nth(index)
    await card.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
    const name = await card.locator('.ship-name').textContent()
    await card.click()
    return name
  }

  async selectShipByName(name: string) {
    const card = this.page.locator('.ship-card', { hasText: name })
    await card.click()
  }

  async openUpgradeBay() {
    await this.openUpgradeBayButton.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.slow })
    await this.openUpgradeBayButton.click()
    await this.upgradeModal.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.slow })
  }

  async closeUpgradeModal() {
    if (await this.cancelUpgradeButton.isVisible()) {
      await this.cancelUpgradeButton.click()
    } else {
      await this.page.keyboard.press('Escape')
    }
    await this.upgradeModal
      .waitFor({ state: 'hidden', timeout: WAIT_TIMEOUTS.standard })
      .catch(() => {})
  }

  async selectUpgrade(upgradeName: 'cargo' | 'crew' | 'deep') {
    const map = {
      cargo: this.cargoUpgradeButton,
      crew: this.crewUpgradeButton,
      deep: this.deepScanUpgradeButton,
    }
    const btn = map[upgradeName]
    await btn.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
    await btn.click()
  }

  async getSelectedUpgradeDetails() {
    const costList = this.page.locator('.detail-list').first()
    return costList.textContent()
  }

  async canApplyUpgrade() {
    const btn = this.page.getByRole('button', { name: /apply upgrade/i })
    if (!(await btn.isVisible().catch(() => false))) return false
    return !(await btn.isDisabled())
  }

  async applyUpgrade() {
    const btn = this.page.getByRole('button', { name: /apply upgrade/i })
    await btn.click()
  }

  async isUpgradePending() {
    return this.transactionBanner.isVisible().catch(() => false)
  }

  async getUpgradeQueueItems() {
    return this.page.locator('.queue-item').count()
  }

  async getUpgradeQueueStatus(upgradeName: string) {
    const item = this.page.locator('.queue-item', { hasText: upgradeName })
    const status = item.locator('span').last()
    return status.textContent()
  }

  async handleConfirmModalIfVisible() {
    if (await this.confirmModal.isVisible().catch(() => false)) {
      const confirm = this.confirmModal.getByRole('button', { name: /review and sign|confirm/i })
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click()
      }
    }
  }
}
