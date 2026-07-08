import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users over 30 seconds
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

// Assuming host.docker.internal resolves to the local backend port 3001
const BASE_URL = 'http://host.docker.internal:3001/api/v1';

export default function () {
  // We can hit a public endpoint or health check for basic load testing.
  // For a more advanced test, we would hit /auth/login with a static payload.
  
  // Assuming a health-check or root endpoint exists, otherwise we hit a non-mutating endpoint
  const res = http.get(`${BASE_URL}/departments`);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  // Wait 1 second between requests per virtual user
  sleep(1);
}
