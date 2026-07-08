import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { MailService } from '../mail/mail.service';
import { NotFoundException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let prismaService: any;
  let pdfService: any;
  let mailService: any;

  beforeEach(async () => {
    // Mock implementations
    prismaService = {
      application: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      }
    };

    pdfService = {
      generateApprovedPdf: jest.fn(),
    };

    mailService = {
      sendEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: PdfService, useValue: pdfService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return an application if found', async () => {
      const mockApp = { id: 'app-1', trackingId: 'TRK123' };
      prismaService.application.findUnique.mockResolvedValue(mockApp);

      const result = await service.findById('app-1');
      expect(result).toEqual(mockApp);
      expect(prismaService.application.findUnique).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        include: {
          applicant: {
            select: { id: true, alternateEmail: true, firstName: true, lastName: true },
          },
          department: true,
          hod: {
            select: { firstName: true, lastName: true },
          },
          dean: {
            select: { firstName: true, lastName: true },
          },
        },
      });
    });

    it('should throw NotFoundException if application not found', async () => {
      prismaService.application.findUnique.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  // Example of testing business logic
  describe('findByApplicant', () => {
    it('should return a list of applications for a user', async () => {
      const mockApps = [{ id: 'app-1', applicantId: 'user-1' }];
      prismaService.application.findMany.mockResolvedValue(mockApps);

      const result = await service.findByApplicant('user-1');
      expect(result).toEqual(mockApps);
      expect(prismaService.application.findMany).toHaveBeenCalledWith({
        where: { applicantId: 'user-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
