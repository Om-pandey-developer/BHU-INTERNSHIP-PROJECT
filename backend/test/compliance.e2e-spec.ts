import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Compliance & Data Privacy (e2e)', () => {
  let app: INestApplication;
  let loggerSpy: jest.SpyInstance;

  beforeAll(async () => {
    const mockPrismaService = {
      // Mock methods needed by AuthController or AppModule init
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Spy on the global Logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    loggerSpy.mockRestore();
    await app.close();
  });

  afterEach(() => {
    loggerSpy.mockClear();
  });

  it('should never log plain-text passwords or PII during authentication', async () => {
    const payload = {
      email: 'test@bhu.ac.in',
      password: 'SuperSecretPassword123!'
    };

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(payload);

    // Verify that the exact password string was NOT logged anywhere
    const allLogCalls = loggerSpy.mock.calls.flat().join(' ');
    
    expect(allLogCalls).not.toContain('SuperSecretPassword123!');
  });
});
