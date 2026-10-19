import type { Transaction } from '@stellar/stellar-sdk'
import { BASE_FEE } from '@stellar/stellar-sdk'

export interface FeeBreakdown {
  baseFee: number
  operationCount: number
  totalFee: number
  networkRate: number
  estimatedNetwork?: string
}

export interface DetailedFeeEstimate extends FeeBreakdown {
  currencyCode: string
  formattedBaseFee: string
  formattedTotalFee: string
  feePerOperation: number
}

const STROOPS_PER_LUMEN = 10_000_000

export function calculateFeeBreakdown(transaction: Transaction): FeeBreakdown {
  const operationCount = transaction.operations.length
  const baseFeeInStroops = parseInt(transaction.fee)
  const feePerOperation = baseFeeInStroops / operationCount

  return {
    baseFee: feePerOperation,
    operationCount,
    totalFee: baseFeeInStroops,
    networkRate: feePerOperation,
  }
}

export function convertStroopsToLumens(stroops: number): number {
  return stroops / STROOPS_PER_LUMEN
}

export function convertLumensToStroops(lumens: number): number {
  return Math.ceil(lumens * STROOPS_PER_LUMEN)
}

export function formatFeeInLumens(stroops: number, decimalPlaces: number = 7): string {
  const lumens = convertStroopsToLumens(stroops)
  return lumens.toFixed(decimalPlaces).replace(/\.?0+$/, '')
}

export function estimateTransactionFee(
  operationCount: number,
  networkRate: number = BASE_FEE
): number {
  return operationCount * networkRate
}

export function getDetailedFeeEstimate(
  transaction: Transaction,
  networkRate: number = BASE_FEE
): DetailedFeeEstimate {
  const breakdown = calculateFeeBreakdown(transaction)
  const totalFeeStroops = estimateTransactionFee(breakdown.operationCount, networkRate)

  return {
    ...breakdown,
    totalFee: totalFeeStroops,
    networkRate,
    currencyCode: 'XLM',
    formattedBaseFee: formatFeeInLumens(networkRate),
    formattedTotalFee: formatFeeInLumens(totalFeeStroops),
    feePerOperation: networkRate,
  }
}

export function isPricyTransaction(
  transaction: Transaction,
  thresholdLumens: number = 0.05
): boolean {
  const totalFeeStroops = parseInt(transaction.fee)
  const thresholdStroops = convertLumensToStroops(thresholdLumens)
  return totalFeeStroops > thresholdStroops
}
