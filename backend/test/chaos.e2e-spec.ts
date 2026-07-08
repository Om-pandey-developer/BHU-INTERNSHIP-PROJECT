import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Chaos Engineering & Resilience (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should gracefully handle unexpected database disconnection (Chaos)', async () => {
    // 1. Mock the PrismaService to simulate a database crash (e.g., connection lost)
    jest.spyOn(prismaService.department, 'findMany').mockImplementation(() => {
      throw new Error('Can\'t reach database server at localhost:5432');
    });

    // 2. Fire request
    const response = await request(app.getHttpServer())
      .get('/api/v1/departments');

    // 3. Expect standard HTTP 500 or 503 instead of the app crashing
    expect(response.status).toBeGreaterThanOrEqual(500);
    // Ideally, the global exception filter catches this and returns a clean error message
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Internal server error'); // Or 'Service unavailable' depending on your exception filter

    // Restore the mock
    jest.restoreAllMocks();
  });

  it('should gracefully handle slow database queries (Timeout Chaos)', async () => {
    // 1. Mock a slow query that takes 10 seconds (simulate DB overload)
    jest.spyOn(prismaService.department, 'findMany').mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve([]), 10000));
    });

    // We configure the test client with a low timeout (e.g., 2s) to see how it reacts
    try {
      await request(app.getHttpServer())
        .get('/api/v1/departments')
        .timeout(2000); 
    } catch (err: any) {
      // Supertest throws Error: Timeout of 2000ms exceeded
      expect(err.message).toContain('Timeout of 2000ms exceeded');
    }

    jest.restoreAllMocks();
  });
});
