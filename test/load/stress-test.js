/**
 * k6 stress test — API Endpoints (#423)
 *
 * Pushes the API endpoints beyond normal capacity to find breaking points.
 * This test is destructive by nature — run against staging, never production.
 *
 * Run:
 *   k6 run test/load/stress-test.js
 *
 * See docs/LOAD_TESTING.md for full documentation.
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('error_rate')

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173'
const API_BASE = __ENV.API_BASE || 'https://api.test'

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Ramp to normal load
    { duration: '2m', target: 100 },   // Push beyond normal
    { duration: '1m', target: 200 },   // Stress level
    { duration: '2m', target: 200 },   // Hold stress
    { duration: '1m', target: 0 },     // Recovery
  ],

  thresholds: {
    // Under stress, allow higher error rate and latency
    http_req_duration: ['p(95)<5000'],
    error_rate: ['rate<0.30'],          // Up to 30% errors acceptable under stress
    http_req_failed: ['rate<0.30'],
  },
}

export default function stressTest() {
  const headers = { 'Content-Type': 'application/json' }

  // Rapid-fire requests to simulate stress
  const responses = http.batch([
    ['GET', `${BASE_URL}/`, null, { tags: { type: 'page_load' } }],
    ['GET', `${API_BASE}/api/v1/nebula/zones`, null, { headers, tags: { type: 'zone_list' } }],
    ['GET', `${API_BASE}/api/v1/player/GSTRESS_TEST`, null, { headers, tags: { type: 'player' } }],
  ])

  for (const res of responses) {
    const success = check(res, {
      'status is not 5xx': (r) => r.status < 500,
    })
    errorRate.add(!success)
  }

  // Rapid scan attempt
  const scanRes = http.post(
    `${API_BASE}/api/v1/scan`,
    JSON.stringify({ pointId: 'stress-zone', resourceType: 'nebulite' }),
    { headers, tags: { type: 'scan' } }
  )
  const scanOk = check(scanRes, {
    'scan responds': (r) => r.status < 500,
  })
  errorRate.add(!scanOk)

  sleep(0.1) // Minimal pause to keep pressure high
}
