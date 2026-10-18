# Load Testing

This document describes the load and stress testing setup for Stellar Nebula Frontend, powered by [k6](https://k6.io/).

## Overview

Load tests validate that the application and its API backend can handle concurrent user traffic without degrading performance. Three test profiles are provided:

| Test              | Purpose                              | Script                         | Typical Duration |
| ----------------- | ------------------------------------ | ------------------------------ | ---------------- |
| **Scanning Flow** | Simulates realistic user journeys    | `test/load/scanning-flow.js`   | ~3.5 minutes     |
| **Stress Test**   | Pushes beyond capacity to find limits| `test/load/stress-test.js`     | ~7 minutes       |
| **Soak Test**     | Detects leaks under sustained load   | `test/load/soak-test.js`       | 5–30 minutes     |

## Prerequisites

1. **Install k6** — [official guide](https://grafana.com/docs/k6/latest/get-started/installation/)

   ```bash
   # macOS
   brew install k6

   # Linux (Debian/Ubuntu)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
     --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
     | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6
   ```

2. **Target environment** — the tests default to `http://localhost:5173` (Vite dev server) and `https://api.test` (MSW-mocked API). Override with environment variables for staging:

   ```bash
   k6 run -e BASE_URL=https://staging.example.com -e API_BASE=https://api.staging.example.com test/load/scanning-flow.js
   ```

## Running Tests

### Scanning Flow (recommended starting point)

```bash
k6 run test/load/scanning-flow.js
```

Simulates 10–50 concurrent users performing:
1. Load the app shell
2. Fetch player profile
3. List nebula zones
4. Initiate a scan
5. Verify results

### Stress Test

```bash
k6 run test/load/stress-test.js
```

Ramps to 200 concurrent users with rapid-fire batched requests. Use against staging only — this is intentionally destructive.

### Soak Test

```bash
# Short soak (CI-friendly)
k6 run -e SOAK_DURATION=5m test/load/soak-test.js

# Full soak (manual, overnight)
k6 run -e SOAK_DURATION=30m test/load/soak-test.js
```

Holds 20 concurrent users for an extended period to surface memory leaks, connection pool exhaustion, or gradual performance degradation.

## Performance Thresholds

### Scanning Flow

| Metric                | Threshold           |
| --------------------- | ------------------- |
| HTTP p(95) latency    | < 2,000 ms          |
| HTTP p(99) latency    | < 5,000 ms          |
| HTTP failure rate     | < 5%                |
| Scan p(95) duration   | < 3,000 ms          |
| Scan success rate     | > 90%               |
| Zone list p(95)       | < 1,500 ms          |

### Stress Test

| Metric                | Threshold           |
| --------------------- | ------------------- |
| HTTP p(95) latency    | < 5,000 ms          |
| Error rate            | < 30%               |

### Soak Test

| Metric                | Threshold           |
| --------------------- | ------------------- |
| HTTP p(95) latency    | < 2,000 ms          |
| HTTP failure rate     | < 5%                |
| Response p(99)        | < 3,000 ms          |

## CI Integration

The load test workflow is defined in `.github/workflows/load-test.yml`. It supports manual dispatch (`workflow_dispatch`) with configurable parameters:

- **test_type**: `scanning-flow` | `stress-test` | `soak-test`
- **base_url**: Target application URL
- **api_base**: Target API URL

Results are uploaded as a GitHub Actions artifact (`load-test-results.json`) and summarized in the workflow step summary.

To trigger from the GitHub UI: **Actions → Load Test → Run workflow**.

## Custom Metrics

The scanning flow test exports these custom metrics alongside k6's built-in HTTP metrics:

- `scan_duration` — time to complete a scan request (Trend)
- `scan_success_rate` — fraction of scans that succeed (Rate)
- `zone_list_duration` — time to list nebula zones (Trend)

## Writing New Load Tests

1. Create a new `.js` file in `test/load/`.
2. Export `options` with `stages` and `thresholds`.
3. Export a default function with the scenario.
4. Add the script name to the `test_type` choice list in `load-test.yml`.
5. Document thresholds in this file.

## Interpreting Results

k6 prints a summary table at the end of each run. Key columns:

- **http_req_duration** — response time distribution
- **http_req_failed** — fraction of non-2xx responses
- **iterations** — total completed user journeys
- **vus** — peak virtual users

If any threshold is breached, k6 exits with a non-zero code and the CI job fails. Fix the underlying performance issue or adjust the threshold with justification documented here.
