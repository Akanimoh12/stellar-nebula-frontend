import type { Page, Locator } from '@playwright/test'
import { gotoStable, WAIT_TIMEOUTS } from '../helpers/wait-helpers'

export class WalletPage {
  readonly page: Page
  readonly connectButton: Locator
  readonly connectButtonHeader: Locator
  readonly dialog: Locator
  readonly dialogTitle: Locator
  readonly freighterButton: Locator
  readonly albedoButton: Locator
  readonly closeButton: Locator
  readonly walletConnectedIndicator: Locator
  readonly addressDisplay: Locator
  readonly disconnectButton: Locator
  readonly balanceChip: Locator
  readonly unfundedChip: Locator

  constructor(page: Page) {
    this.page = page
    this.connectButton = page.getByRole('button', { name: /connect wallet/i }).first()
    this.connectButtonHeader = page.getByRole('button', { name: /connect wallet/i })
    this.dialog = page.getByRole('dialog', { name: /connect wallet/i })
    this.dialogTitle = page.getByRole('heading', { name: /connect wallet/i })
    this.freighterButton = page.getByRole('button', { name: /freighter/i })
    this.albedoButton = page.getByRole('button', { name: /albedo/i })
    this.closeButton = page.getByRole('button', { name: /close modal/i })
    this.walletConnectedIndicator = page.locator('[data-testid="wallet-connected"]')
    this.addressDisplay = page.locator('[title*="G"]')
    this.disconnectButton = page.getByRole('button', { name: /disconnect wallet/i })
    this.balanceChip = page.locator('[aria-label*="Balance"]')
    this.unfundedChip = page.locator('[aria-label*="Unfunded"]')
  }

  async goto(path = '/') {
    await gotoStable(this.page, path)
  }

  async openConnectModal() {
    await this.connectButton.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
    await this.connectButton.click()
    await this.dialog.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
  }

  async closeConnectModal() {
    if (await this.closeButton.isVisible()) {
      await this.closeButton.click()
    } else {
      await this.page.keyboard.press('Escape')
    }
    await this.dialog
      .waitFor({ state: 'hidden', timeout: WAIT_TIMEOUTS.standard })
      .catch(() => {})
  }

  async selectFreighter() {
    await this.freighterButton.click()
  }

  async selectAlbedo() {
    await this.albedoButton.click()
  }

  async connectWithFreighter() {
    await this.openConnectModal()
    await this.freighterButton.waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.standard })
    await this.selectFreighter()
    // Wait for either connected indicator or dialog dismissal. Both are valid
    // terminal states; poll explicitly instead of racing bare waits.
    await Promise.race([
      this.walletConnectedIndicator
        .waitFor({ state: 'visible', timeout: WAIT_TIMEOUTS.slow })
        .catch(() => {}),
      this.dialog.waitFor({ state: 'hidden', timeout: WAIT_TIMEOUTS.slow }).catch(() => {}),
    ])
  }

  async getFreighterButtonState() {
    return {
      visible: await this.freighterButton.isVisible().catch(() => false),
      disabled: await this.freighterButton.isDisabled().catch(() => false),
      label: await this.freighterButton.getAttribute('aria-label'),
    }
  }

  async isConnected() {
    // Check for disconnected vs connected UI
    const hasDisconnect = await this.disconnectButton.isVisible().catch(() => false)
    const hasConnectedIndicator = await this.walletConnectedIndicator.isVisible().catch(() => false)
    return hasDisconnect || hasConnectedIndicator
  }

  async disconnect() {
    if (await this.disconnectButton.isVisible()) {
      await this.disconnectButton.click()
    }
  }

  async getDialogAccessibleName() {
    return await this.dialog.getAttribute('aria-label')
  }
}
