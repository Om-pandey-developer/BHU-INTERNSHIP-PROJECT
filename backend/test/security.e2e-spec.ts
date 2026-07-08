import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Security & RBAC (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  
  let applicantToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    // Generate valid JWTs for different roles
    applicantToken = jwtService.sign({
      sub: 'applicant-1',
      email: 'applicant@test.com',
      role: 'APPLICANT'
    }, { secret: process.env.JWT_SECRET || 'test-secret' });

    adminToken = jwtService.sign({
      sub: 'admin-1',
      email: 'admin@bhu.ac.in',
      role: 'CC_ADMIN'
    }, { secret: process.env.JWT_SECRET || 'test-secret' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('JWT Validation', () => {
    it('should reject request with no token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/applications/my');
      
      expect(response.status).toBe(401);
    });

    it('should reject request with malformed token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/applications/my')
        .set('Authorization', `Bearer fake-malformed-token`);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('APPLICANT should not access HOD routes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/applications/hod-queue')
        .set('Authorization', `Bearer ${applicantToken}`);
      
      expect(response.status).toBe(403);
    });

    it('APPLICANT should not access ADMIN routes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/applications/admin-queue')
        .set('Authorization', `Bearer ${applicantToken}`);
      
      expect(response.status).toBe(403);
    });

    it('ADMIN should be able to access ADMIN routes (mocking service failure is fine, 403 means RBAC failed)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/applications/admin-queue')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // If it's a 403, RBAC failed. If it's 200 or 500, RBAC passed.
      expect(response.status).not.toBe(403);
    });
  });
});
