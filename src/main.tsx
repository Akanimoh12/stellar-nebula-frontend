import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/base.css'
import './styles/mobile.css'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { logger } from './services/logging'
import { initializeMonitoring } from './services/monitoring'
import { repairCorruptedSaveData } from './services/saveLoad'
import { initWebVitalsMonitoring } from './hooks/useWebVitals'
import { env } from './config'
import { preloadCriticalAssets } from './utils/preload'

// Preload critical fonts, icons, and hero assets early to improve LCP and CLS (#379)
preloadCriticalAssets()

// Validate/repair raw localStorage before any zustand store module (pulled
// in transitively by App) hydrates from it, so a corrupted save can't crash
// startup.
const saveRepairReport = repairCorruptedSaveData()
if (saveRepairReport.cleared.length > 0) {
  logger.warn('Corrupted save data cleared on startup', {
    clearedCount: saveRepairReport.cleared.length,
    keys: saveRepairReport.cleared.map((c) => c.key).join(', '),
  })
}

// Initialize structured logging first
if (env.LOG_LEVEL) {
  logger.setLogLevel(env.LOG_LEVEL)
}

logger.info('Application starting', {
  environment: env.NODE_ENV,
  version: env.APP_VERSION,
  appName: env.APP_NAME,
})

// Initialize monitoring services (Sentry + LogRocket). Not awaited: Sentry and
// LogRocket are loaded via dynamic import (see services/sentryClient.ts) in
// their own async chunk so they never block the initial render (#382). Any
// errors thrown before this resolves are still caught by the ErrorBoundary
// below and queued for Sentry once it finishes loading.
if (env.ENABLE_MONITORING) {
  void initializeMonitoring({
    sentryDsn: env.SENTRY_DSN,
    sentryEnvironment: env.NODE_ENV,
    sentryRelease: env.APP_VERSION,
    sentrySampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sentryReplaySessionRate: env.NODE_ENV === 'production' ? 0.1 : 0.5,
    sentryReplayErrorRate: 1.0,
    logRocketAppId: env.LOGROCKET_APP_ID,
    enablePerformanceMonitoring: true,
  })
}

// Initialize Web Vitals performance monitoring (#365)
initWebVitalsMonitoring()

logger.info('Monitoring and logging initialized')

// Imported dynamically (rather than statically at the top of this file) so
// that repairCorruptedSaveData() above has already run before App - and the
// zustand store modules it transitively imports - are evaluated and hydrate
// from localStorage.
const { default: App } = await import('./App.tsx')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<p>An unexpected error occurred.</p>}>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
