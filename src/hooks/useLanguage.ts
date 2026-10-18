import { useState, useEffect, useCallback } from 'react'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
] as const

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

export const LANGUAGE_STORAGE_KEY = 'stellar_nebula_lang'
export const DEFAULT_LANGUAGE: SupportedLanguageCode = 'en'

/**
 * Detect user's preferred language from localStorage or navigator.
 */
export function detectBrowserLanguage(): SupportedLanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE

  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (saved && SUPPORTED_LANGUAGES.some((lang) => lang.code === saved)) {
      return saved as SupportedLanguageCode
    }
  } catch {
    // Ignore localStorage access issues
  }

  try {
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase()
    if (browserLang && SUPPORTED_LANGUAGES.some((lang) => lang.code === browserLang)) {
      return browserLang as SupportedLanguageCode
    }
  } catch {
    // Ignore navigator access issues
  }

  return DEFAULT_LANGUAGE
}

export interface UseLanguageReturn {
  language: SupportedLanguageCode
  setLanguage: (lang: SupportedLanguageCode) => void
  supportedLanguages: typeof SUPPORTED_LANGUAGES
  dir: 'ltr' | 'rtl'
  isSupported: (code: string) => boolean
}

/**
 * Hook for managing application language with screen-reader friendly dynamic HTML lang updates.
 */
export function useLanguage(): UseLanguageReturn {
  const [language, setLanguageState] = useState<SupportedLanguageCode>(() =>
    detectBrowserLanguage()
  )

  const setLanguage = useCallback((newLang: SupportedLanguageCode) => {
    if (!SUPPORTED_LANGUAGES.some((lang) => lang.code === newLang)) return
    setLanguageState(newLang)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang)
    } catch {
      // Ignore localStorage write errors
    }
  }, [])

  // Sync document.documentElement.lang and dir with the active language
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.setAttribute('lang', language)

    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === language)
    const direction = langConfig?.dir || 'ltr'
    root.setAttribute('dir', direction)
  }, [language])

  const isSupported = useCallback((code: string): boolean => {
    return SUPPORTED_LANGUAGES.some((lang) => lang.code === code)
  }, [])

  const currentConfig = SUPPORTED_LANGUAGES.find((l) => l.code === language)

  return {
    language,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    dir: currentConfig?.dir || 'ltr',
    isSupported,
  }
}

export default useLanguage
