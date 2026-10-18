# Web Workers

Expensive, pure calculations run in a Web Worker instead of on the main
thread so they don't block rendering or input handling (#383). Lighthouse
flags any main-thread task over 50ms as a "long task"; the main offender
in this codebase was procedural nebula geometry generation, which can take
well over that at higher particle counts.

## `src/workers/nebula-worker.ts`

Runs `generateNebulaGeometry` (from `src/utils/procedural/nebula.ts`) off
the main thread. Request/response shapes:

```ts
interface NebulaWorkerRequest {
  id: number // correlates a response to its request
  config: NebulaConfig
}

interface NebulaWorkerResponse {
  id: number
  geometry: NebulaGeometry | null
  error?: string
}
```

The generated `Float32Array` buffers are sent back via the [transferable
objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
mechanism (the third argument to `postMessage`) rather than structured-cloned,
so the (potentially large) geometry data isn't copied twice.

## `src/hooks/useWorker.ts`

A small generic hook for talking to any worker that follows the
"request/response objects both carry a numeric `id`" convention above:

```ts
function createMyWorker(): Worker {
  return new Worker(new URL('../workers/my-worker.ts', import.meta.url), { type: 'module' })
}

const { run, terminate } = useWorker<MyRequest, MyResponse>(createMyWorker)

const response = await run({ payload: 'whatever MyRequest needs, minus `id`' })
```

What it handles for you:

- **Lazy creation** — the worker is only constructed on the first `run()` call.
- **Reuse** — the same worker instance is reused across calls instead of
  spawning a new one (and paying worker startup cost) every time.
- **Correlation** — `run()` attaches an auto-incrementing `id` to each
  request and resolves the matching response, even if the worker finishes
  requests out of order.
- **Cleanup** — the worker is terminated automatically when the component
  using the hook unmounts, and any requests still in flight at that point
  are rejected.
- **Errors** — if the worker throws an uncaught error, every pending
  request's promise rejects with it.

> **Vite note:** the `new Worker(new URL('./x-worker.ts', import.meta.url))`
> call must be written inline at the call site (not behind a variable or a
> function parameter) for Vite's static analysis to pick up and bundle the
> worker entry. That's why `useWorker` takes a factory function rather than a
> URL or a `Worker` instance directly — the factory is written at the
> component's call site, where the inline `new URL(...)` pattern can live.

## Adding a new worker-backed calculation

1. Write the worker (`src/workers/<name>-worker.ts`), with a request/response
   pair that each carries `id`. Import whatever pure calculation function it
   needs to run.
2. Transfer large typed-array buffers back via the second argument to
   `postMessage` instead of letting them be structured-cloned, where possible.
3. In the consuming hook/component, create the worker with
   `new Worker(new URL('../workers/<name>-worker.ts', import.meta.url), { type: 'module' })`
   and drive it with `useWorker`.
4. Keep a main-thread fallback for environments without `Worker` support
   (older browsers, some test/SSR setups) — see `useProceduralNebula.ts` for
   the pattern: detect `typeof Worker !== 'undefined'` and call the plain
   synchronous function directly if it's missing, or if the worker call
   itself rejects.

## Testing

Because the test environment (happy-dom/jsdom under Vitest) has no real
`Worker` implementation, worker communication is tested by injecting a
mock `Worker`-shaped object into `useWorker`'s factory parameter — see
`src/hooks/__tests__/useWorker.test.ts`. The mock echoes responses
asynchronously (via `queueMicrotask`/`setTimeout`) so the tests also cover
out-of-order responses and error/termination handling, which are the parts
of `useWorker` that are easy to get wrong.
