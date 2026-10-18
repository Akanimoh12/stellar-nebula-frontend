import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'
import { Button, ButtonGroup } from '@/components/Button'
import { MotionToggle } from '@/components/MotionToggle'
import { Select } from '@/components/Select'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ThemeProvider } from '@/contexts/ThemeContext'

expect.extend(toHaveNoViolations)

function parsePixels(value: string | undefined | null): number {
  if (!value) return 0
  if (value.endsWith('px')) {
    return parseFloat(value)
  }
  if (value.endsWith('rem')) {
    return parseFloat(value) * 16
  }
  return parseFloat(value) || 0
}

describe('Touch Target Sizes — WCAG 2.1 SC 2.5.5 (AAA >= 44x44px)', () => {
  it('defines >=44x44px touch target tokens in tailwind.config.js', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'tailwind.config.js'), 'utf8')
    expect(configSource).toContain("touch: '44px'")
    expect(configSource).toContain("'touch-lg': '48px'")
    expect(configSource).toContain("'touch-gap': '8px'")
  })

  it('enforces >=44x44px minimum dimensions across all Button sizes and variants', () => {
    const sizes = ['sm', 'md', 'lg', 'icon'] as const
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const

    for (const size of sizes) {
      for (const variant of variants) {
        const label = `Btn-${size}-${variant}`
        const { unmount } = render(
          <Button size={size} variant={variant}>
            {label}
          </Button>
        )

        const btn = screen.getByRole('button', { name: label })
        const minHeight = parsePixels(btn.style.minHeight)
        const minWidth = parsePixels(btn.style.minWidth)

        expect(minHeight).toBeGreaterThanOrEqual(44)
        expect(minWidth).toBeGreaterThanOrEqual(44)
        expect(btn).toHaveClass('touch-target')
        unmount()
      }
    }
  })

  it('ensures adequate spacing (>= 8px) between adjacent touch targets in ButtonGroup', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Primary actions">
        <Button>Scan</Button>
        <Button variant="secondary">Upgrade</Button>
        <Button variant="danger">Eject</Button>
      </ButtonGroup>
    )

    const group = screen.getByRole('group', { name: /primary actions/i })
    expect(group).toHaveClass('touch-group')
    expect(parsePixels(group.style.gap)).toBeGreaterThanOrEqual(8)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('verifies interactive controls (ThemeToggle, MotionToggle, Select) meet >=44x44px target sizes', async () => {
    const { container } = render(
      <ThemeProvider>
        <div className="touch-group flex gap-2">
          <ThemeToggle />
          <MotionToggle />
          <Select
            id="touch-select"
            label="Resource Filter"
            options={[
              { value: 'all', label: 'All Resources' },
              { value: 'nebulite', label: 'Nebulite' },
            ]}
          />
        </div>
      </ThemeProvider>
    )

    const themeBtn = screen.getByRole('button', { name: /switch to (light|dark) mode/i })
    expect(parsePixels(themeBtn.style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(parsePixels(themeBtn.style.minWidth)).toBeGreaterThanOrEqual(44)

    const motionBtn = screen.getByRole('button', { name: /(pause|resume) animations/i })
    expect(parsePixels(motionBtn.style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(parsePixels(motionBtn.style.minWidth)).toBeGreaterThanOrEqual(44)

    const selectTrigger = screen.getByRole('combobox', { name: /resource filter/i })
    expect(parsePixels(selectTrigger.style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(parsePixels(selectTrigger.style.minWidth)).toBeGreaterThanOrEqual(44)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
