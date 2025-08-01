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
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
    errors: ['rate<0.1'],              // Custom error rate should be below 10%
  },
};

// Test data
const testData = {
  dataset_name: 'load_test_dataset',
  description: 'Load test dataset',
  rows: 100,
  columns: [
    { name: 'id', type: 'integer', min: 1, max: 1000 },
    { name: 'name', type: 'string', pattern: 'name_{id}' },
    { name: 'email', type: 'email' },
    { name: 'age', type: 'integer', min: 18, max: 65 },
    { name: 'salary', type: 'float', min: 30000, max: 150000 },
  ],
};

// Helper function to generate auth token
function getAuthToken() {
  const loginData = {
    email: 'loadtest@synthos.ai',
    password: 'loadtest123',
  };

  const loginResponse = http.post('http://localhost:8000/api/v1/auth/login', JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginResponse.status === 200) {
    const body = JSON.parse(loginResponse.body);
    return body.access_token;
  }
  
  return null;
}

// Main test function
export default function () {
  const baseUrl = 'http://localhost:8000';
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };

  // Test 1: Health check
  const healthCheck = http.get(`${baseUrl}/health`);
  check(healthCheck, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Test 2: API health check
  const apiHealthCheck = http.get(`${baseUrl}/api/v1/health`);
  check(apiHealthCheck, {
    'api health check status is 200': (r) => r.status === 200,
  });

  // Test 3: Create dataset
  const createDatasetResponse = http.post(
    `${baseUrl}/api/v1/datasets`,
    JSON.stringify(testData),
    { headers }
  );
  
  check(createDatasetResponse, {
    'create dataset status is 201': (r) => r.status === 201,
    'create dataset has dataset_id': (r) => {
      if (r.status === 201) {
        const body = JSON.parse(r.body);
        return body.dataset_id !== undefined;
      }
      return false;
    },
  });

  let datasetId = null;
  if (createDatasetResponse.status === 201) {
    const body = JSON.parse(createDatasetResponse.body);
    datasetId = body.dataset_id;
  }

  // Test 4: Generate data (if dataset was created)
  if (datasetId) {
    const generateData = {
      dataset_id: datasetId,
      rows: 50,
      format: 'json',
    };

    const generateResponse = http.post(
      `${baseUrl}/api/v1/generation/generate`,
      JSON.stringify(generateData),
      { headers }
    );

    check(generateResponse, {
      'generate data status is 200': (r) => r.status === 200,
      'generate data has data': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.data !== undefined && body.data.length > 0;
        }
        return false;
      },
    });

    // Test 5: Get generation status
    const statusResponse = http.get(
      `${baseUrl}/api/v1/generation/status/${datasetId}`,
      { headers }
    );

    check(statusResponse, {
      'status check is 200': (r) => r.status === 200,
    });
  }

  // Test 6: List datasets
  const listDatasetsResponse = http.get(`${baseUrl}/api/v1/datasets`, { headers });
  check(listDatasetsResponse, {
    'list datasets status is 200': (r) => r.status === 200,
  });

  // Test 7: Get dataset details
  if (datasetId) {
    const datasetDetailsResponse = http.get(
      `${baseUrl}/api/v1/datasets/${datasetId}`,
      { headers }
    );
    
    check(datasetDetailsResponse, {
      'dataset details status is 200': (r) => r.status === 200,
    });
  }

  // Add some randomness to the sleep
  sleep(Math.random() * 3 + 1); // Sleep between 1-4 seconds
}

// Handle errors
export function handleSummary(data) {
  console.log('Load test completed');
  console.log('Total requests:', data.metrics.http_reqs.values.count);
  console.log('Average response time:', data.metrics.http_req_duration.values.avg);
  console.log('Error rate:', data.metrics.http_req_failed.values.rate);
  
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
} 