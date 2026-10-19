import type { ResourceInventory, ResourceType, Ship } from '../../store'

export const DEMO_SHIPS: Ship[] = [
  {
    id: 'aurora-wake',
    name: 'Aurora Wake',
    model: 'Explorer Mk II',
    status: 'docked',
    cargoCapacity: 320,
    crewCapacity: 12,
    lastKnownSector: 'Orion Drift',
  },
  {
    id: 'nebula-runner',
    name: 'Nebula Runner',
    model: 'Freighter LX',
    status: 'in-flight',
    cargoCapacity: 540,
    crewCapacity: 18,
    lastKnownSector: 'Pulsar Corridor',
  },
  {
    id: 'glass-comet',
    name: 'Glass Comet',
    model: 'Scout V',
    status: 'maintenance',
    cargoCapacity: 180,
    crewCapacity: 8,
    lastKnownSector: 'Silent Array',
  },
]

export const DEMO_INVENTORY: ResourceInventory = {
  credits: 4200,
  fuel: 260,
  minerals: 180,
  nebulaDust: 90,
  nebulite: 120,
  stellarium: 65,
  voidcrystal: 30,
  darkMatter: 10,
}

const RESOURCE_ORDER: ResourceType[] = ['credits', 'fuel', 'minerals', 'nebulaDust']

/** True when the inventory covers every resource the upgrade cost lists. */
export function hasResources(
  inventory: ResourceInventory,
  cost: Partial<Record<ResourceType, number>>
): boolean {
  return RESOURCE_ORDER.every((resource) => (cost[resource] ?? 0) <= inventory[resource])
}
