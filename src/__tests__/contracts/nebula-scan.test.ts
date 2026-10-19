import { describe, it, expect, vi, beforeEach } from 'vitest'

const sdk = vi.hoisted(() => ({
  getAccount: vi.fn(),
  prepareTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  contractCall: vi.fn(),
  nativeToScVal: vi.fn(),
  buildTransaction: vi.fn(),
}))

vi.mock('@stellar/stellar-sdk', () => {
  class MockServer {
    getAccount = sdk.getAccount
    prepareTransaction = sdk.prepareTransaction
    sendTransaction = sdk.sendTransaction
    getTransaction = sdk.getTransaction
  }

  class MockContract {
    call = sdk.contractCall
  }

  class MockTransactionBuilder {
    addOperation() {
      return this
    }
    setTimeout() {
      return this
    }
    build() {
      return sdk.buildTransaction()
    }
  }

  return {
    Contract: MockContract,
    TransactionBuilder: Object.assign(MockTransactionBuilder, {
      fromXDR: vi.fn().mockReturnValue('parsed-tx'),
    }),
    BASE_FEE: '100',
    nativeToScVal: sdk.nativeToScVal,
    rpc: { Server: MockServer },
  }
})

vi.mock('@/config/stellar', () => ({
  getActiveStellarConfig: () => ({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  }),
}))

import { SorobanContractClient, ContractError } from '@/services/contracts/soroban'
import { createScanParams, EXPECTED_CLIENT_METHODS } from '@/test/helpers/contract-helpers'

describe('scan_nebula contract interface', () => {
  let client: SorobanContractClient

  beforeEach(() => {
    sdk.getAccount.mockResolvedValue({ accountId: 'G-scanner' })
    sdk.buildTransaction.mockReturnValue('built-tx')
    sdk.prepareTransaction.mockResolvedValue({ toXDR: () => 'prepared-xdr' })
    sdk.contractCall.mockReturnValue('scan-operation')
    sdk.nativeToScVal.mockImplementation((value: unknown, opts: { type: string }) => ({
      value,
      type: opts.type,
    }))
    client = new SorobanContractClient('CTEST_NEBULA')
  })

  it('exposes the public method surface the frontend depends on', () => {
    const methods = Object.getOwnPropertyNames(SorobanContractClient.prototype).filter(
      (name) => name !== 'constructor'
    )
    expect(methods.sort()).toEqual([...EXPECTED_CLIENT_METHODS].sort())
  })

  it('calls scan_nebula with a string nebula id and an address scanner', async () => {
    const params = createScanParams({ nebulaId: 'nebula-7', scannerPublicKey: 'G-abc' })

    await client.buildScanTransaction(params)

    expect(sdk.contractCall).toHaveBeenCalledWith(
      'scan_nebula',
      { value: 'nebula-7', type: 'string' },
      { value: 'G-abc', type: 'address' }
    )
  })

  it('returns the prepared transaction as an XDR string', async () => {
    const xdr = await client.buildScanTransaction(createScanParams())

    expect(typeof xdr).toBe('string')
    expect(xdr).toBe('prepared-xdr')
  })

  it('loads the account for the scanner public key', async () => {
    await client.buildScanTransaction(createScanParams({ scannerPublicKey: 'G-who' }))

    expect(sdk.getAccount).toHaveBeenCalledWith('G-who')
  })

  it('rejects with ContractError when the network reports a submission error', async () => {
    sdk.sendTransaction.mockResolvedValue({
      status: 'ERROR',
      errorResult: { toXDR: () => 'err-xdr' },
    })

    await expect(client.submitScanTransaction('signed-xdr')).rejects.toBeInstanceOf(ContractError)
  })
})
