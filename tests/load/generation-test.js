import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 2 }, // Ramp up to 2 users
    { duration: '1m', target: 2 },  // Stay at 2 users
    { duration: '30s', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.2'],     // Error rate must be below 20% (increased for CI)
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Test health endpoint
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test readiness endpoint
  const readyResponse = http.get(`${BASE_URL}/health/ready`);
  check(readyResponse, {
    'readiness status is 200': (r) => r.status === 200,
    'readiness response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test liveness endpoint
  const liveResponse = http.get(`${BASE_URL}/health/live`);
  check(liveResponse, {
    'liveness status is 200': (r) => r.status === 200,
    'liveness response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test root endpoint
  const rootResponse = http.get(`${BASE_URL}/`);
  check(rootResponse, {
    'root status is 200': (r) => r.status === 200,
    'root response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(2); // Increased sleep to reduce load
} 