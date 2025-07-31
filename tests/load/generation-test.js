import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const API_VERSION = 'v1';

// Helper function to get auth token
function getAuthToken() {
  const loginPayload = JSON.stringify({
    email: 'test@synthos.ai',
    password: 'testpassword123'
  });

  const loginResponse = http.post(`${BASE_URL}/api/${API_VERSION}/auth/login`, loginPayload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (loginResponse.status === 200) {
    const body = JSON.parse(loginResponse.body);
    return body.access_token;
  }
  
  return null;
}

// Main test function
export default function () {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Test 1: Health check
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test 2: API health check
  const apiHealthCheck = http.get(`${BASE_URL}/api/${API_VERSION}/health`);
  check(apiHealthCheck, {
    'API health check status is 200': (r) => r.status === 200,
    'API health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test 3: User profile (authenticated)
  if (token) {
    const profileResponse = http.get(`${BASE_URL}/api/${API_VERSION}/users/profile`, { headers });
    check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  }

  // Test 4: Text generation (authenticated)
  if (token) {
    const generationPayload = JSON.stringify({
      prompt: 'Generate a creative story about a robot learning to paint',
      model: 'claude-3-sonnet',
      max_tokens: 500,
      temperature: 0.7,
    });

    const generationResponse = http.post(
      `${BASE_URL}/api/${API_VERSION}/generation/text`,
      generationPayload,
      { headers }
    );

    check(generationResponse, {
      'generation status is 200': (r) => r.status === 200,
      'generation response time < 10000ms': (r) => r.timings.duration < 10000,
    });
  }

  // Test 5: Dataset listing (authenticated)
  if (token) {
    const datasetsResponse = http.get(`${BASE_URL}/api/${API_VERSION}/datasets`, { headers });
    check(datasetsResponse, {
      'datasets status is 200': (r) => r.status === 200,
      'datasets response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  }

  // Test 6: Analytics endpoint (authenticated)
  if (token) {
    const analyticsResponse = http.get(`${BASE_URL}/api/${API_VERSION}/analytics/usage`, { headers });
    check(analyticsResponse, {
      'analytics status is 200': (r) => r.status === 200,
      'analytics response time < 1500ms': (r) => r.timings.duration < 1500,
    });
  }

  // Test 7: Custom models listing (authenticated)
  if (token) {
    const modelsResponse = http.get(`${BASE_URL}/api/${API_VERSION}/custom-models`, { headers });
    check(modelsResponse, {
      'models status is 200': (r) => r.status === 200,
      'models response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  }

  // Error tracking
  errorRate.add(healthCheck.status !== 200);
  errorRate.add(apiHealthCheck.status !== 200);

  // Think time between requests
  sleep(1);
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  
  // Verify the service is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Service not accessible at ${BASE_URL}`);
  }
  
  console.log('Service is accessible, starting load test...');
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Load test completed');
} 