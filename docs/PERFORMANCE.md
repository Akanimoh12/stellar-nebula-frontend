# Performance Optimization Guide

This document outlines the performance architectural patterns, rendering lifecycle optimizations, and battery conservation strategies implemented in the Stellar Nebula frontend.

## 1. Animation Frame Loop Optimization (#380)

### Background & Problem
Web applications utilizing 3D graphics (Three.js / React Three Fiber) and continuous physics calculations frequently consume CPU and GPU cycles on every display refresh tick via `requestAnimationFrame`. When a user navigates to another browser tab or minimizes the browser window, standard animation frame loops can continue firing or accumulate unthrottled cycles, resulting in:
- High idle CPU usage (typically 15% - 40% on modern multi-core devices).
- Severe battery drain on mobile devices and laptops.
- Thermal throttling and device overheating.
- Frame-rate stuttering when returning to the tab due to accumulated deltas.

### Page Visibility API Integration
The Page Visibility API (`document.visibilityState` and the `visibilitychange` event) is now integrated across all animation and rendering components:
- **`usePageVisibility` Hook** (`src/hooks/useAnimationFrame.ts`):
  Tracks tab active state reactively and unsubscribes cleanly upon unmount.
- **`useAnimationFrame` Hook** (`src/hooks/useAnimationFrame.ts`):
  Guards the frame callback against inactive tabs, automatically canceling scheduled `requestAnimationFrame` ticks when `document.hidden` is true, and safely resetting delta timestamps upon reactivation to prevent jump artifacts.
- **`NebulaCanvas` Component** (`src/components/Canvas/NebulaCanvas.tsx`):
  Toggles `@react-three/fiber`'s `frameloop` prop dynamically:
  - `frameloop="always"` when visible.
  - `frameloop="never"` when hidden.
  Setting `frameloop="never"` suspends the internal WebGL rendering pipeline, completely halting shader execution and scene evaluations.
- **`useFrameRateMonitor` Hook** (`src/hooks/useFrameRateMonitor.ts`):
  Suspends frame rate tracking during inactive periods, preventing skewed FPS metrics and saving background cycles.

### Results & Acceptance Criteria
- **Idle Inactivity**: CPU utilization falls to ~0% when the tab is hidden.
- **Seamless Resumption**: Canvas and animations resume smoothly without jump-cuts upon tab reactivation.
- **Battery Optimization**: Significantly reduces power draw on mobile browsers and portable devices.

### Utility Functions (`src/utils/performance.ts`)
- `isTabVisible()`: Synchronous check for document visibility.
- `onVisibilityChange(onVisible, onHidden)`: Helper to subscribe to visibility transitions.
- `getRecommendedFrameloop(isVisible, mode)`: Returns the appropriate R3F frameloop state (`'always' | 'demand' | 'never'`).
- `getBatteryStatus()`: Reads battery charging state and level if supported by the browser.
