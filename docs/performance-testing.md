# Frontend Performance Testing

Nebula Nomad includes automated performance validation for render smoothness, initial load, and memory stability.

## Targets

- 60 FPS rendering target for the nebula render loop (tested via `test/performance/fps.test.ts`)
- Zero memory leaks across Three.js geometry/material lifecycles (tested via `test/performance/memory.test.ts`)
- WebGL draw call budget (< 100) and triangle budget (< 250,000) (tested via `test/performance/render.test.ts`)
- First Contentful Paint (FCP) under 1800ms
- Largest Contentful Paint (LCP) under 2500ms
- Time To Interactive (TTI) under 4000ms
- Total Blocking Time (TBT) under 250ms
- Cumulative Layout Shift (CLS) under 0.1
- JavaScript bundle budget capped at 2.0 MB

## Lighthouse CI Setup

Lighthouse CI validates performance budgets on the built production bundle in CI and locally.

### Configuration Files

- Primary configuration: `.lighthouserc.cjs`
- Compatibility fallbacks: `lighthouse.config.js` and `lighthouserc.cjs`

The configuration defines:

- **Collection**: 3 runs against preview server (`http://127.0.0.1:4173/`), simulating fast 4G with simulated desktop throttling.
- **Assertions**:
  - `categories:performance`: error if score < 0.8
  - `first-contentful-paint`: error if > 1800ms (optimistic aggregation)
  - `largest-contentful-paint`: error if > 2500ms (optimistic aggregation)
  - `interactive`: error if > 4000ms (optimistic aggregation)
  - `total-blocking-time`: error if > 250ms (optimistic aggregation)
  - `cumulative-layout-shift`: error if > 0.1 (optimistic aggregation)
  - `resource-summary:script:size`: error if > 2,000,000 bytes
- **Reports**: Stored locally in `.lighthouseci/` (uploaded as CI build artifacts).

## Local Commands

- `npm run performance:test` runs unit performance benchmarks (FPS, memory leaks, and render budgets).
- `npm run performance:ci` builds the production application, serves it via Vite preview on port 4173, and runs `@lhci/cli autorun`.
- `npm run performance:lighthouse` runs Lighthouse CI directly with the pinned `@lhci/cli` runner.

## Reports

Lighthouse CI outputs generated JSON and HTML reports to `.lighthouseci/` when `npm run performance:ci` is executed. The GitHub Actions performance workflow uploads this directory as an artifact on each run and verifies budget compliance.

## Interpretation

- **FPS Benchmark**: Verifies render smoothness against a 60 FPS target and detects frame cadence degradation.
- **Memory Tracker**: Confirms disposal of Three.js geometries, textures, materials, and cancellation of requestAnimationFrame handles and event listeners.
- **Lighthouse CI**: Fails on budget regressions or Core Web Vital degradations to prevent performance regressions from merging.
