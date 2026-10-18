# Production Performance Monitoring & Web Vitals

This document details the Real User Monitoring (RUM) architecture, Core Web Vitals telemetry, Sentry dashboard configurations, and regression alerting implemented for the Stellar Nebula application (#365).

## Overview

The application utilizes native browser `PerformanceObserver` APIs to track Core Web Vitals and performance benchmarks in production. Metrics are captured automatically on page load and user interaction, categorized into standard health ratings, and streamed directly to Sentry and LogRocket.

## Tracked Metrics & Google Thresholds

| Metric | Full Name | Good | Needs Improvement | Poor | Reporting Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FCP** | First Contentful Paint | $\le 1800\text{ms}$ | $1801 - 3000\text{ms}$ | $> 3000\text{ms}$ | After first DOM paint |
| **LCP** | Largest Contentful Paint | $\le 2500\text{ms}$ | $2501 - 4000\text{ms}$ | $> 4000\text{ms}$ | On largest element render |
| **CLS** | Cumulative Layout Shift | $\le 0.1$ | $0.11 - 0.25$ | $> 0.25$ | Layout shift events (unprompted) |
| **FID** | First Input Delay | $\le 100\text{ms}$ | $101 - 300\text{ms}$ | $> 300\text{ms}$ | First user input interaction |
| **TTFB** | Time to First Byte | $\le 800\text{ms}$ | $801 - 1800\text{ms}$ | $> 1800\text{ms}$ | Navigation timing response start |

## Implementation Details

### 1. `trackWebVital` Service (`src/services/monitoring.ts`)
- Dispatches metrics to Sentry via `Sentry.setMeasurement(metric.name, value, unit)`.
- Tags transactions with `vital.<metric_name>` for filtering in Sentry Performance dashboards.
- Adds structured breadcrumbs to user session context.
- Dispatches performance alerts if any metric violates the "poor" threshold.

### 2. `useWebVitals` & `initWebVitalsMonitoring` (`src/hooks/useWebVitals.ts`)
- **Imperative Initialization**: `initWebVitalsMonitoring()` attaches non-blocking `PerformanceObserver` listeners during application startup in `src/main.tsx`.
- **React Hook**: `useWebVitals()` provides reactive access to live Web Vitals inside diagnostic and debug overlays.

### 3. Application Bootstrap (`src/main.tsx`)
Web Vitals monitoring is initialized before application render, ensuring immediate capture of navigation timing (TTFB) and early paints (FCP).

## Performance Dashboards & Regressions

### Sentry Performance Dashboard Configuration
1. **Navigate to**: Sentry -> Performance -> Web Vitals.
2. **Key Widgets**:
   - 75th percentile (p75) LCP by route (`/`, `/nebula`, `/ship`, `/marketplace`).
   - Average CLS by device category (mobile vs desktop).
   - TTFB distribution by geographic region and CDN edge.
   - Poor FCP occurrences correlated with release version tags.

### Regression Alert Rules
Alert rules are configured to trigger team notifications via Slack/PagerDuty:
- **Condition**: P75 LCP exceeds 2500ms over a 15-minute sliding window.
- **Condition**: P75 CLS exceeds 0.1 over a 15-minute sliding window.
- **Condition**: Any incoming `[Performance Alert] Poor <Metric>` event rate surges > 5% of total sessions.
