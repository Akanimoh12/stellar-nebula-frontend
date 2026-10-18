/**
 * Focus management utilities.
 *
 * The canonical focus-trap implementation lives in `src/hooks/useFocusTrap.ts`
 * and is used by `Modal`, `HelpModal`, and any other dialog in the app.  This
 * module re-exports the hook's selector constant and adds a handful of
 * imperative helpers for the rare cases where you need to manipulate focus
 * outside of React's render cycle.
 */

export { FOCUSABLE_SELECTOR } from '@/hooks/useFocusTrap'

/**
 * Return all keyboard-reachable elements inside `container`, in DOM order.
 * Excludes elements that are hidden, `aria-hidden`, or have `tabIndex < 0`.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')

  return Array.from(container.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
    if (el.tabIndex < 0) return false
    if (el.hidden || el.closest('[hidden]')) return false
    if (el.getAttribute('aria-hidden') === 'true') return false
    if (typeof el.checkVisibility === 'function') return el.checkVisibility()
    return true
  })
}

/**
 * Move focus to the first keyboard-reachable element inside `container`.
 * Falls back to focusing the container itself (which must have `tabIndex=-1`
 * or be natively focusable) when nothing is found.
 */
export function focusFirst(container: HTMLElement): void {
  const elements = getFocusableElements(container)
  ;(elements[0] ?? container).focus()
}

/**
 * Move focus to the last keyboard-reachable element inside `container`.
 * Falls back to the container itself when nothing is found.
 */
export function focusLast(container: HTMLElement): void {
  const elements = getFocusableElements(container)
  ;(elements[elements.length - 1] ?? container).focus()
}

/**
 * Announce a message to screen readers without moving focus.
 *
 * Creates a temporary `role="status"` live region, populates it, then removes
 * it after the announcement has had time to be read.  Prefer visible,
 * persistent feedback wherever possible; use this only for ephemeral
 * notifications (e.g. "Copied to clipboard").
 */
export function announceToScreenReader(message: string, delay = 100): void {
  const region = document.createElement('div')
  region.setAttribute('role', 'status')
  region.setAttribute('aria-live', 'polite')
  region.setAttribute('aria-atomic', 'true')
  Object.assign(region.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  })
  document.body.appendChild(region)

  // Defer so the browser registers the element before the text change.
  setTimeout(() => {
    region.textContent = message
    setTimeout(() => {
      document.body.removeChild(region)
    }, 2000)
  }, delay)
}
