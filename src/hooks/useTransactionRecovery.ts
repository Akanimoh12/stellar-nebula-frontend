import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore, type OptimisticGameOperation } from '@/store/gameStore'
import { trackEvent } from '@/services/analytics'
import { useTransactionRetry, type UseTransactionRetryReturn } from './useTransactionRetry'

export interface TransactionRecoveryOptions<TPayload> extends UseTransactionRetryReturn<TPayload> {
  operation?: OptimisticGameOperation
  dismissOperation?: () => void
  releaseCooldown?: () => void
}

export interface TransactionRecovery {
  hasFailure: boolean
  error: string | null
  attempt: number
  isRetrying: boolean
  retry: () => Promise<boolean>
  dismiss: () => void
  rollback: () => void
}

export interface UseTransactionRecoveryOptions {
  submit: (payload: unknown, attempt: number) => Promise<unknown>
  maxAttempts?: number
  baseDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
  getTransactionId?: (payload: unknown) => string
  getLabel?: (payload: unknown) => string
  onOutcome?: (outcome: RecoveryOutcome) => void
}

export interface RecoveryOutcome {
  status: 'retry_succeeded' | 'retry_failed' | 'dismissed' | 'rolled_back'
  attempts: number
  operationId: string | null
  transactionId: string | null
  error: string | null
  errorType: string | null
}

function errorTypeOf(error: unknown): string | null {
  if (error === null || error === undefined) return null
  if (error instanceof Error) return error.name || 'Error'
  if (typeof error === 'string') return 'Error'
  return typeof error
}

export function useTransactionRecovery<TPayload = unknown>({
  submit,
  maxAttempts = 3,
  baseDelayMs = 750,
  shouldRetry,
  getTransactionId,
  getLabel,
  onOutcome,
}: UseTransactionRecoveryOptions): TransactionRecovery {
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasSucceeded, setHasSucceeded] = useState(false)
  const [lastError, setLastError] = useState<unknown>(null)
  const attemptCountRef = useRef(0)

  const lastAttemptErrorRef = useRef<unknown>(null)

  const wrappedSubmit = useCallback(
    async (payload: unknown, attemptNum: number) => {
      attemptCountRef.current += 1
      try {
        const result = await submit(payload, attemptNum)
        lastAttemptErrorRef.current = null
        return result
      } catch (err) {
        lastAttemptErrorRef.current = err
        throw err
      }
    },
    [submit]
  )

  const retryState = useTransactionRetry<TPayload>({
    submit: wrappedSubmit,
    maxAttempts,
    baseDelayMs,
    shouldRetry,
    getTransactionId,
    getLabel,
  })

  const failedOperation = useGameStore((state) =>
    state.optimisticOperations.find((op) => op.status === 'failed')
  )

  const lastFailedOpIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (failedOperation?.id && failedOperation.id !== lastFailedOpIdRef.current) {
      lastFailedOpIdRef.current = failedOperation.id
      setIsDismissed(false)
      setHasSucceeded(false)
      setLastError(null)
      lastAttemptErrorRef.current = null
      attemptCountRef.current = 0
    }
  }, [failedOperation?.id])

  const report = useCallback(
    (outcome: Omit<RecoveryOutcome, 'operationId' | 'transactionId'>) => {
      const payload: RecoveryOutcome = {
        ...outcome,
        operationId: failedOperation?.id ?? null,
        transactionId: retryState.lastFailure?.transactionId ?? null,
      }

      if (onOutcome) {
        onOutcome(payload)
        return
      }

      if (payload.status === 'retry_succeeded') {
        trackEvent('transaction_retry_succeeded', {
          attempts: payload.attempts,
          operationId: payload.operationId,
          transactionId: payload.transactionId,
        })
      } else if (payload.status === 'retry_failed') {
        trackEvent('transaction_retry_failed', {
          attempts: payload.attempts,
          operationId: payload.operationId,
          transactionId: payload.transactionId,
          errorType: payload.errorType ?? 'unknown',
        })
      } else if (payload.status === 'rolled_back') {
        trackEvent('transaction_rolled_back', {
          operationId: payload.operationId,
          transactionId: payload.transactionId,
        })
      }
    },
    [failedOperation?.id, onOutcome, retryState.lastFailure?.transactionId]
  )

  const retry = useCallback(async (): Promise<boolean> => {
    if (hasSucceeded) return false
    const hadFailure = retryState.lastFailure !== null || failedOperation !== undefined
    if (!hadFailure) return false

    attemptCountRef.current = 0
    lastAttemptErrorRef.current = null
    if (!retryState.lastFailure && failedOperation) {
      retryState.recordFailure(
        failedOperation.operation as TPayload,
        new Error(failedOperation.error ?? 'Transaction failed'),
        failedOperation.label
      )
    }

    let caughtError: unknown = null
    let succeeded = false
    try {
      succeeded = await retryState.retry()
    } catch (err) {
      caughtError = err
    }

    if (succeeded) {
      setHasSucceeded(true)
      setLastError(null)
    } else {
      const attemptError = caughtError ?? lastAttemptErrorRef.current
      if (attemptError) {
        setLastError(attemptError)
      }
    }

    const finalError =
      (succeeded ? null : (caughtError ?? lastAttemptErrorRef.current)) ??
      lastError ??
      retryState.lastFailure?.error ??
      failedOperation?.error ??
      null
    const finalErrorMessage =
      finalError instanceof Error
        ? finalError.message
        : typeof finalError === 'string'
          ? finalError
          : null

    report({
      status: succeeded ? 'retry_succeeded' : 'retry_failed',
      attempts: Math.max(1, attemptCountRef.current, retryState.attempt),
      error: succeeded ? null : finalErrorMessage,
      errorType: succeeded ? null : errorTypeOf(finalError),
    })
    return succeeded
  }, [failedOperation, hasSucceeded, lastError, report, retryState])

  const dismiss = useCallback(() => {
    const hadFailure =
      !isDismissed && (retryState.lastFailure !== null || failedOperation !== undefined)
    setIsDismissed(true)
    retryState.clear()
    if (hadFailure) {
      report({
        status: 'dismissed',
        attempts: retryState.attempt,
        error: null,
        errorType: null,
      })
    }
  }, [failedOperation, isDismissed, report, retryState])

  const rollback = useCallback(() => {
    const store = useGameStore.getState()
    const operation =
      failedOperation ?? store.optimisticOperations.find((op) => op.status === 'failed')

    if (operation) {
      store.rollbackOperation(operation.id, operation.error ?? 'Rolled back by user')
    }

    setIsDismissed(true)
    retryState.clear()
    if (operation) {
      report({
        status: 'rolled_back',
        attempts: retryState.attempt,
        error: operation.error ?? null,
        errorType: errorTypeOf(operation.error),
      })
    }
  }, [failedOperation, report, retryState])

  const hasFailure =
    !isDismissed &&
    (retryState.lastFailure !== null || (failedOperation !== undefined && !hasSucceeded))

  const currentError =
    lastError instanceof Error
      ? lastError.message
      : typeof lastError === 'string'
        ? lastError
        : (retryState.lastFailure?.error ?? failedOperation?.error ?? null)

  return useMemo(
    () => ({
      hasFailure,
      error: hasFailure ? currentError : null,
      attempt: retryState.attempt,
      isRetrying: retryState.isRetrying,
      retry,
      dismiss,
      rollback,
    }),
    [currentError, dismiss, hasFailure, retry, retryState.attempt, retryState.isRetrying, rollback]
  )
}
