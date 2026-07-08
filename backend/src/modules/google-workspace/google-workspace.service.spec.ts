import { Test, TestingModule } from '@nestjs/testing';
import { GoogleWorkspaceService } from './google-workspace.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ApplicationStatus } from '@prisma/client';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ApplicantCategory } from '../applications/dto/create-application.dto';

describe('GoogleWorkspaceService', () => {
  let service: GoogleWorkspaceService;
  let prismaService: jest.Mocked<PrismaService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const mockPrisma = {
      application: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      user: {
        update: jest.fn(),
      }
    };

    const mockMail = {
      sendProvisioningNotification: jest.fn(),
    };

    // Override MOCK_GOOGLE_WORKSPACE for test predictability
    process.env.MOCK_GOOGLE_WORKSPACE = 'true';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleWorkspaceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<GoogleWorkspaceService>(GoogleWorkspaceService);
    prismaService = module.get(PrismaService);
    mailService = module.get(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('provision', () => {
    it('should throw BadRequestException if application not found', async () => {
      (prismaService.application.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.provision('invalid-id', 'admin', '127.0.0.1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if status is not APPROVED_HOD or APPROVED_DEAN', async () => {
      (prismaService.application.findUnique as jest.Mock).mockResolvedValue({ status: ApplicationStatus.PENDING_HOD });
      await expect(service.provision('valid-id', 'admin', '127.0.0.1')).rejects.toThrow(BadRequestException);
    });

    it('should successfully provision an account in mock mode for UG student', async () => {
      const mockApplication = {
        id: 'app-1',
        status: ApplicationStatus.APPROVED_HOD,
        trackingId: 'TRACK-1',
        applicantDetails: {
          category: ApplicantCategory.UNDER_GRADUATE_STUDENT,
          admissionYear: '2024'
        },
        applicant: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          alternateEmail: 'john@gmail.com'
        },
        department: {
          code: 'CS'
        },
        applicantId: 'user-1'
      };

      (prismaService.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);
      (prismaService.application.update as jest.Mock).mockResolvedValue({ provisionedAt: new Date() });

      const result = await service.provision('app-1', 'admin-id', '127.0.0.1');

      expect(result.message).toContain('Account provisioned in MOCK mode');
      expect(result.bhuEmail).toBe('john.cs.2024@bhu.ac.in');
      expect(result.quotaAssignedGB).toBe(5);
      
      expect(prismaService.application.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: expect.objectContaining({ status: ApplicationStatus.PROVISIONED })
      });
      
      expect(mailService.sendProvisioningNotification).toHaveBeenCalled();
    });

    it('should successfully provision an account in mock mode for Teaching Staff', async () => {
      const mockApplication = {
        id: 'app-2',
        status: ApplicationStatus.APPROVED_DEAN,
        trackingId: 'TRACK-2',
        applicantDetails: {
          category: ApplicantCategory.TEACHING_STAFF,
          dateOfJoining: '2015-06-01'
        },
        applicant: {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          alternateEmail: 'jane@gmail.com'
        },
        department: {
          code: 'PHYS'
        },
        applicantId: 'user-2'
      };

      (prismaService.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);
      (prismaService.application.update as jest.Mock).mockResolvedValue({ provisionedAt: new Date() });

      const result = await service.provision('app-2', 'admin-id', '127.0.0.1');

      expect(result.bhuEmail).toBe('jane.phys.2015@bhu.ac.in');
      expect(result.quotaAssignedGB).toBe(20);
    });
  });

  describe('provisionDesignationEmail', () => {
    it('should return mock provision details', async () => {
      const result = await service.provisionDesignationEmail('hod.cs@bhu.ac.in', 25);
      expect(result.bhuEmail).toBe('hod.cs@bhu.ac.in');
      expect(result.quotaGB).toBe(25);
      expect(result.tempPassword).toBeDefined();
    });
  });

  describe('suspendAccount', () => {
    it('should suspend account', async () => {
      const result = await service.suspendAccount('old.user@bhu.ac.in');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Suspended old.user@bhu.ac.in');
    });
  });
});
