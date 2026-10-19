import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store'
import {
  SAVE_FORMAT_VERSION,
  exportSave,
  importSave,
  clearAllGameData,
  type SaveBundle,
} from '@/services/saveLoad'

// The save format has no per-slice migrations yet. These tests pin the version
// gate that any future migration has to pass through.
describe('save format version gate', () => {
  beforeEach(() => {
    clearAllGameData()
  })

  it('accepts a bundle at the current format version', () => {
    const bundle = exportSave(['game'])
    expect(bundle.formatVersion).toBe(SAVE_FORMAT_VERSION)

    const result = importSave(bundle)
    expect(result.applied).toEqual(['game'])
  })

  it('refuses a bundle written by a newer app version and leaves state alone', () => {
    useGameStore.setState({ elapsedSeconds: 42 })
    const bundle = { ...exportSave(['game']), formatVersion: SAVE_FORMAT_VERSION + 1 }

    const result = importSave(bundle)

    expect(result.applied).toEqual([])
    expect(result.skipped[0]?.name).toBe('*')
    expect(result.skipped[0]?.reason).toContain('newer app version')
    expect(useGameStore.getState().elapsedSeconds).toBe(42)
  })

  it('treats a bundle without a numeric formatVersion as malformed', () => {
    const bundle: Partial<SaveBundle> = exportSave(['game'])
    delete bundle.formatVersion

    const result = importSave(bundle)

    expect(result.applied).toEqual([])
    expect(result.skipped[0]?.reason).toBe('Malformed save bundle')
  })

  it('ignores slice names it does not know about', () => {
    const bundle = exportSave(['game'])
    bundle.slices.unknownFutureSlice = { anything: true }

    const result = importSave(bundle)

    expect(result.applied).toEqual(['game'])
    expect(result.skipped).toEqual([])
  })
})
