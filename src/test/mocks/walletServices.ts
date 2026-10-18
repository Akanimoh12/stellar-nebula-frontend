import { vi } from 'vitest'
import type * as WalletServices from '@/services/wallets'
import type * as NetworkValidation from '@/services/wallets/networkValidation'
import type * as ErrorHandling from '@/services/wallets/errorHandling'

type WalletServicesModule = typeof WalletServices

/**
 * A complete mock of `@services/wallets` with inert, "nothing installed" defaults.
 *
 * Test files used to hand-write this mock, and every copy went stale the moment
 * a wallet was added (xBull): vitest throws on any export a mock does not define,
 * so whole suites failed on a component that merely *checks* for that wallet.
 * The `satisfies` clause below makes a new export a type error here instead.
 *
 * Usage — spread per-test overrides on top:
 *
 *   vi.mock('@services/wallets', async () => ({
 *     ...(await (await import('@/test/mocks/walletServices')).createWalletServicesMock()),
 *     isFreighterInstalled: vi.fn().mockResolvedValue(true),
 *   }))
 *
 * Network validation and error formatting are pure, so the real implementations
 * are used rather than stubs that would hide their behaviour from the UI.
 */
export async function createWalletServicesMock(): Promise<WalletServicesModule> {
  const networkValidation = await vi.importActual<typeof NetworkValidation>(
    '@/services/wallets/networkValidation'
  )
  const errorHandling = await vi.importActual<typeof ErrorHandling>(
    '@/services/wallets/errorHandling'
  )

  const mock = {
    isFreighterInstalled: vi.fn().mockResolvedValue(false),
    connectFreighter: vi.fn(),
    getFreighterNetwork: vi.fn().mockResolvedValue('testnet'),
    signTransactionWithFreighter: vi.fn(),

    isAlbedoAvailable: vi.fn().mockReturnValue(false),
    connectAlbedo: vi.fn(),
    signTransactionWithAlbedo: vi.fn(),
    getAlbedoNetwork: vi.fn().mockResolvedValue('testnet'),

    isLedgerAvailable: vi.fn().mockResolvedValue(false),
    connectLedger: vi.fn(),
    signTransactionWithLedger: vi.fn(),
    disconnectLedger: vi.fn().mockResolvedValue(undefined),
    getLedgerNetwork: vi.fn((network: string) => network),

    isXBullInstalled: vi.fn().mockResolvedValue(false),
    connectXBull: vi.fn(),
    signTransactionWithXBull: vi.fn(),
    getXBullNetwork: vi.fn().mockResolvedValue('testnet'),

    isWalletConnectAvailable: vi.fn().mockReturnValue(false),
    connectWalletConnect: vi.fn(),
    signTransactionWithWalletConnect: vi.fn(),
    getWalletConnectNetwork: vi.fn().mockReturnValue('testnet'),
    disconnectWalletConnect: vi.fn(),
    loadWalletConnectSession: vi.fn().mockReturnValue(null),

    validateNetworkMatch: networkValidation.validateNetworkMatch,
    getNetworkMismatchMessage: networkValidation.getNetworkMismatchMessage,
    supportsNetworkSwitching: networkValidation.supportsNetworkSwitching,

    handleWalletConnectionError: errorHandling.handleWalletConnectionError,
    formatWalletError: errorHandling.formatWalletError,
  } satisfies Record<keyof WalletServicesModule, unknown>

  return mock as unknown as WalletServicesModule
}
