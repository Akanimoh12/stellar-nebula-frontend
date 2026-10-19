import { test as base, type Page } from '@playwright/test'

export type WalletFixtures = {
  mockWalletInstalled: void
}

export const test = base.extend<WalletFixtures>({
  mockWalletInstalled: [
    async ({ page }, use) => {
      // Inject a mock Freighter wallet before every test
      await page.addInitScript(() => {
        const mockPublicKey = 'GAHTJRCKMIQWJSLS6OGCHZMAKSDBUQGIT4AJGBE6KCAJBKNNCLSYTRDS'

        Object.defineProperty(window, 'freighter', {
          value: {
            isConnected: () => Promise.resolve(true),
            getPublicKey: () => Promise.resolve(mockPublicKey),
            getNetwork: () => Promise.resolve('TESTNET'),
            getNetworkDetails: () =>
              Promise.resolve({
                network: 'TESTNET',
                networkPassphrase: 'Test SDF Network ; September 2015',
                networkUrl: 'https://horizon-testnet.stellar.org',
              }),
            signTransaction: (xdr: string) => Promise.resolve({ signedTxXdr: xdr }),
          },
          writable: true,
        })
      })

      await use()
    },
    { auto: false },
  ],
})

export { expect } from '@playwright/test'

export async function connectWallet(page: Page) {
  const connectButton = page.getByRole('button', { name: /connect wallet/i })
  await connectButton.waitFor({ state: 'visible', timeout: 10_000 })
  await connectButton.click()
  const freighterButton = page.getByRole('button', { name: /freighter/i })
  await freighterButton.waitFor({ state: 'visible', timeout: 10_000 })
  await freighterButton.click()
  await page
    .locator('[data-testid="wallet-connected"]')
    .waitFor({ state: 'visible', timeout: 15_000 })
}
