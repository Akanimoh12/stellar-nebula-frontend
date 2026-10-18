import { Suspense } from 'react'
import type { ReactNode } from 'react'
import LoadingScreen from './Loading/LoadingScreen'

interface RouteLoaderProps {
  children: ReactNode
}

/**
 * Top-level Suspense boundary for lazy-loaded routes.
 *
 * Wraps the router so that while route chunks are downloading
 * the user sees a branded loading screen instead of a blank page.
 */
export function RouteLoader({ children }: RouteLoaderProps) {
  return (
    <Suspense
      fallback={
        <LoadingScreen stageLabel="Initializing" message="Loading application..." progress={10} />
      }
    >
      {children}
    </Suspense>
  )
}

export default RouteLoader
