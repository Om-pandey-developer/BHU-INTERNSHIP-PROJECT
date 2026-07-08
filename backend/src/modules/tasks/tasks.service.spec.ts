import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleWorkspaceService } from '../google-workspace/google-workspace.service';
import { Role, ApplicationStatus } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: jest.Mocked<PrismaService>;
  let workspaceService: jest.Mocked<GoogleWorkspaceService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      application: {
        updateMany: jest.fn(),
      }
    };

    const mockWorkspace = {
      suspendAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GoogleWorkspaceService, useValue: mockWorkspace },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get(PrismaService);
    workspaceService = module.get(GoogleWorkspaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should revert role of expired HODs to APPLICANT', async () => {
    const expiredUsers = [
      { id: '1', role: Role.HOD, alternateEmail: 'hod@example.com' },
    ];
    (prismaService.user.findMany as jest.Mock).mockResolvedValueOnce(expiredUsers).mockResolvedValueOnce([]); // mock role expiry then retirement

    await service.handleRetirementAndTenureExpiry();

    expect(prismaService.user.findMany).toHaveBeenCalledTimes(2);
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { role: Role.APPLICANT, roleExpiryDate: null },
    });
  });

  it('should suspend account and archive applications for retired staff', async () => {
    const retiredStaff = [
      { id: '2', bhuEmail: 'staff@bhu.ac.in', alternateEmail: 'staff@gmail.com' },
    ];
    
    (prismaService.user.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // No expired roles
      .mockResolvedValueOnce(retiredStaff); // Retired staff

    (workspaceService.suspendAccount as jest.Mock).mockResolvedValueOnce(true);

    await service.handleRetirementAndTenureExpiry();

    expect(workspaceService.suspendAccount).toHaveBeenCalledWith('staff@bhu.ac.in');
    expect(prismaService.application.updateMany).toHaveBeenCalledWith({
      where: { applicantId: '2', status: ApplicationStatus.PROVISIONED },
      data: { status: ApplicationStatus.ARCHIVED }
    });
  });
});
