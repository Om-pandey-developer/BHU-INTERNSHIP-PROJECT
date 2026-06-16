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
   * Get applications reviewed by HOD (approved or rejected) for a specific department.
   * Used by HOD Reviewed dashboard.
   */
  async findReviewedForHod(departmentId: string) {
    return this.prisma.application.findMany({
      where: {
        departmentId,
        status: {
          in: [ApplicationStatus.APPROVED_HOD, ApplicationStatus.REJECTED_HOD],
        },
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
      orderBy: { updatedAt: 'desc' },
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

  // ═══════════════════════════════════════════════════════
  // CC Admin — User Lifecycle Management
  // ═══════════════════════════════════════════════════════

  /**
   * Get all PROVISIONED (Flag 1 / Active) applications for CC Admin.
   */
  async findActiveUsers() {
    return this.prisma.application.findMany({
      where: { status: ApplicationStatus.PROVISIONED },
      include: {
        applicant: {
          select: {
            id: true,
            alternateEmail: true,
            bhuEmail: true,
            firstName: true,
            lastName: true,
          },
        },
        department: true,
        hod: { select: { firstName: true, lastName: true } },
      },
      orderBy: { provisionedAt: 'desc' },
    });
  }

  /**
   * Get all SUSPENDED applications for CC Admin.
   */
  async findSuspendedUsers() {
    return this.prisma.application.findMany({
      where: { status: ApplicationStatus.SUSPENDED },
      include: {
        applicant: {
          select: {
            id: true,
            alternateEmail: true,
            bhuEmail: true,
            firstName: true,
            lastName: true,
          },
        },
        department: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get all ARCHIVED applications for CC Admin.
   */
  async findArchivedUsers() {
    return this.prisma.application.findMany({
      where: { status: ApplicationStatus.ARCHIVED },
      include: {
        applicant: {
          select: {
            id: true,
            alternateEmail: true,
            bhuEmail: true,
            firstName: true,
            lastName: true,
          },
        },
        department: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Suspend a provisioned account (temporarily block access).
   */
  async suspendApplication(applicationId: string, adminId: string, remarks: string, ipAddress: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== ApplicationStatus.PROVISIONED) {
      throw new BadRequestException(`Only PROVISIONED accounts can be suspended. Current: ${app.status}`);
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.SUSPENDED,
        ccAdminRemarks: remarks || 'Account suspended by CC Admin',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: applicationId,
        action: 'ACCOUNT_SUSPENDED',
        performedBy: adminId,
        ipAddress,
        payload: { previousStatus: app.status, remarks },
      },
    });

    this.logger.log(`Application ${app.trackingId} SUSPENDED by admin ${adminId}`);
    return updated;
  }

  /**
   * Archive a suspended or provisioned account (for retired/left users — data retained).
   */
  async archiveApplication(applicationId: string, adminId: string, remarks: string, ipAddress: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== ApplicationStatus.SUSPENDED && app.status !== ApplicationStatus.PROVISIONED) {
      throw new BadRequestException(`Only PROVISIONED or SUSPENDED accounts can be archived. Current: ${app.status}`);
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.ARCHIVED,
        ccAdminRemarks: remarks || 'Account archived by CC Admin',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: applicationId,
        action: 'ACCOUNT_ARCHIVED',
        performedBy: adminId,
        ipAddress,
        payload: { previousStatus: app.status, remarks },
      },
    });

    this.logger.log(`Application ${app.trackingId} ARCHIVED by admin ${adminId}`);
    return updated;
  }

  /**
   * Reactivate a suspended account back to PROVISIONED.
   */
  async reactivateApplication(applicationId: string, adminId: string, remarks: string, ipAddress: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== ApplicationStatus.SUSPENDED) {
      throw new BadRequestException(`Only SUSPENDED accounts can be reactivated. Current: ${app.status}`);
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.PROVISIONED,
        ccAdminRemarks: remarks || 'Account reactivated by CC Admin',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: applicationId,
        action: 'ACCOUNT_REACTIVATED',
        performedBy: adminId,
        ipAddress,
        payload: { previousStatus: app.status, remarks },
      },
    });

    this.logger.log(`Application ${app.trackingId} REACTIVATED by admin ${adminId}`);
    return updated;
  }

  /**
   * Bulk suspend multiple applications.
   */
  async bulkSuspend(applicationIds: string[], adminId: string, remarks: string, ipAddress: string) {
    const results = [];
    for (const id of applicationIds) {
      try {
        const result = await this.suspendApplication(id, adminId, remarks, ipAddress);
        results.push({ id, success: true, trackingId: result.trackingId });
      } catch (error) {
        results.push({ id, success: false, error: (error as Error).message });
      }
    }
    return results;
  }

  /**
   * Bulk archive multiple applications.
   */
  async bulkArchive(applicationIds: string[], adminId: string, remarks: string, ipAddress: string) {
    const results = [];
    for (const id of applicationIds) {
      try {
        const result = await this.archiveApplication(id, adminId, remarks, ipAddress);
        results.push({ id, success: true, trackingId: result.trackingId });
      } catch (error) {
        results.push({ id, success: false, error: (error as Error).message });
      }
    }
    return results;
  }

  /**
   * Secure password reset — generates new temp password.
   * Only CC_ADMIN can call this.
   */
  async resetPassword(applicationId: string, adminId: string, ipAddress: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== ApplicationStatus.PROVISIONED) {
      throw new BadRequestException('Can only reset password for active (PROVISIONED) accounts.');
    }

    const crypto = await import('crypto');
    const newTempPassword = crypto.randomBytes(12).toString('base64url').slice(0, 16);

    // In real system, this would call Google Admin API to reset the password.
    // For mock mode, we just log it.
    this.logger.log(`[PASSWORD_RESET] BHU Email: ${app.applicant.bhuEmail} | New Password: ${newTempPassword}`);

    await this.prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: app.applicantId,
        action: 'PASSWORD_RESET',
        performedBy: adminId,
        ipAddress,
        payload: { bhuEmail: app.applicant.bhuEmail, applicationId },
      },
    });

    // TODO: Send email via Nodemailer with new password to alternate email
    return {
      message: 'Password reset successfully. New credentials will be sent to alternate email.',
      alternateEmail: app.applicant.alternateEmail,
      bhuEmail: app.applicant.bhuEmail,
      tempPassword: newTempPassword, // Only returned in mock mode
    };
  }

  /**
   * Secure email domain lookup — lets user find their @bhu.ac.in email.
   * Requires alternate email + name verification for security.
   */
  async lookupBhuEmail(alternateEmail: string, firstName: string, lastName: string) {
    const user = await this.prisma.user.findUnique({
      where: { alternateEmail },
      select: {
        bhuEmail: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('No account found with this alternate email.');
    }

    // Name verification for security
    if (
      user.firstName.toLowerCase() !== firstName.toLowerCase() ||
      user.lastName.toLowerCase() !== lastName.toLowerCase()
    ) {
      throw new BadRequestException('Name verification failed. Please provide the correct name.');
    }

    if (!user.bhuEmail) {
      throw new NotFoundException('No BHU email has been provisioned yet for this account.');
    }

    return { bhuEmail: user.bhuEmail };
  }

  /**
   * Get storage quota statistics for the admin dashboard chart.
   */
  async getQuotaStats() {
    const provisioned = await this.prisma.application.findMany({
      where: {
        status: { in: [ApplicationStatus.PROVISIONED, ApplicationStatus.SUSPENDED] },
      },
      select: {
        quotaAssignedGB: true,
        applicantDetails: true,
      },
    });

    let totalQuotaGB = 0;
    const categoryBreakdown: Record<string, { count: number; totalGB: number }> = {};

    for (const app of provisioned) {
      const quota = app.quotaAssignedGB || 0;
      totalQuotaGB += quota;
      const details = app.applicantDetails as Record<string, unknown>;
      const category = (details?.category as string) || 'UNKNOWN';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { count: 0, totalGB: 0 };
      }
      categoryBreakdown[category].count += 1;
      categoryBreakdown[category].totalGB += quota;
    }

    return {
      totalAccounts: provisioned.length,
      totalQuotaGB,
      categoryBreakdown,
    };
  }

  /**
   * Get audit logs for admin viewer (paginated).
   */
  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
