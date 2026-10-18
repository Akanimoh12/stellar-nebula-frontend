import { faker } from '@faker-js/faker'
import type { NebulaZone, NebulaType } from '@/types/game'

const NEBULA_TYPES: NebulaType[] = ['emission', 'reflection', 'dark', 'planetary']

export interface NebulaFactoryOverrides {
  id?: string
  name?: string
  type?: NebulaType
  position?: [number, number, number]
  radius?: number
  resourceDensity?: number
  isActive?: boolean
}

/**
 * Creates a mock NebulaZone with realistic randomized defaults using Faker.
 */
export function buildNebula(overrides: NebulaFactoryOverrides = {}): NebulaZone {
  return {
    id: overrides.id ?? `nebula-${faker.string.nanoid(8)}`,
    name:
      overrides.name ??
      `${faker.color.human()} ${faker.helpers.arrayElement(['Nebula', 'Cloud', 'Expanse', 'Veil', 'Cluster'])}`,
    type: overrides.type ?? faker.helpers.arrayElement(NEBULA_TYPES),
    position: overrides.position ?? [
      faker.number.float({ min: -1000, max: 1000, fractionDigits: 1 }),
      faker.number.float({ min: -500, max: 500, fractionDigits: 1 }),
      faker.number.float({ min: -1000, max: 1000, fractionDigits: 1 }),
    ],
    radius: overrides.radius ?? faker.number.int({ min: 50, max: 500 }),
    resourceDensity:
      overrides.resourceDensity ??
      faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
    isActive: overrides.isActive ?? true,
  }
}

/**
 * Builds multiple NebulaZone test records.
 */
export function buildNebulaList(
  count = 3,
  overrides: NebulaFactoryOverrides = {}
): NebulaZone[] {
  return Array.from({ length: count }, () => buildNebula(overrides))
}
