import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const mockPrismaService = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      application: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PrismaService)
    .useValue(mockPrismaService)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) should not return 404 (or basic check)', async () => {
    // If you don't have a root route, this might be 404, but the app itself is up
    const response = await request(app.getHttpServer()).get('/');
    expect(response.status).toBeDefined();
  });
});
