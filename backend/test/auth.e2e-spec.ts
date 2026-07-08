import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OtpService } from '../src/modules/auth/otp.service';
import * as argon2 from 'argon2';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  const mockUser = {
    id: 'test-user-id',
    alternateEmail: 'login@test.com',
    password: 'hashedpassword',
    role: 'APPLICANT',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.alternateEmail === 'login@test.com') {
            return Promise.resolve(mockUser);
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const mockOtpService = {
      generateAndSend: jest.fn().mockResolvedValue(undefined),
      verify: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PrismaService)
    .useValue(mockPrismaService)
    .overrideProvider(OtpService)
    .useValue(mockOtpService)
    .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    jest.spyOn(argon2, 'verify').mockImplementation((hash, plain) => {
      return Promise.resolve(plain === 'correctpassword');
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/auth/login (POST) - success', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'login@test.com',
        password: 'correctpassword',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('login@test.com');
  });

  it('/api/v1/auth/login (POST) - invalid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'login@test.com',
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
  });
});
