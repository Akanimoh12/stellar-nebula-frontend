import { useMemo } from 'react'
import type { Transaction } from '@stellar/stellar-sdk'
import { useFeeEstimation } from '@/hooks/useFeeEstimation'
import { isPricyTransaction } from '@/utils/fee-calculator'
import styles from './TransactionPreview.module.css'

export interface TransactionPreviewProps {
  transaction: Transaction | null
  onConfirm?: () => void
  onCancel?: () => void
  isSubmitting?: boolean
  networkRate?: number
}

export function TransactionPreview({
  transaction,
  onConfirm,
  onCancel,
  isSubmitting = false,
  networkRate,
}: TransactionPreviewProps) {
  const { estimate, isLoading, error, clearError } = useFeeEstimation(transaction, {
    networkRate,
    autoEstimate: true,
  })

  const isPricyTxn = useMemo(
    () => (transaction ? isPricyTransaction(transaction) : false),
    [transaction]
  )

  if (!transaction) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Transaction Preview</h2>
        {isPricyTxn && <span className={styles.warningBadge}>High Fee</span>}
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h3>Transaction Details</h3>
          <div className={styles.detailRow}>
            <span className={styles.label}>Source Account</span>
            <span className={styles.value}>{transaction.source.slice(0, 8)}...</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Operations</span>
            <span className={styles.value}>{transaction.operations.length}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Sequence Number</span>
            <span className={styles.value}>{transaction.sequence}</span>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.section}>
            <div className={styles.loader} />
            <p>Calculating fee estimate...</p>
          </div>
        ) : error ? (
          <div className={styles.section}>
            <div className={styles.error}>
              <p>{error}</p>
              <button className={styles.retryBtn} onClick={clearError}>
                Retry
              </button>
            </div>
          </div>
        ) : estimate ? (
          <div className={styles.section}>
            <h3>Fee Breakdown</h3>
            <div className={styles.feeGrid}>
              <div className={styles.feeCard}>
                <span className={styles.feeLabel}>Base Fee (per operation)</span>
                <span className={styles.feeAmount}>{estimate.formattedBaseFee} XLM</span>
              </div>
              <div className={styles.feeCard}>
                <span className={styles.feeLabel}>Total Operations</span>
                <span className={styles.feeAmount}>{estimate.operationCount}</span>
              </div>
              <div className={`${styles.feeCard} ${styles.highlighted}`}>
                <span className={styles.feeLabel}>Total Fee</span>
                <span className={styles.feeAmount}>{estimate.formattedTotalFee} XLM</span>
              </div>
            </div>
            {isPricyTxn && (
              <div className={styles.warningBox}>
                <p>⚠️ This transaction has a relatively high fee. Please review before signing.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={isSubmitting}
          type="button"
        >
          Cancel
        </button>
        <button
          className={styles.confirmBtn}
          onClick={onConfirm}
          disabled={isSubmitting || isLoading}
          type="button"
        >
          {isSubmitting ? 'Signing...' : 'Sign & Send'}
        </button>
      </div>
    </div>
  )
}
