import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLocalStorage } from '../useLocalStorage'

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useLocalStorage', () => {
  it('falls back to the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('theme', 'dark'))
    expect(result.current[0]).toBe('dark')
  })

  it('reads an existing stored value', () => {
    window.localStorage.setItem('theme', JSON.stringify('light'))
    const { result } = renderHook(() => useLocalStorage('theme', 'dark'))
    expect(result.current[0]).toBe('light')
  })

  it('persists updates, including functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('count', 1))

    act(() => result.current[1](5))
    expect(result.current[0]).toBe(5)

    act(() => result.current[1]((prev) => prev + 1))
    expect(result.current[0]).toBe(6)
    expect(window.localStorage.getItem('count')).toBe('6')
  })

  it('falls back to the initial value when stored JSON is corrupt', () => {
    window.localStorage.setItem('theme', '{not json')
    const { result } = renderHook(() => useLocalStorage('theme', 'dark'))
    expect(result.current[0]).toBe('dark')
  })
})
