# Error handling

## Error boundaries

`src/components/ErrorBoundary/ErrorBoundary.tsx` wraps the app. When a child throws while rendering it:

1. Logs the error to the console and sends it to `captureError` with the component stack.
2. Records an `error_reported` analytics event, noting whether an automatic retry is scheduled.
3. Calls the optional `onError(error, errorInfo)` prop.
4. Renders the `fallback` prop if given, otherwise a default `role="alert"` panel with the message, a **Try Again** button and a **Reload App** button.

Errors whose message looks transient (network, fetch, timeout, loading, resource, socket, abort) are retried automatically up to 2 times, 750 ms apart per attempt. Other errors wait for the user.

`FeatureErrorBoundary` does the same for a single panel so one broken feature does not take down the page.

## Testing

Tests live in `src/__tests__/ErrorBoundary.test.tsx` and `src/components/ErrorBoundary/__tests__/`. Use the helpers in `src/test/helpers/error-helpers.ts`:

- `createThrowingComponent(message)` returns a component that throws until `control.shouldThrow` is set to `false`, which makes recovery easy to test.
- `silenceConsoleError()` hides React's expected error output and returns a restore function.

Mock `services/errorTracking` and `services/analytics` to assert on reporting.
