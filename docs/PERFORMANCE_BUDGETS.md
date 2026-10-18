# Performance Budgets

This project enforces two kinds of performance budget in CI, both of which
fail the build when violated (#384):

1. **Bundle size budgets** — per-chunk JS/CSS/HTML size limits.
2. **Lighthouse budgets** — Core Web Vitals and resource-size thresholds
   measured against a built, served copy of the app.

## Bundle size budgets (`.size-limit.json`)

Defined per output chunk, enforced by [size-limit](https://github.com/ai/size-limit):

| Budget                 | Limit (gzip unless noted) |
| ---------------------- | ------------------------- |
| Total JS               | 1030 kB                   |
| Vendor chunk           | 450 kB                    |
| React vendor chunk     | 95 kB                     |
| Three.js feature chunk | 275 kB                    |
| Stellar feature chunk  | 315 kB                    |
| CSS bundle             | 40 kB                     |
| HTML entry             | 5 kB (raw)                |
| Total dist size        | 1.2 MB                    |

**Enforced in CI** by the `build` job in `.github/workflows/ci.yml`:

- `andresz1/size-limit-action` runs `npm run size-limit`, fails the job on
  any limit breach, and posts/updates a size table as a PR comment.
- `node scripts/bundle-analysis.mjs` separately compares every chunk against
  `.bundle-baseline.json` and fails if any chunk grew more than 10% since the
  baseline was last updated (catches slow creep even within budget) and
  posts a markdown report (`bundle-report.md`) as a PR comment.

**Run locally:**

```bash
npm run build
npm run size-limit        # size-limit budgets only
npm run bundle:check       # build + size-limit + bundle-analysis
```

**Raising a size budget:** edit `.size-limit.json`, justify the increase in
the PR description, and get it reviewed like any other budget change. If the
regression was unintentional, prefer fixing the regression over raising the
budget.

**Updating the growth baseline** (after an intentional, reviewed size
increase): `npm run bundle:update-baseline`, then commit the updated
`.bundle-baseline.json`.

## Lighthouse / Core Web Vitals budgets (`.lighthouserc.cjs`)

Measured against `vite preview` (a production build) with Lighthouse CI,
simulating a fast 4G mobile connection, 3 runs per PR with the best
("optimistic") run used for scoring to reduce CI noise.

| Metric                    | Budget    | Severity |
| ------------------------- | --------- | -------- |
| Performance score         | ≥ 0.80    | error    |
| First Contentful Paint    | ≤ 1800 ms | error    |
| Largest Contentful Paint  | ≤ 2500 ms | error    |
| Time to Interactive       | ≤ 4000 ms | error    |
| Total Blocking Time       | ≤ 250 ms  | error    |
| Cumulative Layout Shift   | ≤ 0.1     | error    |
| Speed Index               | ≤ 3000 ms | warn     |
| Script payload            | ≤ 2 MB    | error    |
| Image payload             | ≤ 700 kB  | warn     |
| Font payload              | ≤ 200 kB  | warn     |
| Total payload             | ≤ 3 MB    | warn     |
| Render-blocking resources | none      | warn     |
| Total request count       | ≤ 60      | warn     |

An `error`-severity assertion failing makes `lhci autorun`'s assert step
(and therefore `npm run performance:ci`) exit non-zero, which fails the
`lighthouse` job in `.github/workflows/performance.yml`. A `warn`-severity
assertion is reported but does not fail the build.

**Enforced in CI** by the `lighthouse` job in
`.github/workflows/performance.yml`:

- `npm run performance:ci` builds the app, serves it with `vite preview`,
  and runs `lhci autorun`, which fails the step (and the job) on any
  `error`-level budget violation.
- `scripts/lighthouse-budget-report.mjs` renders the actual-vs-budget
  numbers for the Core Web Vitals budgets into markdown, which is posted (and
  kept up to date on later pushes) as a PR comment, and uploaded as a build
  artifact either way — this makes _why_ the job failed readable without
  digging through raw `lhci` console output.

**Run locally:**

```bash
npm run build
npm run performance:lighthouse   # lhci autorun directly
# or, to also start/stop the preview server for you:
npm run performance:ci
```

**Raising a Lighthouse budget:** edit the relevant assertion in
`.lighthouserc.cjs`. `.lighthouserc.cjs`'s header comment documents the
tightening schedule the thresholds are expected to follow over time — don't
loosen a budget past where it started without a good reason in the PR
description.

## FPS / memory budgets (`test/performance`)

Separate from the two budgets above: `npm run performance:test` runs Vitest
suites under `test/performance` that assert on frame-rate and
memory-leak regressions in the Three.js scene. These run in the
`performance-unit` job in `.github/workflows/performance.yml` on every PR.
See `docs/performance-testing.md` for details on those thresholds and how to
interpret a failure.
