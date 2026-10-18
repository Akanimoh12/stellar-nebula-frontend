import { beforeEach, describe, expect, it, vi } from 'vitest'
import { xdr } from '@stellar/stellar-sdk'

/**
 * `queryContractVersion` reads the `__version` entry through the stellar-sdk 17
 * XDR API (discriminated unions with `type` + fields). These use real `ScVal`
 * instances so a future SDK change to those accessors fails here, not in production.
 */

const getContractData = vi.fn()

vi.mock('@/config/stellar', () => ({
  createStellarRpcServer: () => ({ getContractData }),
  getActiveStellarConfig: () => ({}),
}))

vi.mock('@/services/logging', () => ({
  createScopedLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

const { queryContractVersion } = await import('../versionCheck')

function contractDataEntry(val: xdr.ScVal) {
  return { val: { type: 'contractData', contractData: { val } } }
}

describe('queryContractVersion', () => {
  beforeEach(() => {
    getContractData.mockReset()
  })

  it('reads a version stored as bytes', async () => {
    getContractData.mockResolvedValue(
      contractDataEntry(xdr.ScVal.scvBytes(new TextEncoder().encode('1.4.2') as unknown as Buffer))
    )
    await expect(queryContractVersion('CCONTRACT')).resolves.toBe('1.4.2')
  })

  it('reads a version stored as a string', async () => {
    getContractData.mockResolvedValue(contractDataEntry(xdr.ScVal.scvString('2.0.0')))
    await expect(queryContractVersion('CCONTRACT')).resolves.toBe('2.0.0')
  })

  it('queries the __version key', async () => {
    getContractData.mockResolvedValue(contractDataEntry(xdr.ScVal.scvString('2.0.0')))
    await queryContractVersion('CCONTRACT')

    const [, key] = getContractData.mock.calls[0]
    expect(key.type).toBe('scvBytes')
    expect(new TextDecoder().decode(key.bytes.value)).toBe('__version')
  })

  it('returns null for other value types, other entries, or a failed lookup', async () => {
    getContractData.mockResolvedValueOnce(contractDataEntry(xdr.ScVal.scvU32(1)))
    await expect(queryContractVersion('CCONTRACT')).resolves.toBeNull()

    getContractData.mockResolvedValueOnce({ val: { type: 'account' } })
    await expect(queryContractVersion('CCONTRACT')).resolves.toBeNull()

    getContractData.mockRejectedValueOnce(new Error('not found'))
    await expect(queryContractVersion('CCONTRACT')).resolves.toBeNull()
  })
})
