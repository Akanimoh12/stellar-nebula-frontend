# Accessibility Guidelines (`WCAG 2.1 AA / AAA`)

Stellar Nebula is committed to meeting **WCAG 2.1 Level AA** across the entire application and **Level AAA** for mobile touch targets and reduced motion controls.

---

## 1. Heading Hierarchy (`WCAG 2.1 SC 1.3.1 & SC 2.4.6`)

Screen reader users navigate pages using the document heading outline (`h1`–`h6`). Maintaining a strict, sequential hierarchy ensures users can understand page structure and jump directly to sections.

### Rules

1. **Single `<h1>` per page:** Every route (`Home`, `NebulaView`, `ShipDashboard`, `Marketplace`, `LeaderboardPage`, `NotFound`) renders exactly one `<h1>` representing the primary page title.
2. **No skipped heading levels:** Headings must descend sequentially (`h1` → `h2` → `h3`). Never jump from `<h1>` directly to `<h3>` or `<h4>`.
3. **Modal & Dialog Headings:** Modals, drawers, and overlays (`Modal`, `HelpModal`, `SettingsPanel`, `OnboardingWelcome`, `TutorialFlow`, `InstallPrompt`, `UpgradeModal`, `ConfirmModal`) must use `<h2>` for their dialog title and `<h3>` for subsections so they do not introduce a second `<h1>` into the document.
4. **Standalone Panels & Empty States:** Top-level section panels (`TrustlineManager`, `ContractEventFeed`, `GasPriceMonitor`, `EmptyState`, `Inventory`, `AchievementList`) use `<h2>` for their primary heading and `<h3>` for item cards.
5. **Non-empty Headings:** Every heading element must contain accessible text content. Enforced by ESLint via `'jsx-a11y/heading-has-content': 'error'` in `eslint.config.js`.

### Correct Example

```tsx
<main id="main-content">
  <h1>Fleet command, inventory, and upgrades in one place.</h1>

  <section aria-labelledby="fleet-heading">
    <h2 id="fleet-heading">Tracked ships</h2>
  </section>

  <section aria-labelledby="inventory-heading">
    <h2 id="inventory-heading">Resource Inventory</h2>
    <h3>Nebulite</h3>
  </section>
</main>
```

---

## 2. Reduced Motion & Animation Controls (`WCAG 2.1 SC 2.2.2 & SC 2.3.3`)

- The `useReducedMotion` hook (`src/hooks/useReducedMotion.ts`) respects `prefers-reduced-motion: reduce` from the operating system and provides manual pause/resume and override controls persisted in `localStorage`.
- `NebulaCanvas` (`src/components/NebulaCanvas.tsx`) halts the Three.js frame loop (`frameloop="never"`), disables camera auto-rotation, and disables bloom post-processing when reduced motion or pause is active.
- Users can pause or resume animations at any time using `<MotionToggle />` or the `P` keyboard shortcut on the canvas.

---

## 3. Accessible Custom Select (`WAI-ARIA 1.2 Combobox`)

- Custom dropdowns (`src/components/Select.tsx` and `src/hooks/useCombobox.ts`) implement the WAI-ARIA 1.2 Combobox pattern (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`, `role="option"`, `aria-selected`).
- Full keyboard navigation is supported (`ArrowDown`, `ArrowUp`, `Home`, `End`, `Enter`, `Space`, `Escape`, `Tab`, and printable character typeahead).
- Option selection is announced via an `aria-live="polite"` status region.

---

## 4. Mobile Touch Target Sizes (`WCAG 2.1 SC 2.5.5 AAA`)

- All interactive controls (`Button`, `MotionToggle`, `ThemeToggle`, `Select`, and `NebulaCanvas` scan buttons) enforce a minimum hit area of **44×44px** (`min-h-touch min-w-touch` in `tailwind.config.js` and `src/styles/mobile.css`).
- Adjacent interactive elements maintain at least **8px** (`gap-touch-gap`) of spacing via `ButtonGroup` / `.touch-group`.
