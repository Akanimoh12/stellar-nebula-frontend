/**
 * Lazy-loaded Sentry client.
 *
 * `@sentry/react` is a large third-party dependency. Importing it statically at
 * the top of a module forces it into whatever chunk that module ends up in,
 * which previously meant it was parsed and executed as part of the critical
 * path before the app could paint (#382). Every consumer in this codebase
 * should go through `getSentry()` instead of `import * as Sentry from
 * '@sentry/react'` so the SDK loads in its own async chunk, after first
 * render, and is only fetched once (the dynamic import is cached here).
 */

import type * as SentryModule from '@sentry/react'

let sentryPromise: Promise<typeof SentryModule> | null = null

export function getSentry(): Promise<typeof SentryModule> {
  if (!sentryPromise) {
    sentryPromise = import('@sentry/react')
  }
  return sentryPromise
}
