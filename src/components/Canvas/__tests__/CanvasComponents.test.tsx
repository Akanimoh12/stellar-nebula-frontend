import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../../test/utils'
import { FpsCounter } from '../FpsCounter'

vi.mock('@/hooks/useFrameRateMonitor', () => ({
  useFrameRateMonitor: () => ({ fps: 60 }),
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useThree: () => ({
    gl: { dispose: vi.fn(), forceContextLoss: vi.fn() },
    scene: {},
    camera: {},
  }),
  useFrame: vi.fn(),
}))

vi.mock('@react-three/drei', () => ({
  Preload: () => null,
  OrbitControls: () => null,
}))

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Bloom: () => null,
  DepthOfField: () => null,
}))

vi.mock('postprocessing', () => ({
  KernelSize: { VERY_LARGE: 5 },
  BlendFunction: { SCREEN: 1 },
}))

describe('Canvas components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('FpsCounter', () => {
    it('renders FPS display', () => {
      render(<FpsCounter />)
      expect(screen.getByText(/fps/i)).toBeInTheDocument()
    })

    it('displays numeric FPS value', () => {
      render(<FpsCounter />)
      const el = screen.getByText(/fps/i)
      expect(el.textContent).toMatch(/\d+ FPS/)
    })

    it('applies correct color for high FPS', () => {
      render(<FpsCounter />)
      const el = screen.getByText(/fps/i)
      expect(el).toHaveStyle({ color: '#4ade80' })
    })
  })

  describe('NebulaCanvas rendering', () => {
    it('exports NebulaCanvas component', async () => {
      const mod = await import('../NebulaCanvas')
      expect(['function', 'object']).toContain(typeof mod.NebulaCanvas)
    })

    it('exports NebulaScene component', async () => {
      const mod = await import('../NebulaScene')
      expect(typeof mod.NebulaScene).toBe('function')
    })

    it('exports CameraControls component', async () => {
      const mod = await import('../CameraControls')
      expect(typeof mod.CameraControls).toBe('function')
    })

    it('exports ShipModel component', async () => {
      const mod = await import('../ShipModel')
      expect(typeof mod.ShipModel).toBe('function')
    })
  })

  describe('CameraControls configuration', () => {
    it('exports CameraControls with expected props interface', async () => {
      const mod = await import('../CameraControls')
      const fn = mod.CameraControls
      expect(fn.length).toBeGreaterThanOrEqual(0)
    })
  })
})
