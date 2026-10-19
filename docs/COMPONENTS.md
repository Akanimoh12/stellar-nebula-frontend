# Component Library & Accessibility Guide

This document describes the core accessible UI components, hooks, and mobile touch target standards in **Stellar Nebula**.

---

## 1. Custom `Select` Component (WAI-ARIA 1.2 Combobox)

**Files:**

- `src/components/Select.tsx`
- `src/hooks/useCombobox.ts`

### Overview

The custom `<Select />` component implements the [WAI-ARIA 1.2 Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) for select-only dropdowns, ensuring full keyboard navigation and screen reader support across desktop and mobile devices.

### Usage

```tsx
import { Select } from '@/components/Select'

const NETWORK_OPTIONS = [
  { value: 'futurenet', label: 'Futurenet', description: 'Experimental Soroban network' },
  { value: 'testnet', label: 'Testnet', description: 'Staging Stellar network' },
  { value: 'mainnet', label: 'Mainnet', disabled: true },
]

export function NetworkSelector({ value, onChange }) {
  return (
    <Select
      id="network-select"
      label="Stellar Network"
      options={NETWORK_OPTIONS}
      value={value}
      onChange={(nextValue) => onChange(nextValue)}
      helperText="Select the network used for Soroban transactions."
    />
  )
}
```

### Keyboard Navigation

| Key                                 | Action                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `ArrowDown`                         | Opens listbox if closed, or moves highlight to the next enabled option                |
| `ArrowUp`                           | Opens listbox if closed, or moves highlight to the previous enabled option            |
| `Home` / `PageUp`                   | Moves highlight to the first enabled option                                           |
| `End` / `PageDown`                  | Moves highlight to the last enabled option                                            |
| `Enter` / `Space`                   | Opens listbox if closed, or selects the highlighted option and closes the listbox     |
| `Escape`                            | Closes the listbox without changing selection and keeps focus on the combobox trigger |
| `Tab`                               | Closes the listbox and moves focus to the next focusable element                      |
| Printable characters (`a-z`, `0-9`) | Typeahead search: jumps to the next enabled option starting with the typed characters |

### Screen Reader & ARIA Attributes

- Trigger button uses `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, `aria-labelledby`, and `aria-activedescendant`.
- Popup list uses `role="listbox"` and options use `role="option"` with `aria-selected` and `aria-disabled`.
- Selection changes are announced politely via an `aria-live="polite"` status region (`"Selected <Option Label>"`).

---

## 2. Reduced Motion & Animation Controls (WCAG 2.1 SC 2.2.2)

**Files:**

- `src/hooks/useReducedMotion.ts`
- `src/components/MotionToggle.tsx`
- `src/components/NebulaCanvas.tsx` / `src/components/Canvas/NebulaCanvas.tsx`

### Overview

To prevent motion sickness and comply with **WCAG 2.1 Success Criterion 2.2.2 (Pause, Stop, Hide)** and **SC 2.3.3 (Animation from Interactions)**:

1. **System Preference Detection:** `useReducedMotion()` automatically detects `window.matchMedia('(prefers-reduced-motion: reduce)')` and listens for real-time OS/browser changes.
2. **Manual User Override & Pause Control:** Users can manually pause/resume 3D nebula animations or toggle reduced motion mode at any time via `<MotionToggle />` or by pressing `P` while focused on `<NebulaCanvas />`.
3. **Persistence & Synchronization:** User overrides are persisted in `localStorage` (`stellar-nebula:reduced-motion` and `stellar-nebula:animations-paused`) and synchronized across components and `document.documentElement` (`data-reduced-motion="true"`).
4. **Canvas Frame Loop & Post-Processing:** When reduced motion or pause is active, `NebulaCanvas` halts continuous rendering (`frameloop="never"`), disables camera auto-rotation, and disables bloom post-processing.

### Usage

```tsx
import { MotionToggle } from '@/components/MotionToggle'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function AnimationHeaderControl() {
  const { prefersReducedMotion, isPaused, togglePause } = useReducedMotion()

  return (
    <div>
      <MotionToggle variant="full" />
      <p>Animations: {isPaused || prefersReducedMotion ? 'Paused' : 'Active'}</p>
    </div>
  )
}
```

---

## 3. Mobile Touch Targets (`Button` & `ButtonGroup` — WCAG 2.1 SC 2.5.5 AAA)

**Files:**

- `src/components/Button.tsx`
- `src/styles/mobile.css`
- `tailwind.config.js`

### Overview

All interactive elements (`Button`, `MotionToggle`, `ThemeToggle`, `Select`, and `NebulaCanvas` scan buttons) enforce a minimum target size of **44×44px** (`min-h-touch min-w-touch` / `44px`) and a minimum spacing of **8px** (`gap-touch-gap`) between adjacent controls, complying with **WCAG 2.1 SC 2.5.5 (Target Size — Level AAA)**.

### Usage

```tsx
import { Button, ButtonGroup } from '@/components/Button'

export function ActionToolbar() {
  return (
    <ButtonGroup aria-label="Ship actions">
      <Button variant="primary" size="md">
        Scan Anomaly
      </Button>
      <Button variant="secondary" size="sm">
        Upgrade Hull
      </Button>
    </ButtonGroup>
  )
}
```

## Large Component Structure

Large screens are split so each file has one responsibility and stays under 300 lines.

### Nebula canvas (`src/components/Canvas/`)

| File                         | Responsibility                                                   |
| ---------------------------- | ---------------------------------------------------------------- |
| `NebulaCanvas.tsx`           | Composes the 3D scene, scan state, and cooldown handling         |
| `scanPoints.ts`              | Scan point metadata (ids, positions, resource types and amounts) |
| `ScanPointControls.tsx`      | Keyboard-accessible scan buttons overlaid on the canvas          |
| `useScanPointKeyboardNav.ts` | Keyboard navigation: Enter/Space to scan, arrows, Home/End, P    |
| `useDeviceHints.ts`          | Coarse mobile detection used to pick cheaper render settings     |
| `CanvasStatusLayer.tsx`      | Skip link and polite live region for screen readers              |

### Ship dashboard (`src/components/Dashboard/`)

| File                              | Responsibility                                                       |
| --------------------------------- | -------------------------------------------------------------------- |
| `ShipDashboard.tsx`               | Page layout, fleet seeding, and derived fleet metrics                |
| `useShipUpgradeFlow.ts`           | Upgrade bay state and both upgrade paths (local and contract)        |
| `ContractUpgradeConfirmModal.tsx` | Pre-sign review of a simulated on-chain upgrade                      |
| `ShipCard.tsx`                    | A single selectable ship in the fleet list                           |
| `dashboardData.ts`                | Demo ships and inventory, and the `hasResources` affordability check |
