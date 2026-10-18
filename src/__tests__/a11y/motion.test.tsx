import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from './setup'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

const canvasPropsSpy = vi.fn()

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, frameloop, ...rest }: { children: React.ReactNode; frameloop?: string }) => {
    canvasPropsSpy({ frameloop, ...rest })
    return (
      <div data-testid="mock-r3f-canvas" data-frameloop={frameloop}>
        {children}
      </div>
    )
  },
  useFrame: vi.fn(),
  useThree: () => ({
    camera: { position: { copy: vi.fn(), add: vi.fn() }, matrix: { extractBasis: vi.fn() } },
    gl: {
      domElement: document.createElement('canvas'),
      dispose: vi.fn(),
      forceContextLoss: vi.fn(),
    },
    scene: { traverse: vi.fn() },
  }),
}))

vi.mock('@react-three/drei', () => ({
  Preload: () => null,
  OrbitControls: () => null,
}))

vi.mock('@/components/Canvas/NebulaScene', () => ({
  NebulaScene: ({ performanceMode }: { performanceMode?: boolean }) => (
    <div data-testid="mock-nebula-scene" data-performance-mode={String(Boolean(performanceMode))} />
  ),
}))

vi.mock('@/components/Canvas/CameraControls', () => ({
  CameraControls: ({ reducedMotion }: { reducedMotion?: boolean }) => (
    <div data-testid="mock-camera-controls" data-reduced-motion={String(Boolean(reducedMotion))} />
  ),
}))

vi.mock('@/components/Effects', () => ({
  BloomEffect: ({ enabled }: { enabled?: boolean }) => (
    <div data-testid="mock-bloom-effect" data-enabled={String(Boolean(enabled))} />
  ),
}))

vi.mock('@/components/Effects/DepthOfFieldEffect', () => ({
  DepthOfFieldEffect: ({ enabled }: { enabled?: boolean }) => (
    <div data-testid="mock-dof-effect" data-enabled={String(Boolean(enabled))} />
  ),
}))

vi.mock('@/components/Canvas/WebGlFallback', () => ({
  WebGlFallback: () => null,
}))

vi.mock('@/services/analytics', () => ({
  trackEvent: vi.fn(),
}))

function createMatchMediaMock(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  const mediaQueryList = {
    get matches() {
      return matches
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    }),
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    }),
    dispatchEvent: vi.fn(),
  }

  const triggerChange = (nextMatches: boolean) => {
    matches = nextMatches
    for (const listener of listeners) {
      listener({
        matches: nextMatches,
        media: '(prefers-reduced-motion: reduce)',
      } as MediaQueryListEvent)
    }
  }

  const matchMediaFn = vi.fn().mockImplementation((query: string) => {
    if (query === '(prefers-reduced-motion: reduce)') {
      return mediaQueryList
    }
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })

  return { matchMediaFn, triggerChange }
}

describe('useReducedMotion hook — WCAG 2.1 SC 2.2.2', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-reduced-motion')
    document.documentElement.removeAttribute('data-animations-paused')
    document.documentElement.classList.remove('reduce-motion')
    canvasPropsSpy.mockClear()
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('respects system prefers-reduced-motion: reduce media query', async () => {
    const { matchMediaFn } = createMatchMediaMock(true)
    window.matchMedia = matchMediaFn

    const { useReducedMotion } = await import('@/hooks/useReducedMotion')
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current.systemPrefersReducedMotion).toBe(true)
    expect(result.current.prefersReducedMotion).toBe(true)
    expect(result.current.isPaused).toBe(true)
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true')
  })

  it('updates dynamically when OS prefers-reduced-motion changes', async () => {
    const { matchMediaFn, triggerChange } = createMatchMediaMock(false)
    window.matchMedia = matchMediaFn

    const { useReducedMotion } = await import('@/hooks/useReducedMotion')
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current.prefersReducedMotion).toBe(false)

    act(() => {
      triggerChange(true)
    })

    expect(result.current.systemPrefersReducedMotion).toBe(true)
    expect(result.current.prefersReducedMotion).toBe(true)
    expect(result.current.isPaused).toBe(true)
  })

  it('supports manual toggle override and persists preference to localStorage', async () => {
    const { matchMediaFn } = createMatchMediaMock(false)
    window.matchMedia = matchMediaFn

    const { useReducedMotion, REDUCED_MOTION_STORAGE_KEY } =
      await import('@/hooks/useReducedMotion')
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current.prefersReducedMotion).toBe(false)

    act(() => {
      result.current.toggleReducedMotion()
    })

    expect(result.current.prefersReducedMotion).toBe(true)
    expect(result.current.userOverride).toBe(true)
    expect(localStorage.getItem(REDUCED_MOTION_STORAGE_KEY)).toBe('true')

    act(() => {
      result.current.setReducedMotion(null)
    })

    expect(result.current.userOverride).toBeNull()
    expect(result.current.prefersReducedMotion).toBe(false)
  })

  it('allows animations to be paused and resumed manually', async () => {
    const { matchMediaFn } = createMatchMediaMock(false)
    window.matchMedia = matchMediaFn

    const { useReducedMotion } = await import('@/hooks/useReducedMotion')
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current.isPaused).toBe(false)

    act(() => {
      result.current.pauseAnimations()
    })

    expect(result.current.isPaused).toBe(true)
    expect(result.current.isManuallyPaused).toBe(true)

    act(() => {
      result.current.resumeAnimations()
    })

    expect(result.current.isPaused).toBe(false)
    expect(result.current.isManuallyPaused).toBe(false)
  })
})

describe('MotionToggle component — accessibility', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    const { matchMediaFn } = createMatchMediaMock(false)
    window.matchMedia = matchMediaFn
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('has no WCAG 2.1 AA axe violations', async () => {
    const { MotionToggle } = await import('@/components/MotionToggle')
    const { container } = render(<MotionToggle variant="full" />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('toggles animation pause state on click and keyboard activation and announces state', async () => {
    const user = userEvent.setup()
    const { MotionToggle } = await import('@/components/MotionToggle')

    render(<MotionToggle />)

    const button = screen.getByRole('button', { name: /pause animations/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAccessibleName(/resume animations/i)
    expect(screen.getByRole('status')).toHaveTextContent(/animations paused/i)

    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('status')).toHaveTextContent(/animations resumed/i)
  })

  it('allows resetting manual override to system preference in full variant', async () => {
    const user = userEvent.setup()
    const { MotionToggle } = await import('@/components/MotionToggle')

    render(<MotionToggle variant="full" />)

    const toggleBtn = screen.getByRole('button', { name: /pause animations/i })
    await user.click(toggleBtn)

    const resetBtn = screen.getByRole('button', {
      name: /reset motion preference to system setting/i,
    })
    expect(resetBtn).toBeInTheDocument()

    await user.click(resetBtn)
    expect(
      screen.queryByRole('button', { name: /reset motion preference to system setting/i })
    ).not.toBeInTheDocument()
  })
})

describe('NebulaCanvas — reduced motion & pause integration', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    canvasPropsSpy.mockClear()
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('halts Canvas frameloop and disables autoRotate when prefers-reduced-motion is active', async () => {
    const { matchMediaFn } = createMatchMediaMock(true)
    window.matchMedia = matchMediaFn

    const { NebulaCanvas } = await import('@/components/NebulaCanvas')
    render(<NebulaCanvas />)

    const wrapper = screen.getByRole('application')
    expect(wrapper).toHaveAttribute('data-reduced-motion', 'true')
    expect(wrapper).toHaveAttribute('data-animations-paused', 'true')

    const canvas = screen.getByTestId('mock-r3f-canvas')
    expect(canvas).toHaveAttribute('data-frameloop', 'never')

    const cameraControls = screen.getByTestId('mock-camera-controls')
    expect(cameraControls).toHaveAttribute('data-reduced-motion', 'true')
  })

  it('pauses and resumes animations via the on-canvas MotionToggle or P keyboard shortcut', async () => {
    const { matchMediaFn } = createMatchMediaMock(false)
    window.matchMedia = matchMediaFn
    const user = userEvent.setup()

    const { NebulaCanvas } = await import('@/components/NebulaCanvas')
    render(<NebulaCanvas />)

    const wrapper = screen.getByRole('application')
    expect(wrapper).toHaveAttribute('data-animations-paused', 'false')
    expect(screen.getByTestId('mock-r3f-canvas')).toHaveAttribute('data-frameloop', 'always')

    // Click the MotionToggle button inside NebulaCanvas
    const pauseBtn = screen.getByRole('button', { name: /pause animations/i })
    await user.click(pauseBtn)

    expect(wrapper).toHaveAttribute('data-animations-paused', 'true')
    expect(screen.getByTestId('mock-r3f-canvas')).toHaveAttribute('data-frameloop', 'never')

    // Press 'P' on the canvas wrapper to resume animations
    wrapper.focus()
    await user.keyboard('p')

    expect(wrapper).toHaveAttribute('data-animations-paused', 'false')
    expect(screen.getByTestId('mock-r3f-canvas')).toHaveAttribute('data-frameloop', 'always')
  })
})
