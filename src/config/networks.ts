import type { StellarNetwork } from '@/config/stellar'

export interface NetworkConfig {
  name: StellarNetwork
  label: string
  description: string
  isMainnet: boolean
  horizonUrl: string
  rpcUrl: string
  networkPassphrase: string
  nebulaContractId: string
  tokenContractId: string
}

export const NETWORKS: Record<StellarNetwork, NetworkConfig> = {
  testnet: {
    name: 'testnet',
    label: 'Testnet',
    description: 'Test network for development and testing',
    isMainnet: false,
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet-rpc.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    nebulaContractId: import.meta.env.VITE_NEBULA_CONTRACT_ID_TESTNET || '',
    tokenContractId: import.meta.env.VITE_TOKEN_CONTRACT_ID_TESTNET || '',
  },
  futurenet: {
    name: 'futurenet',
    label: 'Futurenet',
    description: 'Future network for new features and testing',
    isMainnet: false,
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    rpcUrl: 'https://soroban-futurenet-rpc.stellar.org',
    networkPassphrase: 'Test SDF Future Network ; October 2022',
    nebulaContractId: import.meta.env.VITE_NEBULA_CONTRACT_ID_FUTURENET || '',
    tokenContractId: import.meta.env.VITE_TOKEN_CONTRACT_ID_FUTURENET || '',
  },
  mainnet: {
    name: 'mainnet',
    label: 'Mainnet',
    description: 'Main network for production',
    isMainnet: true,
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://soroban-rpc.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    nebulaContractId: import.meta.env.VITE_NEBULA_CONTRACT_ID_MAINNET || '',
    tokenContractId: import.meta.env.VITE_TOKEN_CONTRACT_ID_MAINNET || '',
  },
}

export function getNetworkConfig(network: StellarNetwork): NetworkConfig {
  return NETWORKS[network]
}

export function getAllNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS)
}

export function getNetworkLabel(network: StellarNetwork): string {
  return NETWORKS[network].label
}

export function isMainnet(network: StellarNetwork): boolean {
  return NETWORKS[network].isMainnet
}
