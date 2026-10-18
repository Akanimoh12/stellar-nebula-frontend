import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useLanguage,
  detectBrowserLanguage,
  LANGUAGE_STORAGE_KEY,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from '../useLanguage'

describe('useLanguage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.documentElement.removeAttribute('dir')
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('detects default language as English when no storage or preference is set', () => {
    expect(detectBrowserLanguage()).toBe('en')
    const { result } = renderHook(() => useLanguage())
    expect(result.current.language).toBe(DEFAULT_LANGUAGE)
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })

  it('detects stored language from localStorage', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es')
    expect(detectBrowserLanguage()).toBe('es')

    const { result } = renderHook(() => useLanguage())
    expect(result.current.language).toBe('es')
    expect(document.documentElement.lang).toBe('es')
  })

  it('updates document.documentElement.lang dynamically when language changes', () => {
    const { result } = renderHook(() => useLanguage())
    expect(document.documentElement.lang).toBe('en')

    act(() => {
      result.current.setLanguage('fr')
    })

    expect(result.current.language).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr')
  })

  it('ignores unsupported languages and does not change state', () => {
    const { result } = renderHook(() => useLanguage())

    act(() => {
      // @ts-expect-error Testing invalid language code
      result.current.setLanguage('invalid-lang')
    })

    expect(result.current.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('identifies supported languages correctly with isSupported', () => {
    const { result } = renderHook(() => useLanguage())

    expect(result.current.isSupported('en')).toBe(true)
    expect(result.current.isSupported('de')).toBe(true)
    expect(result.current.isSupported('xyz')).toBe(false)
  })

  it('exposes all supported languages metadata', () => {
    const { result } = renderHook(() => useLanguage())
    expect(result.current.supportedLanguages).toEqual(SUPPORTED_LANGUAGES)
    expect(result.current.supportedLanguages.length).toBeGreaterThanOrEqual(4)
  })
})
