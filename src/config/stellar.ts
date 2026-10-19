import type { Horizon, rpc } from '@stellar/stellar-sdk'
import {
  STELLAR_FUTURENET_HORIZON_URL,
  STELLAR_FUTURENET_PASSPHRASE,
  STELLAR_FUTURENET_RPC_URL,
  STELLAR_MAINNET_HORIZON_URL,
  STELLAR_MAINNET_PASSPHRASE,
  STELLAR_TESTNET_HORIZON_URL,
  STELLAR_TESTNET_PASSPHRASE,
  STELLAR_TESTNET_RPC_URL,
} from '@/constants/stellar'

export type StellarNetwork = 'testnet' | 'futurenet' | 'mainnet'

export interface StellarEnvConfig {
  STELLAR_NETWORK?: StellarNetwork
  STELLAR_RPC_URL?: string
  STELLAR_HORIZON_URL?: string
  STELLAR_PASSPHRASE?: string
  NEBULA_CONTRACT_ID?: string
  TOKEN_CONTRACT_ID?: string
}

export interface StellarNetworkConfig {
  network: StellarNetwork
  rpcUrl: string
  horizonUrl: string
  networkPassphrase: string
  nebulaContractId: string
  tokenContractId: string
}

export interface StellarConnectionClients {
  rpcServer: Pick<rpc.Server, 'getHealth' | 'getNetwork'>
  horizonServer: Pick<Horizon.Server, 'root'>
}

export interface StellarConnectionStatus {
  network: StellarNetwork
  rpcHealthy: boolean
  rpcStatus: string
  horizonConnected: boolean
  networkPassphrase: string
}

/**
 * Environment variables that select the Soroban contract addresses for a
 * specific network. Preferred over the generic contract-ID variables so each
 * network (testnet / futurenet / mainnet) can target its own deployment.
 */
const CONTRACT_ID_ENV_KEYS: Record<StellarNetwork, { nebula: string; token: string }> = {
  testnet: {
    nebula: 'VITE_NEBULA_CONTRACT_ID_TESTNET',
    token: 'VITE_TOKEN_CONTRACT_ID_TESTNET',
  },
  futurenet: {
    nebula: 'VITE_NEBULA_CONTRACT_ID_FUTURENET',
    token: 'VITE_TOKEN_CONTRACT_ID_FUTURENET',
  },
  mainnet: {
    nebula: 'VITE_NEBULA_CONTRACT_ID_MAINNET',
    token: 'VITE_TOKEN_CONTRACT_ID_MAINNET',
  },
}

function readContractId(network: StellarNetwork, kind: 'nebula' | 'token'): string {
  const keys = CONTRACT_ID_ENV_KEYS[network][kind]
  const networkSpecific = import.meta.env[keys]
  if (typeof networkSpecific === 'string' && networkSpecific.length > 0) {
    return networkSpecific
  }

  const generic = import.meta.env[
    kind === 'nebula' ? 'VITE_NEBULA_CONTRACT_ID' : 'VITE_TOKEN_CONTRACT_ID'
  ]
  return typeof generic === 'string' ? generic : ''
}

// Network passphrases hard-coded to avoid statically importing @stellar/stellar-sdk
// in the initial bundle. Values mirror the `Networks` enum from the SDK.
/** Preconfigured Stellar network definitions. */
export const STELLAR_NETWORK_CONFIGS: Record<StellarNetwork, StellarNetworkConfig> = {
  testnet: {
    network: 'testnet',
    rpcUrl: STELLAR_TESTNET_RPC_URL,
    horizonUrl: STELLAR_TESTNET_HORIZON_URL,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    nebulaContractId: readContractId('testnet', 'nebula'),
    tokenContractId: readContractId('testnet', 'token'),
  },
  futurenet: {
    network: 'futurenet',
    rpcUrl: STELLAR_FUTURENET_RPC_URL,
    horizonUrl: STELLAR_FUTURENET_HORIZON_URL,
    networkPassphrase: STELLAR_FUTURENET_PASSPHRASE,
    nebulaContractId: readContractId('futurenet', 'nebula'),
    tokenContractId: readContractId('futurenet', 'token'),
  },
  mainnet: {
    network: 'mainnet',
    // NOTE: intentionally not STELLAR_MAINNET_RPC_URL (`soroban.stellar.org`); the two
    // constants disagree, so confirm which mainnet RPC is intended before unifying them.
    rpcUrl: 'https://soroban-rpc.stellar.org',
    horizonUrl: STELLAR_MAINNET_HORIZON_URL,
    networkPassphrase: STELLAR_MAINNET_PASSPHRASE,
    nebulaContractId: readContractId('mainnet', 'nebula'),
    tokenContractId: readContractId('mainnet', 'token'),
  },
}

/** Get the config for a specific Stellar network. */
export function getStellarNetworkConfig(network: StellarNetwork = 'testnet'): StellarNetworkConfig {
  return STELLAR_NETWORK_CONFIGS[network]
}

/** Read Stellar config values from environment variables. */
export function getStellarEnvConfig(): StellarEnvConfig {
  return {
    STELLAR_NETWORK: import.meta.env.VITE_STELLAR_NETWORK as StellarNetwork | undefined,
    STELLAR_RPC_URL: import.meta.env.VITE_STELLAR_RPC_URL,
    STELLAR_HORIZON_URL: import.meta.env.VITE_STELLAR_HORIZON_URL,
    STELLAR_PASSPHRASE: import.meta.env.VITE_STELLAR_PASSPHRASE,
    NEBULA_CONTRACT_ID:
      import.meta.env.VITE_NEBULA_CONTRACT_ID ||
      (import.meta.env.VITE_NEBULA_CONTRACT_ID_TESTNET as string | undefined),
    TOKEN_CONTRACT_ID:
      import.meta.env.VITE_TOKEN_CONTRACT_ID ||
      (import.meta.env.VITE_TOKEN_CONTRACT_ID_TESTNET as string | undefined),
  }
}

/**
 * Get the active Stellar configuration by merging defaults with
 * environment variable overrides.
 */
export function getActiveStellarConfig(
  config: StellarEnvConfig = getStellarEnvConfig()
): StellarNetworkConfig {
  const network = config.STELLAR_NETWORK ?? 'testnet'
  const baseConfig = getStellarNetworkConfig(network)

  return {
    ...baseConfig,
    rpcUrl: config.STELLAR_RPC_URL || baseConfig.rpcUrl,
    horizonUrl: config.STELLAR_HORIZON_URL || baseConfig.horizonUrl,
    networkPassphrase: config.STELLAR_PASSPHRASE || baseConfig.networkPassphrase,
    nebulaContractId: config.NEBULA_CONTRACT_ID || baseConfig.nebulaContractId,
    tokenContractId: config.TOKEN_CONTRACT_ID || baseConfig.tokenContractId,
  }
}

/** Create a Soroban RPC server client. */
export async function createStellarRpcServer(
  config: StellarNetworkConfig = getActiveStellarConfig()
): Promise<rpc.Server> {
  const { rpc } = await import('@stellar/stellar-sdk')
  return new rpc.Server(config.rpcUrl)
}

/** Create a Horizon server client. */
export async function createHorizonServer(
  config: StellarNetworkConfig = getActiveStellarConfig()
): Promise<Horizon.Server> {
  const { Horizon } = await import('@stellar/stellar-sdk')
  return new Horizon.Server(config.horizonUrl)
}

/**
 * Check connectivity to Stellar network services (RPC + Horizon).
 *
 * @example
 * const status = await checkStellarConnection()
 * console.log(status.rpcHealthy, status.horizonConnected)
 */
export async function checkStellarConnection(
  config: StellarNetworkConfig = getActiveStellarConfig(),
  clients?: StellarConnectionClients
): Promise<StellarConnectionStatus> {
  const resolvedClients = clients ?? {
    rpcServer: await createStellarRpcServer(config),
    horizonServer: await createHorizonServer(config),
  }

  const [health, networkInfo] = await Promise.all([
    resolvedClients.rpcServer.getHealth(),
    resolvedClients.rpcServer.getNetwork(),
    resolvedClients.horizonServer.root(),
  ])

  return {
    network: config.network,
    rpcHealthy: health.status === 'healthy',
    rpcStatus: health.status,
    horizonConnected: true,
    networkPassphrase: networkInfo.passphrase,
  }
}
