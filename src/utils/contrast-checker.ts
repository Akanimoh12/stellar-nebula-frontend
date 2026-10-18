/**
 * WCAG 2.1 contrast ratio utilities.
 *
 * Calculations follow the W3C relative luminance formula:
 *   https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * Success criteria:
 *   AA normal text  — 4.5 : 1
 *   AA large text   — 3.0 : 1  (18 pt / 14 pt bold)
 *   AAA normal text — 7.0 : 1
 *   AAA large text  — 4.5 : 1
 */

export interface RgbColor {
  r: number
  g: number
  b: number
}

/** Convert a 0-255 channel value to linearised sRGB. */
function linearise(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Relative luminance of an RGB colour (0–1). */
export function relativeLuminance({ r, g, b }: RgbColor): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b)
}

/**
 * Contrast ratio between two colours.
 * The result is always ≥ 1 regardless of argument order.
 */
export function contrastRatio(a: RgbColor, b: RgbColor): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export type WcagLevel = 'AA' | 'AAA'
export type TextSize = 'normal' | 'large'

/**
 * Minimum contrast ratio required for the given WCAG level and text size.
 *
 * "Large text" is defined as ≥ 18 pt (24 px) regular weight, or ≥ 14 pt
 * (approximately 18.67 px) bold weight.
 */
export function requiredRatio(level: WcagLevel, size: TextSize): number {
  if (level === 'AAA') return size === 'large' ? 4.5 : 7
  return size === 'large' ? 3 : 4.5
}

export interface ContrastResult {
  ratio: number
  passesAA: boolean
  passesAAANormal: boolean
  passesAAALarge: boolean
  /** Human-readable summary, e.g. "4.83:1 — passes AA normal text". */
  summary: string
}

/** Full WCAG compliance report for a foreground/background pair. */
export function checkContrast(foreground: RgbColor, background: RgbColor): ContrastResult {
  const ratio = contrastRatio(foreground, background)
  const passesAA = ratio >= requiredRatio('AA', 'normal')
  const passesAAANormal = ratio >= requiredRatio('AAA', 'normal')
  const passesAAALarge = ratio >= requiredRatio('AAA', 'large')

  const level = passesAAANormal
    ? 'passes AAA'
    : passesAA
      ? 'passes AA'
      : 'fails AA'

  return {
    ratio,
    passesAA,
    passesAAANormal,
    passesAAALarge,
    summary: `${ratio.toFixed(2)}:1 — ${level} normal text`,
  }
}

/**
 * Parse a CSS hex colour string (#RGB, #RRGGBB, #RGBA, #RRGGBBAA) into RgbColor.
 * Returns null for unrecognised strings.
 */
export function parseHex(hex: string): RgbColor | null {
  const clean = hex.replace(/^#/, '')
  if (clean.length === 3 || clean.length === 4) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return { r, g, b }
  }
  if (clean.length === 6 || clean.length === 8) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    return { r, g, b }
  }
  return null
}

/**
 * Convenience: check contrast from hex strings.
 * Throws if either string is not a valid hex colour.
 */
export function checkHexContrast(fgHex: string, bgHex: string): ContrastResult {
  const fg = parseHex(fgHex)
  const bg = parseHex(bgHex)
  if (!fg) throw new Error(`Invalid foreground hex colour: ${fgHex}`)
  if (!bg) throw new Error(`Invalid background hex colour: ${bgHex}`)
  return checkContrast(fg, bg)
}
