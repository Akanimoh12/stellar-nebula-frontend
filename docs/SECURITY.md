# Security Audit Checklist

## Project Security Overview

Stellar Nebula is a frontend web application that integrates Stellar wallet signing and transaction submission flows. This review focuses on wallet security, transaction safety, dependency hygiene, and frontend attack surface reduction.

Key security principles applied:

- Frontend never stores or requests private keys or seed phrases.
- Wallet signing is delegated to trusted wallet adapters (Freighter and Albedo).
- Transaction submission is validated against network configuration and explicit wallet confirmation interfaces.
- Environment variables are treated as configuration values only; secrets are excluded from source control.

## Security Audit Checklist

- [x] Review wallet integration for unsafe permission and key handling.
- [x] Verify transaction signing is explicit and network-aware.
- [x] Validate wallet session persistence does not store secrets.
- [x] Review build and runtime dependency security posture.
- [x] Confirm environment variable usage is safe for frontend applications.
- [x] Review OWASP Top 10 risks for frontend-specific issues.
- [x] Document findings, vulnerabilities, and recommendations.

## Dependency Security Review

### Policy

- **Production dependencies** (anything that ships in the bundle) may never carry a
  known **high** or **critical** advisory. These cannot be allowlisted; the fix is an
  upgrade, a replacement, or removing the dependency.
- **Development / build-time dependencies** with a high or critical advisory must be
  fixed, or recorded in [`.audit-allowlist.json`](../.audit-allowlist.json) with a
  reason explaining why the advisory is not exploitable here, the date it was
  reviewed, and an **expiry date** (at most ~3 months out).
- **Moderate / low** advisories are reviewed when Dependabot opens a PR or during the
  regular dependency upgrade, and fixed when a non-breaking upgrade exists.

### How it is enforced

| Control                                                                                                                                                                                                                                                                             | Where                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| CI gate: `npm run audit:ci` (`scripts/audit-check.mjs`) fails on any unreviewed high/critical advisory, any high/critical advisory in production dependencies, and any allowlist entry that has **expired** or **no longer matches** an advisory (so stale exceptions get removed). | `dependency-scan` job in `.github/workflows/ci.yml` |
| The same scan runs **weekly on a schedule**, so a newly published advisory turns the job red even when no PRs are open.                                                                                                                                                             | `.github/workflows/ci.yml` (`schedule`)             |
| Dependabot opens grouped version-update PRs daily (npm) and weekly (GitHub Actions); security-update PRs are grouped separately.                                                                                                                                                    | `.github/dependabot.yml`                            |
| Dependabot alerts and security updates must be enabled for the repository (Settings → Code security → Dependabot alerts / Dependabot security updates).                                                                                                                             | Repository settings                                 |

### Running it locally

```bash
npm run audit:ci                  # the CI gate
npm audit --omit=dev              # production dependencies only
npm audit fix                     # apply non-breaking fixes
```

### Adding an exception

Only for development/build-time dependencies, and only when no fixed version can be
adopted yet. Add an entry to `.audit-allowlist.json`:

```json
{
  "id": "GHSA-xxxx-xxxx-xxxx",
  "package": "affected-package",
  "severity": "high",
  "paths": ["direct-dep > affected-package"],
  "scope": "development (build-time only)",
  "reason": "Why it is not exploitable in this project, and what the real fix is.",
  "reviewed": "YYYY-MM-DD",
  "expires": "YYYY-MM-DD"
}
```

The PR adding it needs a reviewer's sign-off. When the entry expires, CI fails until it
is re-reviewed (new expiry) or the dependency is fixed.

### Current status (2026-10-18)

`npm audit` reported 57 advisories (5 critical, 34 high). After this review:

- **0 critical, 0 high in production dependencies.**
- Resolved by upgrade: `@stellar/stellar-sdk` 15 → 17 (bundled `axios` prototype-pollution
  and `toml` advisories), `vitest` / `@vitest/*` → 4.1.12, `@faker-js/faker` 9 → 10, plus
  the transitive fixes applied by `npm audit fix` (`postcss`, `proxy-addr`,
  `browserslist`, `fast-uri`, `form-data`, `js-yaml`, `compression`, …).
- Removed: `@size-limit/preset-app` (its headless-Chrome timing was unused — every
  `.size-limit.json` budget sets `"running": false`; `@size-limit/file` covers size
  budgets) and `@lhci/cli` as a devDependency (its `puppeteer`/proxy chain has no
  fixed release; the performance job now runs a pinned `npx @lhci/cli@0.15.1`, so it is
  no longer installed for every developer and CI job).
- `@storybook/addon-essentials@8` removed: it is built into Storybook 10 and its
  Storybook 8 peer requirement broke `npm ci`.
- **One allowlisted advisory:** `braces` GHSA-vfj7-8cjw-p6xm (high), reached only through
  Tailwind CSS 3 at build time. See the entry in `.audit-allowlist.json`; the fix is the
  Tailwind CSS 4 migration (expires 2027-01-31).
- **Follow-ups (moderate):** `react-router-dom` 6 → 7 for GHSA-wrjc-x8rr-h8h6 (open
  redirect via backslash in `<Link>`/`useNavigate`) and GHSA-337j-9hxr-rhxg — a major
  upgrade tracked separately.

### Dependency families to watch

- `@stellar/stellar-sdk`, `@albedo-link/intent`, `@walletconnect/*`, `@ledgerhq/*` —
  they handle signing and transaction data.
- `react`, `react-dom`, `react-router-dom`.
- Build tooling: `vite`, `typescript`, `eslint`, `tailwindcss`.

## Wallet Security Review

### Findings

- Wallet adapters use Freighter and Albedo only; the frontend does not generate or store private keys.
- No code requests seed phrases or raw private keys from users.
- Wallet session persistence stores only:
  - public key
  - wallet type
  - network
- The wallet session validator has been improved to verify both public key and actual wallet network before restoring a session.
- Transaction signing flows are delegated to the wallet adapter and require explicit user approval in the wallet UI.

### Improvements made

- Added stronger wallet session validation for Freighter.
- Updated reconnect logic to restore state only when the wallet remains connected and the public key is unchanged.
- Added storage synchronization for wallet network state.
- Added network mismatch protection in trustline transaction flows.
- Added a duplicate transaction submission guard in `useSignTransaction`.

### Wallet risks reviewed

- Unsafe wallet permissions: none were detected in frontend code.
- Seed phrase handling: not present.
- Private key handling: not present.
- Unsafe transaction signing: signing is proxied through wallet adapters.
- Missing network validation: improved in reconnect and trustline flows.
- Missing transaction confirmation UI: trustline confirmation is explicit via modal flow.
- Wallet session persistence issues: wallet session storage now avoids secrets and validates session state.
- Insecure RPC usage: all RPC endpoints are configured through environment variables and expected to use HTTPS.
- Blind signing risks: all transactions are prepared and passed as XDR to wallets, and the wallet UI is responsible for signing confirmation.

## Transaction Safety Review

### Findings

- Transaction submission now guards against duplicate sign/submit operations.
- Ship upgrade execution flow now accepts both `SUCCESS` and `PENDING` submission statuses and handles on-chain polling correctly.
- Trustline flows now validate wallet network alignment before preparing a transaction.
- The app uses explicit wallet confirmation flows for signing operations.

### Improvements made

- Prevented re-entry of `signAndSubmit` while a submission is in progress.
- Improved upgrade transaction error handling for `SUCCESS`, `PENDING`, and failure statuses.
- Enforced network validation before trustline transaction preparation.
- Preserved user-facing confirmation and error feedback in transaction flows.

### Transaction safety gaps to monitor

- Ensure duplicate submission is also prevented at the UI trigger level, especially when buttons are clicked repeatedly.
- Keep optimistic UI states consistent with actual on-chain results and clearly communicate pending/failed transaction state.
- Verify that any future transaction builder code includes output validation for amount, recipient, and asset details.

## OWASP Top 10 Review

### Broken Access Control

- Frontend access control is limited to wallet connection state; sensitive operations are gated by wallet sign requests.
- Backend access control is not in scope for this frontend-only review.

### Cryptographic Failures

- All signing is delegated to external wallets.
- Private keys and secrets are not stored in the application.

### Injection

- User inputs used to build Stellar operations are validated (`assetCode`, `issuer`).
- Transaction generation is performed through the official Stellar SDK.

### Insecure Design

- No CSP is currently enforced by the frontend; this should be added at the hosting layer.
- The app relies on environment-configured RPC/Horizon endpoints; these must be validated in deployment.

### Security Misconfiguration

- The environment loader validates required variables.
- `.env*` files are now ignored by source control.

### Vulnerable Components

- Enforced in CI by `npm run audit:ci`; see [Dependency Security Review](#dependency-security-review).

### Authentication Failures

- Wallet-based authentication is used; there is no password storage in the frontend.
- Connection state is validated before sensitive actions.

### Integrity Failures

- No code integrity mechanism is present in the frontend bundle.
- Recommended: add runtime integrity checks or signed deployments on the hosting platform.

### Logging Failures

- No sensitive wallet or private data is written to logs in the reviewed code.

### SSRF Risks

- RPC and Horizon URLs are externally configurable, so only trusted HTTPS endpoints should be used in deployment.

## Subresource Integrity (SRI)

External CDN scripts (currently LogRocket) are loaded with a `sha384` integrity hash and `crossorigin="anonymous"` so a compromised CDN cannot serve altered code.

- `npm run sri:generate` fetches each CDN resource and prints its hash.
- `npm run sri:update` writes the hashes into `index.html` and `src/utils/sri.ts`.
- `npm run sri:check` verifies the committed hashes and runs in the `build` job of `ci.yml`.

When a CDN resource changes upstream, run `npm run sri:update` and commit the result. To add a resource, add it to `CDN_RESOURCES` in `scripts/generate-sri.mjs` and `SRI_RESOURCES` in `src/utils/sri.ts`.

## Environment Variable Security

- Environment variables are loaded through Vite and validated at runtime.
- The project keeps `VITE_*` configuration variables in source control, but sensitive values should be provided via CI/CD secrets.
- `.env`, `.env.local`, `.env.*` are now ignored by git.
- No secrets were found committed in reviewed environment files.
- The following values are safe to expose in frontend config only when they are not secret:
  - network endpoints
  - contract IDs
  - public API base URLs

## Recommendations

- Add a Content Security Policy (CSP) at the hosting layer.
- Migrate to Tailwind CSS 4 to retire the `braces` allowlist entry.
- Upgrade `react-router-dom` to v7 for the moderate open-redirect advisories.
- Add runtime secure RPC validation to reject non-HTTPS endpoints.
- Implement wallet phishing detection guidance in UI messaging.
- Use transaction simulation wherever possible before signing.
- Add rate limiting and abuse protection for backend endpoints connected to wallet flows.
- Consider bundle integrity and signed deploys for production releases.

## Audit Status

- `SECURITY.md` has been created with a project-specific review.
- Code-level wallet and transaction safety improvements were implemented.
- `.gitignore` now excludes environment files.
- `npm audit` was run on 2026-10-18; high/critical findings were resolved or reviewed as described in
  [Dependency Security Review](#dependency-security-review), and the CI gate now enforces the policy.
