import { useMemo } from 'react'

/** Coarse device detection used to pick cheaper render settings on phones and tablets. */
export function useDeviceHints() {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
      }
    }

    const nav = navigator as Navigator & {
      userAgentData?: {
        mobile?: boolean
      }
    }

    return {
      isMobile:
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(max-width: 768px)').matches ||
        nav.userAgentData?.mobile === true,
    }
  }, [])
}
