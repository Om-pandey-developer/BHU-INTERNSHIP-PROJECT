import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';

const { like } = MatchersV3;

const provider = new PactV3({
  consumer: 'BHU-Frontend',
  provider: 'BHU-Backend',
  dir: path.resolve(process.cwd(), 'tests/pacts'),
});

describe('GET /api/v1/auth/me', () => {
  it('returns an HTTP 200 and the user profile', () => {
    // 1. Arrange: Setup our expected interactions
    provider
      .given('User is logged in')
      .uponReceiving('a request for user profile')
      .withRequest({
        method: 'GET',
        path: '/api/v1/auth/me',
        headers: {
            'Authorization': like('Bearer valid-jwt-token')
        }
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          success: true,
          data: {
            id: like('user-uuid'),
            firstName: like('John'),
            lastName: like('Doe'),
            email: like('john.doe@example.com'),
            role: like('APPLICANT'),
          },
        },
      });

    // 2. Act & Assert: Execute the test and verify the contract
    return provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/v1/auth/me`, {
          headers: { 'Authorization': 'Bearer valid-jwt-token' }
      });
      expect(response.status).toEqual(200);
      expect(response.data.success).toEqual(true);
      expect(response.data.data.role).toEqual('APPLICANT');
    });
  });
});
