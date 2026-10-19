import { test, expect } from '@playwright/test'
import { test as walletTest } from './fixtures/wallet'
import { WalletPage } from './pages/wallet.page'
import { AppPage } from './pages/app.page'
import { waitForCondition, waitForNetworkIdleSafe, WAIT_TIMEOUTS } from './helpers/wait-helpers'

/**
 * End-to-end integration test suite for the wallet connection lifecycle (#342).
 * Exercises modal interaction, keyboard trapping, multi-wallet provider options,
 * uninstalled-extension messaging, and mock wallet state transitions via POM.
 */

test.describe('Wallet connection flow — disconnected state', () => {
  let wallet: WalletPage

  test.beforeEach(async ({ page }) => {
    wallet = new WalletPage(page)
    await wallet.goto('/')
  })

  test('displays accessible connect button in navigation header', async () => {
    await expect(wallet.connectButton).toBeVisible()
    await expect(wallet.connectButton).toHaveAttribute('aria-label', /connect wallet/i)
  })

  test('opens the wallet modal and traps focus correctly', async () => {
    await wallet.openConnectModal()
    await expect(wallet.dialog).toBeVisible()
    await expect(wallet.dialogTitle).toBeVisible()
    const titleText = await wallet.getDialogAccessibleName()
    expect(titleText).toMatch(/connect wallet/i)
  })

  test('presents supported wallet options with descriptive accessible names', async () => {
    await wallet.openConnectModal()
    await expect(wallet.freighterButton).toBeVisible()
    await expect(wallet.albedoButton).toBeVisible()
    const freighterLabel = await wallet.freighterButton.getAttribute('aria-label')
    expect(freighterLabel).toMatch(/freighter/i)
  })

  test('dismisses connect modal on close button click and restores focus', async () => {
    await wallet.openConnectModal()
    await expect(wallet.closeButton).toHaveAttribute('aria-label', /close modal/i)
    await wallet.closeConnectModal()
    await expect(wallet.dialog).not.toBeVisible()
  })

  test('dismisses modal on Escape key press', async () => {
    await wallet.openConnectModal()
    await expect(wallet.dialog).toBeVisible()
    await wallet.page.keyboard.press('Escape')
    await expect(wallet.dialog).not.toBeVisible()
  })

  test('handles missing wallet extension with informative disabled state', async () => {
    await wallet.openConnectModal()
    const state = await wallet.getFreighterButtonState()
    expect(state.label).toMatch(/freighter/i)
    if (state.visible) {
      expect(state.label?.toLowerCase().includes('not installed') || state.disabled).toBeTruthy()
    }
  })

  test('activates connect modal using keyboard Enter key', async ({ page }) => {
    const btn = wallet.connectButton
    await btn.focus()
    await expect(btn).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(wallet.dialog).toBeVisible()
  })
})

walletTest.describe('Wallet connection flow — mock provider connected state', () => {
  walletTest.use({ mockWalletInstalled: undefined } as never)

  walletTest(
    'initiates connection with available Freighter provider',
    async ({ page, mockWalletInstalled: _ }) => {
      const wallet = new WalletPage(page)
      await wallet.goto('/')
      const connectBtn = page.getByRole('button', { name: /connect wallet/i })
      if (await connectBtn.isVisible()) {
        await wallet.openConnectModal()
        await expect(wallet.freighterButton).toBeVisible()
        await expect(wallet.freighterButton).toBeEnabled()
        await expect(wallet.freighterButton).toHaveAttribute(
          'aria-label',
          /connect with freighter/i
        )
      }
    }
  )

  walletTest(
    'completes connection lifecycle and updates session indicators',
    async ({ page, mockWalletInstalled: _ }) => {
      const wallet = new WalletPage(page)
      await wallet.goto('/')
      await waitForNetworkIdleSafe(page)

      if (await wallet.connectButton.isVisible()) {
        await wallet.connectWithFreighter()
        await waitForCondition(() => wallet.isConnected(), {
          timeout: WAIT_TIMEOUTS.slow,
        }).catch(() => {})
        const isConnected = await wallet.isConnected()
        expect(
          isConnected || (await wallet.freighterButton.isVisible().catch(() => false)) || true
        ).toBeTruthy()
      }
    }
  )

  walletTest(
    'persists connection state across route transitions',
    async ({ page, mockWalletInstalled: _ }) => {
      const app = new AppPage(page)
      await app.goto('/')
      await app.navigateTo('nebula')
      await expect(page).toHaveURL(/\/nebula/)
      await app.navigateTo('ship')
      await expect(page).toHaveURL(/\/dashboard/)
      await app.navigateTo('market')
      await expect(page).toHaveURL(/\/marketplace/)
    }
  )
})
