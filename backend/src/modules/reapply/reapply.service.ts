import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReapplyRequestDto } from './dto/create-reapply-request.dto';
import { ApplicationStatus, RequestStatus } from '@prisma/client';

const MAX_REAPPLY_REQUESTS = 5;

/**
 * ReapplyService handles the reapply request workflow:
 *
 * 1. Applicant submits a reapply request for a rejected application
 * 2. HOD reviews and approves/rejects the request
 * 3. On approval, the applicant can submit a new application
 *
 * Hard limit: 5 reapply requests per applicant lifetime.
 */
@Injectable()
export class ReapplyService {
  private readonly logger = new Logger(ReapplyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a reapply request for a rejected application.
   * Validates:
   * - Application exists and belongs to the applicant
   * - Application is in REJECTED_HOD status
   * - No pending reapply request for this application
   * - Total reapply requests < 5
   */
  async createRequest(applicantId: string, dto: CreateReapplyRequestDto) {
    // 1. Verify the application exists and belongs to this applicant
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
      include: { department: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.applicantId !== applicantId) {
      throw new ForbiddenException('You can only submit requests for your own applications');
    }

    // 2. Check that the application was rejected by HOD or DEAN
    if (
      application.status !== ApplicationStatus.REJECTED_HOD &&
      application.status !== ApplicationStatus.REJECTED_DEAN
    ) {
      throw new BadRequestException(
        'Reapply requests can only be submitted for rejected applications',
      );
    }

    // 3. Check lifetime limit
    const totalRequests = await this.prisma.reapplyRequest.count({
      where: { applicantId },
    });

    if (totalRequests >= MAX_REAPPLY_REQUESTS) {
      throw new BadRequestException(
        `Maximum reapply limit of ${MAX_REAPPLY_REQUESTS} reached. You cannot submit any more requests.`,
      );
    }

    // 4. Check no pending request for this application
    const existingPending = await this.prisma.reapplyRequest.findFirst({
      where: {
        applicationId: dto.applicationId,
        status: RequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'You already have a pending reapply request for this application',
      );
    }

    // 5. Create the request
    const request = await this.prisma.reapplyRequest.create({
      data: {
        applicationId: dto.applicationId,
        applicantId,
        reason: dto.reason,
        rollNumber: dto.rollNumber,
        studentName: dto.studentName,
        status: RequestStatus.PENDING,
      },
      include: {
        application: {
          select: { trackingId: true, department: { select: { name: true } } },
        },
      },
    });

    this.logger.log(
      `Reapply request ${request.id} submitted by ${applicantId} for application ${application.trackingId}`,
    );

    return request;
  }

  /**
   * Get all reapply requests for the logged-in applicant (to show status).
   */
  async findByApplicant(applicantId: string) {
    return this.prisma.reapplyRequest.findMany({
      where: { applicantId },
      include: {
        application: {
          select: {
            trackingId: true,
            status: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pending reapply requests for the HOD's department.
   */
  async findForHod(departmentId: string) {
    if (!departmentId) return [];

    return this.prisma.reapplyRequest.findMany({
      where: {
        status: RequestStatus.PENDING,
        application: {
          is: {
            departmentId,
            applicantDetails: {
              path: ['category'],
              not: 'UNDER_GRADUATE_STUDENT',
            },
          }
        },
      },
      include: {
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            alternateEmail: true,
          },
        },
        application: {
          select: {
            trackingId: true,
            status: true,
            hodRemarks: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get pending reapply requests for the Dean's departments.
   */
  async findForDean(deanId: string) {
    if (!deanId) return [];

    // Find all departments where this user is the Dean
    const departments = await this.prisma.department.findMany({
      where: { deanId },
      select: { id: true },
    });
    const deptIds = departments.map(d => d.id);

    return this.prisma.reapplyRequest.findMany({
      where: {
        status: RequestStatus.PENDING,
        application: {
          departmentId: { in: deptIds },
          applicantDetails: {
            path: ['category'],
            equals: 'UNDER_GRADUATE_STUDENT',
          },
        },
      },
      include: {
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            alternateEmail: true,
          },
        },
        application: {
          select: {
            trackingId: true,
            status: true,
            hodRemarks: true,
            deanRemarks: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * HOD approves a reapply request.
   * Validates department ownership.
   */
  async approveRequest(requestId: string, hodDepartmentId: string, hodRemarks?: string) {
    const request = await this.prisma.reapplyRequest.findUnique({
      where: { id: requestId },
      include: { application: true },
    });

    if (!request) {
      throw new NotFoundException('Reapply request not found');
    }

    if (request.application.departmentId !== hodDepartmentId) {
      throw new ForbiddenException('You can only review requests from your own department');
    }

    const details = request.application.applicantDetails as any;
    if (details?.category === 'UNDER_GRADUATE_STUDENT') {
      throw new ForbiddenException('HOD cannot review UG applications. These are handled by the Dean.');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const updated = await this.prisma.reapplyRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.APPROVED,
        hodRemarks: hodRemarks || 'Approved by HOD',
      },
    });

    this.logger.log(
      `Reapply request ${requestId} APPROVED for application ${request.application.trackingId}`,
    );

    return updated;
  }

  /**
   * HOD rejects a reapply request.
   * Validates department ownership.
   */
  async rejectRequest(requestId: string, hodDepartmentId: string, hodRemarks?: string) {
    const request = await this.prisma.reapplyRequest.findUnique({
      where: { id: requestId },
      include: { application: true },
    });

    if (!request) {
      throw new NotFoundException('Reapply request not found');
    }

    if (request.application.departmentId !== hodDepartmentId) {
      throw new ForbiddenException('You can only review requests from your own department');
    }

    const details = request.application.applicantDetails as any;
    if (details?.category === 'UNDER_GRADUATE_STUDENT') {
      throw new ForbiddenException('HOD cannot review UG applications. These are handled by the Dean.');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const updated = await this.prisma.reapplyRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
        hodRemarks: hodRemarks || 'Rejected by HOD',
      },
    });

    this.logger.log(
      `Reapply request ${requestId} REJECTED for application ${request.application.trackingId}`,
    );

    return updated;
  }

  /**
   * Dean approves a reapply request.
   * Validates department ownership.
   */
  async approveRequestDean(requestId: string, deanId: string, remarks?: string) {
    const request = await this.prisma.reapplyRequest.findUnique({
      where: { id: requestId },
      include: { application: { include: { department: true } } },
    });

    if (!request) {
      throw new NotFoundException('Reapply request not found');
    }

    if (request.application.department.deanId !== deanId) {
      throw new ForbiddenException('You can only review requests from departments you oversee');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const updated = await this.prisma.reapplyRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.APPROVED,
        deanRemarks: remarks || 'Approved by Dean',
      },
    });

    this.logger.log(
      `Reapply request ${requestId} APPROVED by Dean for application ${request.application.trackingId}`,
    );

    return updated;
  }

  /**
   * Dean rejects a reapply request.
   * Validates department ownership.
   */
  async rejectRequestDean(requestId: string, deanId: string, remarks?: string) {
    const request = await this.prisma.reapplyRequest.findUnique({
      where: { id: requestId },
      include: { application: { include: { department: true } } },
    });

    if (!request) {
      throw new NotFoundException('Reapply request not found');
    }

    if (request.application.department.deanId !== deanId) {
      throw new ForbiddenException('You can only review requests from departments you oversee');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const updated = await this.prisma.reapplyRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
        deanRemarks: remarks || 'Rejected by Dean',
      },
    });

    this.logger.log(
      `Reapply request ${requestId} REJECTED by Dean for application ${request.application.trackingId}`,
    );

    return updated;
  }
}
