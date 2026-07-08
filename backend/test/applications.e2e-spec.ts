import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/modules/mail/mail.service';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';

describe('ApplicationsController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let applicantToken: string;

  const mockPrismaService = {
    application: {
      create: jest.fn().mockResolvedValue({ id: 'app-1', trackingId: 'TRK-123', status: 'PENDING_HOD' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    department: {
      findUnique: jest.fn().mockResolvedValue({ id: 'dept-1', code: 'CS', name: 'Computer Science' }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'applicant-1',
        role: 'APPLICANT',
      }),
    },
    auditLog: {
      create: jest.fn(),
    }
  };

  const mockMailService = {
    sendNewApplicationNotificationToHod: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    // Generate a valid JWT for the applicant
    applicantToken = jwtService.sign({
      sub: 'applicant-1',
      email: 'applicant@test.com',
      role: 'APPLICANT'
    }, { secret: process.env.JWT_SECRET || 'test-secret' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/applications (POST) - submit application', async () => {
    const dummyFilePath = path.join(__dirname, 'fixtures', 'dummy.jpg');

    const applicantDetails = JSON.stringify({
      category: 'UNDER_GRADUATE_STUDENT',
      admissionYear: '2024'
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .field('departmentId', 'dept-1')
      .field('applicantDetails', applicantDetails)
      .attach('photo', dummyFilePath)
      .attach('signature', dummyFilePath);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('trackingId');
    expect(response.body.trackingId).toBe('TRK-123');
  });

  it('/api/v1/applications/my (GET) - get my applications', async () => {
    mockPrismaService.application.findMany.mockResolvedValueOnce([
      { id: 'app-1', trackingId: 'TRK-123' }
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/applications/my')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(1);
    expect(response.body[0].trackingId).toBe('TRK-123');
  });
});
