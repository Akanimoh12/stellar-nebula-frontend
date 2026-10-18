import { http, HttpResponse } from 'msw'

/**
 * Mock Service Worker (MSW) request handlers.
 * Intercepts network calls to Horizon, Soroban RPC, and the backend Nebula APIs during testing.
 */
export const handlers = [
  // ─── Stellar Horizon API Mocks ─────────────────────────────────────────────
  http.get('https://horizon-testnet.stellar.org/accounts/:accountId', ({ params }) => {
    const accountId = String(params.accountId)
    return HttpResponse.json({
      id: accountId,
      account_id: accountId,
      sequence: '12345678901234',
      subentry_count: 2,
      balances: [
        { asset_type: 'native', balance: '1000.5000000', buying_liabilities: '0', selling_liabilities: '0' },
        { asset_type: 'credit_alphanum4', asset_code: 'NEB', asset_issuer: 'GBBD47IF6LWK7P7MDEVTEST', balance: '250.0000000' },
      ],
    })
  }),

  // ─── Stellar Soroban RPC Mocks ─────────────────────────────────────────────
  http.post('https://soroban-testnet.stellar.org/*', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const method = body.method as string

    if (method === 'getHealth') {
      return HttpResponse.json({ jsonrpc: '2.0', id: body.id ?? 1, result: { status: 'healthy' } })
    }

    if (method === 'getAccount') {
      return HttpResponse.json({
        jsonrpc: '2.0',
        id: body.id ?? 1,
        result: { id: 'GTESTWALLET123', sequence: '123456' },
      })
    }

    return HttpResponse.json({
      jsonrpc: '2.0',
      id: body.id ?? 1,
      result: { status: 'SUCCESS' },
    })
  }),

  // ─── Nebula Backend API Mocks ──────────────────────────────────────────────
  http.get('https://api.test/api/v1/player/:publicKey', ({ params }) => {
    const publicKey = String(params.publicKey)
    return HttpResponse.json({
      success: true,
      data: {
        publicKey,
        username: 'StellarExplorer',
        credits: 15000,
        ships: [
          {
            id: 'ship-alpha',
            name: 'Stellar Hawk',
            class: 'explorer',
            stats: { speed: 70, shield: 50, hull: 60, cargoCapacity: 80, weaponPower: 30 },
            currentShield: 50,
            currentHull: 60,
            cargoLoaded: 25,
            ownerPublicKey: publicKey,
          },
        ],
        cargo: [{ resource: 'nebulite', quantity: 25 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
  }),

  http.get('https://api.test/api/v1/nebula/zones', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'nebula-zone-1',
          name: 'Orion Veil',
          type: 'emission',
          position: [100, 50, -200],
          radius: 250,
          resourceDensity: 0.85,
          isActive: true,
        },
        {
          id: 'nebula-zone-2',
          name: 'Cygnus Void',
          type: 'dark',
          position: [-300, 120, 150],
          radius: 180,
          resourceDensity: 0.45,
          isActive: true,
        },
      ],
    })
  }),

  http.post('https://api.test/api/v1/scan', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    return HttpResponse.json({
      success: true,
      data: {
        scanId: 'scan-uuid-42',
        sector: body.sector ?? 'Sector-Theta',
        anomaliesFound: 3,
        resourcesDetected: [
          { type: 'nebulite', abundance: 'high' },
          { type: 'voidcrystal', abundance: 'moderate' },
        ],
        completedAt: new Date().toISOString(),
      },
    })
  }),
]
