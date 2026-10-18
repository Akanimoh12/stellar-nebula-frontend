# Dependency Strategy and Peer Dependencies Resolution

## Overview

This document outlines the dependency management strategy for **Nebula Nomad** (`stellar-nebula-frontend`). It documents peer dependency resolution, version locking, security auditing, and continuous integration standards.

---

## 1. Zero `--legacy-peer-deps` Policy

The `--legacy-peer-deps` flag bypasses npm's dependency graph validation and should never be used as a permanent workaround in CI workflows or local development. Bypassing peer dependency checks can hide runtime incompatibilities and multiple duplicate module instances (such as multiple React or Three.js singletons).

### Resolution Protocol:

1. **Root Conflict Identification**: Diagnose peer dependency warnings using `npm explain <package>` and `npm ls`.
2. **Explicit Overrides**: For libraries whose transitive dependencies specify overly restrictive peer dependency ranges (e.g., packages expecting React 18 when React 19 is installed), define explicit `overrides` in `package.json` to target compatible versions without relaxing overall dependency resolution.
3. **Lockfile Integrity**: Ensure `package-lock.json` is generated cleanly without `--legacy-peer-deps` so `npm ci` executes deterministically.

---

## 2. React 19 & Peer Dependencies

### `use-sync-external-store` Resolution

- **Issue**: Transitive packages (such as state management utilities used by `@react-three/drei` and `valtio`) resolved `use-sync-external-store@1.2.0`, which restricted peer `react` to `"^16.8.0 || ^17.0.0 || ^18.0.0"`.
- **Root Cause**: When installing with React 19 (`^19.2.0`), npm failed with `ERESOLVE overriding peer dependency`.
- **Solution**: Configured npm `overrides` in `package.json`:
  ```json
  "overrides": {
    "use-sync-external-store": "^1.4.0"
  }
  ```
  Version `1.4.0` supports React 19 natively without conflicting with root dependencies.

---

## 3. Web3 & Stellar SDK Architecture

- **Stellar SDK v17+**: Runtime crypto and XDR helpers are kept in the `feature-stellar` chunk via Rollup code-splitting to minimize entry bundle sizes.
- **Hardware Wallets**: `@ledgerhq/hw-app-str` and `@ledgerhq/hw-transport-webusb` are bundled for Ledger support.
- **WalletConnect**: Kept decoupled from core Stellar libraries to avoid circular dependency trees.

---

## 4. CI Workflow Integration

All GitHub Actions workflows run standard `npm ci` without `--legacy-peer-deps`:

- `.github/workflows/ci.yml`: Standard `npm ci` for linting, dependency auditing, unit testing, and builds.
- `.github/workflows/accessibility.yml`: Runs `npm ci` without `--legacy-peer-deps`.
- `.github/workflows/e2e.yml`: Runs `npm ci` without `--legacy-peer-deps` before executing Playwright tests.

---

## 5. Maintenance Guidelines

- **Adding Dependencies**: Always install using `npm install <pkg>` (or `npm install -D <pkg>`). Check for peer warnings.
- **Auditing**: Run `npm run audit:ci` prior to PR submission. Critical and high vulnerabilities must either be patched or reviewed into `.audit-allowlist.json`.
- **Bundle Checking**: Run `npm run bundle:check` to ensure new dependencies don't breach bundle size thresholds.
