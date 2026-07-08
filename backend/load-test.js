import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '1m', target: 50 },  // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = 'http://localhost:3001/api/v1'; // Assuming backend runs on 3001

export default function () {
  // 1. Simulate fetching departments
  let deptRes = http.get(`${BASE_URL}/departments`);
  check(deptRes, {
    'GET /departments status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 2. Simulate Login (if needed for the user submitting form)
  const payload = JSON.stringify({
    email: 'test@bhu.ac.in', // Make sure this user exists in your DB or mock it
    password: 'password123',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  let loginRes = http.post(`${BASE_URL}/auth/login`, payload, params);
  
  // Note: For actual load testing of the POST /applications with files, 
  // you would use the FormData polyfill from jslib to attach dummy files.
  // We'll just test a basic GET request for the applicant queue in this load script.

  if (loginRes.status === 200 || loginRes.status === 201) {
    const token = loginRes.json('accessToken');
    
    let myAppsRes = http.get(`${BASE_URL}/applications/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    check(myAppsRes, {
      'GET /applications/my is 200': (r) => r.status === 200,
    });
  }

  sleep(Math.random() * 2);
}
