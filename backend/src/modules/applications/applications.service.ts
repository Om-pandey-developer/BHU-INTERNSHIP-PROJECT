import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ApplicationStatus, Prisma } from '@prisma/client';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  /**
   * Submit a new email account application.
   * Called by authenticated APPLICANTs.
   */
  async create(
    applicantId: string,
    dto: CreateApplicationDto,
    photoPath: string,
    signaturePath: string,
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
        applicantDetails: parsedDetails as Prisma.InputJsonValue,
        photoStoragePath: photoPath,
        signatureStoragePath: signaturePath,
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
      include: { 
        department: true,
        applicant: {
          select: {
            id: true,
            alternateEmail: true,
            firstName: true,
            lastName: true,
          },
        },
      },
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

    // ── If approving, verify HOD has uploaded a signature ──
    let digitalSignatureHash: string | null = null;
    let approvedPdfPath: string | null = null;
    const approvalTimestamp = new Date();

    if (dto.status === ApplicationStatus.APPROVED_HOD) {
      const hod = (await this.prisma.user.findUnique({
        where: { id: hodId },
        select: {
          signatureStoragePath: true,
          firstName: true,
          lastName: true,
        } as unknown as Prisma.UserSelect,
      })) as unknown as {
        signatureStoragePath: string | null;
        firstName: string;
        lastName: string;
      } | null;

      if (!hod?.signatureStoragePath) {
        throw new BadRequestException(
          'Please upload your signature in Settings before approving applications.',
        );
      }

      // Generate SHA-256 cryptographic hash
      const hashInput = `${applicationId}|${hodId}|${application.applicantId}|${approvalTimestamp.toISOString()}`;
      digitalSignatureHash = createHash('sha256').update(hashInput).digest('hex');

      // Generate the approved PDF with both signatures and hologram
      const hodName = `${hod.firstName} ${hod.lastName}`.trim();
      try {
        approvedPdfPath = await this.pdfService.generateApprovedPdf(
          applicationId,
          hod.signatureStoragePath,
          hodName,
          digitalSignatureHash,
          approvalTimestamp,
        );
      } catch (err) {
        this.logger.error(`PDF generation failed for ${applicationId}`, err);
        throw new BadRequestException(
          'Approval succeeded but PDF generation failed. Please try again.',
        );
      }
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        hodId,
        hodRemarks: dto.remarks || null,
        hodApprovedAt:
          dto.status === ApplicationStatus.APPROVED_HOD ? approvalTimestamp : null,
        digitalSignatureHash,
        approvedPdfPath,
      } as unknown as Prisma.ApplicationUpdateInput,
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
          digitalSignatureHash,
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
