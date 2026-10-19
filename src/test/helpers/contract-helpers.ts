import type { ScanNebulaParams } from '@/services/contracts/soroban'

/** Public and private instance methods of SorobanContractClient, as of this contract interface. */
export const EXPECTED_CLIENT_METHODS = [
  'buildScanTransaction',
  'submitScanTransaction',
  'pollTransaction',
  'parseScanResult',
] as const

export function createScanParams(overrides: Partial<ScanNebulaParams> = {}): ScanNebulaParams {
  return {
    nebulaId: 'nebula-1',
    scannerPublicKey: 'GTESTSCANNERPUBLICKEY',
    ...overrides,
  }
}
