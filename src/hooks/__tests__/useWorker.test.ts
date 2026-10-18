import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWorker } from '../useWorker'

interface TestRequest {
  id: number
  value: number
}

interface TestResponse {
  id: number
  doubled: number
}

/**
 * Minimal in-memory stand-in for the DOM `Worker` API. Echoes back
 * `value * 2` for every posted message, after a microtask tick, so tests can
 * exercise the request/response correlation logic in `useWorker` without a
 * real worker thread (not available in the jsdom/happy-dom test environment).
 */
class MockWorker {
  onmessage: ((event: MessageEvent<TestResponse>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false
  postedMessages: TestRequest[] = []

  postMessage(message: TestRequest): void {
    this.postedMessages.push(message)
    queueMicrotask(() => {
      if (this.terminated) return
      this.onmessage?.({
        data: { id: message.id, doubled: message.value * 2 },
      } as MessageEvent<TestResponse>)
    })
  }

  terminate(): void {
    this.terminated = true
  }
}

describe('useWorker', () => {
  it('resolves run() with the response correlated by id', async () => {
    const worker = new MockWorker()
    const { result } = renderHook(() =>
      useWorker<TestRequest, TestResponse>(() => worker as unknown as Worker)
    )

    const response = await result.current.run({ value: 21 })

    expect(response.doubled).toBe(42)
  })

  it('creates the worker lazily and reuses it across calls', async () => {
    const createWorker = vi.fn(() => new MockWorker() as unknown as Worker)
    const { result } = renderHook(() => useWorker<TestRequest, TestResponse>(createWorker))

    expect(createWorker).not.toHaveBeenCalled()

    await result.current.run({ value: 1 })
    await result.current.run({ value: 2 })

    expect(createWorker).toHaveBeenCalledTimes(1)
  })

  it('resolves concurrent requests with their own matching response, even out of order', async () => {
    class OutOfOrderWorker extends MockWorker {
      postMessage(message: TestRequest): void {
        this.postedMessages.push(message)
        // Respond to the second request before the first, to prove
        // correlation is by id and not call order.
        const delay = message.value === 1 ? 10 : 0
        setTimeout(() => {
          this.onmessage?.({
            data: { id: message.id, doubled: message.value * 2 },
          } as MessageEvent<TestResponse>)
        }, delay)
      }
    }

    const worker = new OutOfOrderWorker()
    const { result } = renderHook(() =>
      useWorker<TestRequest, TestResponse>(() => worker as unknown as Worker)
    )

    const first = result.current.run({ value: 1 })
    const second = result.current.run({ value: 2 })

    const [firstResponse, secondResponse] = await Promise.all([first, second])

    expect(firstResponse.doubled).toBe(2)
    expect(secondResponse.doubled).toBe(4)
  })

  it('rejects in-flight requests when the worker reports an error', async () => {
    const worker = new MockWorker()
    worker.postMessage = () => {
      /* never respond */
    }
    const { result } = renderHook(() =>
      useWorker<TestRequest, TestResponse>(() => worker as unknown as Worker)
    )

    const pending = result.current.run({ value: 5 })
    worker.onerror?.({ message: 'boom' } as ErrorEvent)

    await expect(pending).rejects.toThrow('boom')
  })

  it('terminates the worker and rejects pending requests on unmount', async () => {
    const worker = new MockWorker()
    worker.postMessage = () => {
      /* never respond, to keep the request pending */
    }
    const terminateSpy = vi.spyOn(worker, 'terminate')

    const { result, unmount } = renderHook(() =>
      useWorker<TestRequest, TestResponse>(() => worker as unknown as Worker)
    )

    const pending = result.current.run({ value: 7 })
    unmount()

    await expect(pending).rejects.toThrow()
    expect(terminateSpy).toHaveBeenCalledTimes(1)
  })

  it('run() attaches an auto-incrementing id to each posted message', async () => {
    const worker = new MockWorker()
    const { result } = renderHook(() =>
      useWorker<TestRequest, TestResponse>(() => worker as unknown as Worker)
    )

    await result.current.run({ value: 10 })
    await result.current.run({ value: 20 })

    await waitFor(() => expect(worker.postedMessages).toHaveLength(2))
    expect(worker.postedMessages[0].id).toBe(0)
    expect(worker.postedMessages[1].id).toBe(1)
  })
})
