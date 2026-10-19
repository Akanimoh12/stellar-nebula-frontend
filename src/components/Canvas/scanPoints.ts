import type { ResourceType } from '@/types/game'

export interface ScanPointMeta {
  id: string
  position: [number, number, number]
  resourceType: ResourceType
  resourceAmount: number
  label: string
}

/** Scannable anomaly points around the nebula, in Tab and arrow-key order. */
export const SCAN_POINTS_META: ScanPointMeta[] = [
  {
    id: 'scan-1',
    position: [2.2, 0.2, 0.4],
    resourceType: 'nebulite',
    resourceAmount: 50,
    label: 'Nebulite Deposit',
  },
  {
    id: 'scan-2',
    position: [-1.9, 0.8, -0.2],
    resourceType: 'stellarium',
    resourceAmount: 30,
    label: 'Stellarium Cluster',
  },
  {
    id: 'scan-3',
    position: [0.9, -1.8, 0.6],
    resourceType: 'voidcrystal',
    resourceAmount: 40,
    label: 'Voidcrystal Formation',
  },
  {
    id: 'scan-4',
    position: [-0.7, 1.7, -0.5],
    resourceType: 'darkMatter',
    resourceAmount: 25,
    label: 'Dark Matter Anomaly',
  },
]
