# Frontend Performance Testing & Thresholds

Automated performance validation enforces frame rate stability, memory usage boundaries, and load duration limits across the Stellar Nebula application.

## Core Thresholds

| Metric | Threshold | Enforcement | Description |
| :--- | :--- | :--- | :--- |
| **FPS (Frame Rate)** | `≥ 45 FPS` (target `60 FPS`) | Automated Test & CI | Frame rendering must maintain at least 45 FPS during sustained render loops. |
| **Memory Usage** | `≤ 200 MB` | Automated Test & CI | Maximum allowable memory footprint. Zero unreleased resources (leak-free). |
| **Load Time** | `≤ 3.0 s` | Automated Test & CI | Initial page and asset loading must complete within 3 seconds. |

## Test Suite Execution

Run performance tests locally with:

```bash
npm run performance:test
```

This runs Vitest on the `test/performance/` suite:
- `test/performance/fps.test.ts`: Verifies render loop frame rates against the `≥45 FPS` minimum threshold and asserts load time `≤3s`.
- `test/performance/memory.test.ts`: Asserts memory ceiling `≤200 MB` and tests resource lifecycle cleanup (geometries, textures, materials, event listeners, animation frame IDs).

## Configuration

Threshold constants are centralized in `test/performance/thresholds.ts`:

```typescript
export const PERFORMANCE_THRESHOLDS = {
  MIN_FPS: 45,
  TARGET_FPS: 60,
  MAX_MEMORY_MB: 200,
  MAX_LOAD_TIME_MS: 3000,
} as const;
```

Any violation of these thresholds will fail the test suite and block the CI pipeline.
