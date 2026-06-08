import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ApplicationStatus } from '@prisma/client';

/**
 * ApplicationsService handles the full lifecycle of email account applications:
 *
 * 1. Submission by applicants (with photo upload and JSONB details)
 * 2. HOD review queue (filtered by department)
 * 3. HOD approval/rejection with remarks
 * 4. CC Admin queue of approved applications
 * 5. Audit logging for every state transition
 */
@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a new email account application.
   * Called by authenticated APPLICANTs.
   */
  async create(
    applicantId: string,
    dto: CreateApplicationDto,
    photoPath: string,
    ipAddress: string,
  ) {
    // Parse and validate the details JSON
    let parsedDetails: Record<string, unknown>;
    try {
      parsedDetails = JSON.parse(dto.details);
    } catch {
      throw new BadRequestException('Invalid JSON in "details" field');
    }

    // Attach the category to the JSONB details
    parsedDetails.category = dto.category;

    const application = await this.prisma.application.create({
      data: {
        applicantId,
        departmentId: dto.departmentId,
        applicantDetails: parsedDetails as any,
        photoStoragePath: photoPath,
        status: ApplicationStatus.PENDING_HOD,
      },
      include: {
        department: true,
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: application.id,
        action: 'APPLICATION_SUBMITTED',
        performedBy: applicantId,
        ipAddress,
        payload: { status: ApplicationStatus.PENDING_HOD },
      },
    });

    this.logger.log(
      `Application ${application.trackingId} submitted by ${applicantId}`,
    );

    return {
      id: application.id,
      trackingId: application.trackingId,
      status: application.status,
      department: application.department?.name ?? 'Unknown',
    };
  }

  /**
   * Get applications for the applicant's own submissions.
   */
  async findByApplicant(applicantId: string) {
    return this.prisma.application.findMany({
      where: { applicantId },
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get applications pending HOD review for a specific department.
   * Used by HOD dashboards.
   */
  async findForHod(departmentId: string) {
    return this.prisma.application.findMany({
      where: {
        departmentId,
        status: ApplicationStatus.PENDING_HOD,
      },
      include: {
        applicant: {
          select: {
            id: true,
            alternateEmail: true,
            firstName: true,
            lastName: true,
          },
        },
        department: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * HOD approves or rejects an application.
   * Validates that the HOD belongs to the same department.
   */
  async updateHodStatus(
    applicationId: string,
    hodId: string,
    hodDepartmentId: string,
    dto: UpdateStatusDto,
    ipAddress: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.departmentId !== hodDepartmentId) {
      throw new ForbiddenException(
        'You can only review applications from your own department',
      );
    }

    if (application.status !== ApplicationStatus.PENDING_HOD) {
      throw new BadRequestException(
        `Application is in "${application.status}" state and cannot be reviewed`,
      );
    }

    // Require remarks for rejection
    if (
      dto.status === ApplicationStatus.REJECTED_HOD &&
      (!dto.remarks || dto.remarks.trim().length === 0)
    ) {
      throw new BadRequestException('Remarks are mandatory for rejection');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        hodId,
        hodRemarks: dto.remarks || null,
        hodApprovedAt:
          dto.status === ApplicationStatus.APPROVED_HOD ? new Date() : null,
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: applicationId,
        action: `STATUS_CHANGED_TO_${dto.status}`,
        performedBy: hodId,
        ipAddress,
        payload: {
          previousStatus: application.status,
          newStatus: dto.status,
          remarks: dto.remarks,
        },
      },
    });

    this.logger.log(
      `Application ${application.trackingId} ${dto.status} by HOD ${hodId}`,
    );

    return updated;
  }

  /**
   * Get applications approved by HOD, ready for CC Admin provisioning.
   */
  async findForCcAdmin() {
    return this.prisma.application.findMany({
      where: { status: ApplicationStatus.APPROVED_HOD },
      include: {
        applicant: {
          select: {
            id: true,
            alternateEmail: true,
            firstName: true,
            lastName: true,
          },
        },
        department: true,
        hod: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { hodApprovedAt: 'asc' },
    });
  }

  /**
   * Find a single application by ID with full details.
   */
  async findById(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        applicant: {
          select: {
            id: true,
            alternateEmail: true,
            firstName: true,
            lastName: true,
          },
        },
        department: true,
        hod: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }
}
