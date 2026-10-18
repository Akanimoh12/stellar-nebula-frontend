# Testing guide

See `TESTING_STRATEGY.md` for the overall approach. This page covers specific patterns.

## Snapshot policy

The suite currently has no snapshot files. Prefer explicit assertions (`getByRole`, `toHaveTextContent`) over snapshots, because large snapshots get updated without being read.

If you add a snapshot:

- Keep it small: one component state, not a whole page.
- Use inline snapshots (`toMatchInlineSnapshot`) when the output is a few lines.
- Review every snapshot diff in the PR as you would review code. Never run `vitest -u` just to make CI green.
- Delete snapshots that no longer protect against a real regression. Vitest reports obsolete snapshots at the end of a run; remove them in the same PR.

## Hook testing

Test hooks with `renderHook` from `@testing-library/react` (the old `@testing-library/react-hooks` package is not needed with React 18 and later). Put tests in `src/hooks/__tests__/`.

- Wrap state updates in `act`.
- Pass changing inputs through `initialProps` and `rerender`.
- Use `vi.useFakeTimers()` for debounced or delayed hooks, and restore real timers in `afterEach`.
- Cover the fallback paths too (missing or corrupt storage, unavailable APIs).

Examples: `useDebounce.test.ts`, `useLocalStorage.test.ts`.

## Accessibility in E2E

`e2e/accessibility.spec.ts` runs axe on the main routes. Use the helper in any spec:

```ts
import { expectNoA11yViolations } from './helpers/a11y-helpers'

await expectNoA11yViolations(page)
await expectNoA11yViolations(page, { include: '[role="dialog"]' })
```

Serious and critical violations fail the test, and the failure message lists each rule, its help text, the offending selectors and a link to the fix. To skip a rule, pass `disableRules` and link the issue that tracks it.
