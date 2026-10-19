import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore, gameStoreStorageKey } from '@/store'
import {
  exportSave,
  importSave,
  serializeSave,
  clearAllGameData,
  repairCorruptedSaveData,
  type SaveBundle,
} from '@/services/saveLoad'

function parseBundle(json: string): SaveBundle {
  return JSON.parse(json) as SaveBundle
}

describe('save/load round trip', () => {
  beforeEach(() => {
    clearAllGameData()
  })

  it('exports every registered slice with the current format version', () => {
    const bundle = exportSave()

    expect(bundle.formatVersion).toBe(1)
    expect(typeof bundle.savedAt).toBe('string')
    expect(Object.keys(bundle.slices).sort()).toEqual(
      [
        'achievement',
        'game',
        'graphics',
        'resource',
        'session',
        'settings',
        'ship',
        'tutorial',
        'user',
      ].sort()
    )
  })

  it('restores exported state after the live stores are changed', () => {
    useGameStore.setState({ elapsedSeconds: 1234 })
    const saved = serializeSave(exportSave(['game']))

    useGameStore.setState({ elapsedSeconds: 0 })
    const result = importSave(parseBundle(saved))

    expect(result.applied).toEqual(['game'])
    expect(result.skipped).toEqual([])
    expect(useGameStore.getState().elapsedSeconds).toBe(1234)
  })

  it('exports only the requested slices', () => {
    const bundle = exportSave(['game'])
    expect(Object.keys(bundle.slices)).toEqual(['game'])
  })

  it('resets slices to defaults and removes their storage entries', () => {
    useGameStore.setState({ elapsedSeconds: 99 })
    expect(window.localStorage.getItem(gameStoreStorageKey)).not.toBeNull()

    clearAllGameData(['game'])

    expect(useGameStore.getState().elapsedSeconds).not.toBe(99)
    expect(window.localStorage.getItem(gameStoreStorageKey)).toBeNull()
  })
})

describe('corruption handling', () => {
  beforeEach(() => {
    clearAllGameData()
  })

  it('rejects a malformed bundle without touching live state', () => {
    useGameStore.setState({ elapsedSeconds: 7 })

    const result = importSave({ slices: 'not-an-object' })

    expect(result.applied).toEqual([])
    expect(result.skipped).toEqual([{ name: '*', reason: 'Malformed save bundle' }])
    expect(useGameStore.getState().elapsedSeconds).toBe(7)
  })

  it('rejects a non-object input', () => {
    expect(importSave(null).skipped[0]?.reason).toBe('Malformed save bundle')
    expect(importSave('{}').skipped[0]?.reason).toBe('Malformed save bundle')
  })

  it('skips a schema-invalid slice but still applies the valid ones', () => {
    useGameStore.setState({ elapsedSeconds: 5 })
    const bundle = exportSave(['game', 'ship'])
    bundle.slices.game = { elapsedSeconds: 'oops' }
    bundle.slices.ship = { ships: [] }

    const result = importSave(bundle)

    expect(result.applied).toEqual(['ship'])
    expect(result.skipped).toEqual([{ name: 'game', reason: 'Failed schema validation' }])
    expect(useGameStore.getState().elapsedSeconds).toBe(5)
  })

  it('removes localStorage entries that are not valid JSON', () => {
    window.localStorage.setItem(gameStoreStorageKey, '{not json')

    const report = repairCorruptedSaveData()

    expect(window.localStorage.getItem(gameStoreStorageKey)).toBeNull()
    expect(report.cleared).toContainEqual({ key: gameStoreStorageKey, reason: 'Invalid JSON' })
  })

  it('removes localStorage entries that fail schema validation', () => {
    window.localStorage.setItem(
      gameStoreStorageKey,
      JSON.stringify({ state: { elapsedSeconds: 'bad' }, version: 0 })
    )

    const report = repairCorruptedSaveData()

    expect(window.localStorage.getItem(gameStoreStorageKey)).toBeNull()
    expect(report.cleared).toContainEqual({
      key: gameStoreStorageKey,
      reason: 'Failed schema validation',
    })
  })

  it('keeps a valid persisted entry untouched', () => {
    const valid = JSON.stringify({ state: exportSave(['game']).slices.game, version: 0 })
    window.localStorage.setItem(gameStoreStorageKey, valid)

    const report = repairCorruptedSaveData()

    expect(window.localStorage.getItem(gameStoreStorageKey)).toBe(valid)
    expect(report.cleared.map((c) => c.key)).not.toContain(gameStoreStorageKey)
  })
})
