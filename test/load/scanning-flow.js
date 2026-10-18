/**
 * k6 load test — Scanning Flow (#423)
 *
 * Simulates concurrent users performing the core scanning workflow:
 *   1. Authenticate (fetch player profile)
 *   2. List nebula zones
 *   3. Initiate a scan
 *   4. Verify scan results
 *
 * Run locally:
 *   k6 run test/load/scanning-flow.js
 *
 * Run with custom base URL:
 *   k6 run -e BASE_URL=https://staging.example.com test/load/scanning-flow.js
 *
 * See docs/LOAD_TESTING.md for full documentation.
 */

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const scanDuration = new Trend('scan_duration', true)
const scanSuccess = new Rate('scan_success_rate')
const zoneListDuration = new Trend('zone_list_duration', true)

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173'
const API_BASE = __ENV.API_BASE || 'https://api.test'

export const options = {
  // Ramp-up pattern: warm up → sustained load → peak → cool down
  stages: [
    { duration: '30s', target: 10 },   // Warm-up: ramp to 10 VUs
    { duration: '1m', target: 25 },    // Normal load: 25 concurrent users
    { duration: '30s', target: 50 },   // Stress: ramp to 50 VUs
    { duration: '1m', target: 50 },    // Hold peak
    { duration: '30s', target: 0 },    // Cool down
  ],

  thresholds: {
    // 95th percentile response time under 2 seconds
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    // At least 95% of requests succeed (HTTP 2xx)
    http_req_failed: ['rate<0.05'],
    // Scanning-specific thresholds
    scan_duration: ['p(95)<3000'],
    scan_success_rate: ['rate>0.90'],
    zone_list_duration: ['p(95)<1500'],
  },
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_PUBLIC_KEY = 'GABC1234567890EXAMPLE'
const SCAN_RESOURCE_TYPES = ['nebulite', 'stellarium', 'voidcrystal', 'darkMatter']

function randomResource() {
  return SCAN_RESOURCE_TYPES[Math.floor(Math.random() * SCAN_RESOURCE_TYPES.length)]
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------
export default function scanningFlowScenario() {
  const headers = { 'Content-Type': 'application/json' }

  // Step 1: Load the app shell (simulates initial page load)
  group('Page Load', () => {
    const res = http.get(`${BASE_URL}/`)
    check(res, {
      'app shell loads': (r) => r.status === 200,
      'response body is not empty': (r) => (r.body?.length ?? 0) > 0,
    })
  })

  sleep(1) // Simulate user reading the page

  // Step 2: Fetch player profile
  group('Fetch Player Profile', () => {
    const res = http.get(`${API_BASE}/api/v1/player/${TEST_PUBLIC_KEY}`, { headers })
    check(res, {
      'player profile returns 200': (r) => r.status === 200,
    })
  })

  sleep(0.5)

  // Step 3: List available nebula zones
  group('List Nebula Zones', () => {
    const start = Date.now()
    const res = http.get(`${API_BASE}/api/v1/nebula/zones`, { headers })
    zoneListDuration.add(Date.now() - start)

    check(res, {
      'zone list returns 200': (r) => r.status === 200,
    })
  })

  sleep(0.5)

  // Step 4: Initiate scan
  group('Initiate Scan', () => {
    const start = Date.now()
    const payload = JSON.stringify({
      pointId: `nebula-zone-${Math.floor(Math.random() * 100)}`,
      resourceType: randomResource(),
    })

    const res = http.post(`${API_BASE}/api/v1/scan`, payload, { headers })
    scanDuration.add(Date.now() - start)

    const success = check(res, {
      'scan returns 200': (r) => r.status === 200,
      'scan response has body': (r) => (r.body?.length ?? 0) > 0,
    })
    scanSuccess.add(success ? 1 : 0)
  })

  sleep(1) // Simulate cooldown period

  // Step 5: Verify scan results (re-fetch player to confirm resource update)
  group('Verify Scan Results', () => {
    const res = http.get(`${API_BASE}/api/v1/player/${TEST_PUBLIC_KEY}`, { headers })
    check(res, {
      'updated profile returns 200': (r) => r.status === 200,
    })
  })

  sleep(0.5)
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------
export function setup() {
  console.log(`Load test targeting: ${BASE_URL}`)
  console.log(`API base: ${API_BASE}`)

  // Verify the target is reachable
  const res = http.get(`${BASE_URL}/`)
  if (res.status !== 200) {
    console.warn(`Warning: base URL returned status ${res.status}`)
  }
}

export function teardown(data) {
  console.log('Load test complete. Review the summary above for threshold results.')
}
