import { faker } from '@faker-js/faker'
import type { PlayerProfile } from '@/types/game'

export interface UserFactoryOverrides {
  publicKey?: string
  username?: string
  credits?: number
  ships?: PlayerProfile['ships']
  cargo?: PlayerProfile['cargo']
  createdAt?: string
}

/**
 * Creates a mock User/PlayerProfile with realistic randomized defaults using Faker.
 */
export function buildUser(overrides: UserFactoryOverrides = {}): PlayerProfile {
  return {
    publicKey:
      overrides.publicKey ??
      `G${faker.string.alphanumeric({ length: 55, casing: 'upper' })}`,
    username: overrides.username ?? faker.internet.username(),
    credits: overrides.credits ?? faker.number.int({ min: 100, max: 100000 }),
    ships: overrides.ships ?? [],
    cargo: overrides.cargo ?? [],
    createdAt: overrides.createdAt ?? faker.date.past().toISOString(),
  }
}

/**
 * Builds multiple User/PlayerProfile test records.
 */
export function buildUserList(
  count = 3,
  overrides: UserFactoryOverrides = {}
): PlayerProfile[] {
  return Array.from({ length: count }, () => buildUser(overrides))
}
