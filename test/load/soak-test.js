/**
 * k6 soak test — Long-Running Stability (#423)
 *
 * Runs a moderate load for an extended period to detect memory leaks,
 * connection pool exhaustion, and degraded performance over time.
 *
 * Run (reduced duration for CI):
 *   k6 run -e SOAK_DURATION=5m test/load/soak-test.js
 *
 * Full soak (manual, staging only):
 *   k6 run -e SOAK_DURATION=30m test/load/soak-test.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'

const responseTime = new Trend('soak_response_time', true)

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173'
const API_BASE = __ENV.API_BASE || 'https://api.test'
const SOAK_DURATION = __ENV.SOAK_DURATION || '5m'

export const options = {
  stages: [
    { duration: '1m', target: 20 },              // Ramp up
    { duration: SOAK_DURATION, target: 20 },      // Sustained load
    { duration: '30s', target: 0 },               // Cool down
  ],

  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    soak_response_time: ['p(99)<3000'],
  },
}

export default function soakTest() {
  const headers = { 'Content-Type': 'application/json' }

  const start = Date.now()
  const res = http.get(`${API_BASE}/api/v1/nebula/zones`, { headers })
  responseTime.add(Date.now() - start)

  check(res, {
    'zones endpoint healthy': (r) => r.status === 200,
  })

  sleep(2) // Realistic pacing
}
