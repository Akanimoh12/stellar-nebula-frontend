import type * as SentryNamespace from '@sentry/react'
import { getSentry } from './sentryClient'
import { createScopedLogger } from './logging'
import type { LogContext } from './logging'

const log = createScopedLogger('ErrorTracking')

export function setSentryUser(publicKey: string | null): void {
  getSentry().then((Sentry) => {
    if (publicKey) {
      Sentry.setUser({ id: publicKey })
      log.debug('Sentry user set', { userId: publicKey })
    } else {
      Sentry.setUser(null)
      log.debug('Sentry user cleared')
    }
  })
}

function toLogContext(context?: Record<string, unknown>): LogContext | undefined {
  if (!context) return undefined

  return Object.fromEntries(
    Object.entries(context).flatMap(([key, value]) =>
      value === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value)
        ? [[key, value as LogContext[string]]]
        : []
    )
  )
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const logContext = toLogContext(context)

  if (error instanceof Error) {
    log.error('Error captured', error, logContext)
  } else {
    log.error('Non-standard error captured', new Error(String(error)), logContext)
  }

  getSentry().then((Sentry) => {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context)
      }
      if (error instanceof Error) {
        Sentry.captureException(error)
      } else {
        Sentry.captureException(new Error(String(error)))
      }
    })
  })
}

export function captureMessage(
  message: string,
  level: SentryNamespace.SeverityLevel = 'error'
): void {
  getSentry().then((Sentry) => {
    Sentry.captureMessage(message, level)
  })
}

export function getSentryReportDialogUrl(eventId: string): string {
  return `https://o${eventId}/ingest/`
}
