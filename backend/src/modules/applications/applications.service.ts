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
import { MailService } from '../mail/mail.service';
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
    private readonly mailService: MailService,
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
    // ── Duplicate Application Prevention ──
    const existingApps = await this.prisma.application.findMany({
      where: { applicantId },
      orderBy: { createdAt: 'desc' },
    });

    // Rule 1: Block if any application is in an active/pending/provisioned state
    const activeStatuses: ApplicationStatus[] = [
      ApplicationStatus.PENDING_HOD,
      ApplicationStatus.APPROVED_HOD,
      ApplicationStatus.PENDING_CC,
      ApplicationStatus.PROVISIONED,
    ];
    const hasActiveApp = existingApps.some((a) => activeStatuses.includes(a.status));
    if (hasActiveApp) {
      throw new BadRequestException(
        'You already have an active or provisioned application. Duplicate submissions are not allowed.',
      );
    }

    // Rule 3: Hard limit — if 5 or more rejected applications, block completely
    const rejectedCount = existingApps.filter(
      (a) => a.status === ApplicationStatus.REJECTED_HOD,
    ).length;
    if (rejectedCount >= 5) {
      throw new BadRequestException(
        'Maximum re-apply limit of 5 reached. You cannot submit any more applications.',
      );
    }

    // Rule 2: If last application was rejected, require an approved ReapplyRequest
    const latestApp = existingApps[0]; // sorted desc
    if (latestApp && latestApp.status === ApplicationStatus.REJECTED_HOD) {
      const approvedRequest = await this.prisma.reapplyRequest.findFirst({
        where: {
          applicationId: latestApp.id,
          applicantId,
          status: 'APPROVED',
        },
      });
      if (!approvedRequest) {
        throw new BadRequestException(
          'Your last application was rejected. Please submit a Reapply Request to your HOD and get approval before submitting a new application.',
        );
      }
    }

    // Parse and validate the details JSON
    let parsedDetails: Record<string, unknown>;
    try {
      parsedDetails = JSON.parse(dto.details);
    } catch {
      throw new BadRequestException('Invalid JSON in "details" field');
    }


    // Attach the category to the JSONB details
    parsedDetails.category = dto.category;

    // Determine initial status based on category:
    // UG students go to Dean for approval, all others go to HOD
    const initialStatus = dto.category === 'UNDER_GRADUATE_STUDENT'
      ? ApplicationStatus.PENDING_DEAN
      : ApplicationStatus.PENDING_HOD;

    const application = await this.prisma.application.create({
      data: {
        applicantId,
        departmentId: dto.departmentId,
        applicantDetails: parsedDetails as Prisma.InputJsonValue,
        photoStoragePath: photoPath,
        signatureStoragePath: signaturePath,
        status: initialStatus,
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
        payload: { status: initialStatus },
      },
    });

    this.logger.log(
      `Application ${application.trackingId} submitted by ${applicantId} → ${initialStatus}`,
    );

    // ── Send email notification to HOD/Dean (non-blocking) ──
    this.notifyHodOfNewApplication(application.departmentId, applicantId, application.trackingId, application.department?.name || 'Unknown')
      .catch(err => this.logger.error('HOD/Dean notification failed', err));

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
        applicantDetails: {
          path: ['category'],
          not: 'UNDER_GRADUATE_STUDENT',
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
      orderBy: { createdAt: 'desc' },
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
        applicantDetails: {
          path: ['category'],
          not: 'UNDER_GRADUATE_STUDENT',
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
   * Get applications provisioned for a specific department.
   * Used by HOD Provisioned dashboard tab.
   */
  async findProvisionedForHod(departmentId: string) {
    return this.prisma.application.findMany({
      where: {
        departmentId,
        status: ApplicationStatus.PROVISIONED,
        applicantDetails: {
          path: ['category'],
          not: 'UNDER_GRADUATE_STUDENT',
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
  // ═══════════════════════════════════════════════════════
  // Dean — UG Student Application Review (mirrors HOD)
  // ═══════════════════════════════════════════════════════

  /**
   * Get applications pending Dean review for departments the Dean oversees.
   */
  async findForDean(deanId: string) {
    // Find all departments where this user is the Dean
    const departments = await this.prisma.department.findMany({
      where: { deanId },
      select: { id: true },
    });
    const deptIds = departments.map(d => d.id);

    return this.prisma.application.findMany({
      where: {
        departmentId: { in: deptIds },
        status: ApplicationStatus.PENDING_DEAN,
        applicantDetails: {
          path: ['category'],
          equals: 'UNDER_GRADUATE_STUDENT',
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get applications reviewed by Dean (approved or rejected).
   */
  async findReviewedForDean(deanId: string) {
    const departments = await this.prisma.department.findMany({
      where: { deanId },
      select: { id: true },
    });
    const deptIds = departments.map(d => d.id);

    return this.prisma.application.findMany({
      where: {
        departmentId: { in: deptIds },
        status: {
          in: [ApplicationStatus.APPROVED_DEAN, ApplicationStatus.REJECTED_DEAN],
        },
        applicantDetails: {
          path: ['category'],
          equals: 'UNDER_GRADUATE_STUDENT',
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
   * Get provisioned applications for departments the Dean oversees.
   */
  async findProvisionedForDean(deanId: string) {
    const departments = await this.prisma.department.findMany({
      where: { deanId },
      select: { id: true },
    });
    const deptIds = departments.map(d => d.id);

    return this.prisma.application.findMany({
      where: {
        departmentId: { in: deptIds },
        status: ApplicationStatus.PROVISIONED,
        applicantDetails: {
          path: ['category'],
          equals: 'UNDER_GRADUATE_STUDENT',
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
   * Dean approves or rejects a UG student application.
   * Mirrors HOD workflow — requires uploaded signature for approval.
   */
  async updateDeanStatus(
    applicationId: string,
    deanId: string,
    dto: UpdateStatusDto,
    ipAddress: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify this Dean has authority over the application's department
    const dept = await this.prisma.department.findUnique({
      where: { id: application.departmentId },
    });
    if (!dept || dept.deanId !== deanId) {
      throw new ForbiddenException(
        'You can only review applications from departments you oversee',
      );
    }

    if (application.status !== ApplicationStatus.PENDING_DEAN) {
      throw new BadRequestException(
        `Application is in "${application.status}" state and cannot be reviewed by Dean`,
      );
    }

    // Map the dto status to Dean-specific statuses
    const newStatus = dto.status === ApplicationStatus.APPROVED_HOD
      ? ApplicationStatus.APPROVED_DEAN
      : dto.status === ApplicationStatus.REJECTED_HOD
        ? ApplicationStatus.REJECTED_DEAN
        : dto.status;

    // Require remarks for rejection
    if (
      newStatus === ApplicationStatus.REJECTED_DEAN &&
      (!dto.remarks || dto.remarks.trim().length === 0)
    ) {
      throw new BadRequestException('Remarks are mandatory for rejection');
    }

    // ── If approving, verify Dean has uploaded a signature ──
    let digitalSignatureHash: string | null = null;
    let approvedPdfPath: string | null = null;
    const approvalTimestamp = new Date();

    if (newStatus === ApplicationStatus.APPROVED_DEAN) {
      const dean = (await this.prisma.user.findUnique({
        where: { id: deanId },
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

      if (!dean?.signatureStoragePath) {
        throw new BadRequestException(
          'Please upload your signature in Settings before approving applications.',
        );
      }

      // Generate SHA-256 cryptographic hash
      const hashInput = `${applicationId}|${deanId}|${application.applicantId}|${approvalTimestamp.toISOString()}`;
      digitalSignatureHash = createHash('sha256').update(hashInput).digest('hex');

      // Generate the approved PDF with both signatures and hologram
      const deanName = `${dean.firstName} ${dean.lastName}`.trim();
      try {
        approvedPdfPath = await this.pdfService.generateApprovedPdf(
          applicationId,
          dean.signatureStoragePath,
          deanName,
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
        status: newStatus,
        deanId: deanId,
        deanRemarks: dto.remarks || null,
        deanApprovedAt:
          newStatus === ApplicationStatus.APPROVED_DEAN ? approvalTimestamp : null,
        digitalSignatureHash,
        approvedPdfPath,
      } as unknown as Prisma.ApplicationUpdateInput,
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: applicationId,
        action: `STATUS_CHANGED_TO_${newStatus}`,
        performedBy: deanId,
        ipAddress,
        payload: {
          previousStatus: application.status,
          newStatus,
          remarks: dto.remarks,
          digitalSignatureHash,
        },
      },
    });

    this.logger.log(
      `Application ${application.trackingId} ${newStatus} by Dean ${deanId}`,
    );

    // ── Send email notification to applicant (non-blocking) ──
    this.notifyApplicantOfStatusChange(application.applicantId, application.trackingId, newStatus, dto.remarks)
      .catch(err => this.logger.error('Applicant notification failed', err));

    return updated;
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

    // ── Send email notification to applicant (non-blocking) ──
    this.notifyApplicantOfStatusChange(application.applicantId, application.trackingId, dto.status, dto.remarks)
      .catch(err => this.logger.error('Applicant notification failed', err));

    return updated;
  }

  /**
   * Get applications approved by HOD or Dean, ready for CC Admin provisioning.
   */
  async findForCcAdmin() {
    return this.prisma.application.findMany({
      where: {
        status: {
          in: [ApplicationStatus.APPROVED_HOD, ApplicationStatus.APPROVED_DEAN],
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
        hod: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        dean: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  /**
   * Check if a Dean has access to a specific department.
   */
  async checkDeanAccess(deanId: string, departmentId: string): Promise<boolean> {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { deanId: true },
    });
    return dept?.deanId === deanId;
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
        dean: {
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
  // CC Admin — Queue Actions
  // ═══════════════════════════════════════════════════════

  /**
   * CC Admin rejects an application before provisioning.
   */
  async rejectByCcAdmin(applicationId: string, adminId: string, remarks: string, ipAddress: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (
      application.status !== ApplicationStatus.APPROVED_HOD &&
      application.status !== ApplicationStatus.APPROVED_DEAN
    ) {
      throw new BadRequestException('Application must be approved by HOD/Dean before CC Admin can reject it.');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.REJECTED_CC,
        ccAdminRemarks: remarks,
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: applicationId,
        action: 'STATUS_CHANGED_TO_REJECTED_CC',
        performedBy: adminId,
        ipAddress,
        payload: {
          previousStatus: application.status,
          newStatus: ApplicationStatus.REJECTED_CC,
          remarks,
        },
      },
    });

    this.logger.log(`Application ${application.trackingId} rejected by CC Admin ${adminId}`);

    // Notify applicant
    this.notifyApplicantOfStatusChange(application.applicantId, application.trackingId, ApplicationStatus.REJECTED_CC, remarks)
      .catch(err => this.logger.error('Applicant notification failed', err));

    return updated;
  }

  /**
   * CC Admin edits application details.
   */
  async editByCcAdmin(applicationId: string, adminId: string, applicantDetails: any, ipAddress: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        applicantDetails,
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: applicationId,
        action: 'DETAILS_UPDATED_BY_CC_ADMIN',
        performedBy: adminId,
        ipAddress,
        payload: {
          previousDetails: application.applicantDetails,
          newDetails: applicantDetails,
        },
      },
    });

    this.logger.log(`Application ${application.trackingId} details updated by CC Admin ${adminId}`);

    return updated;
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

    // Send email via Nodemailer with new password to alternate email
    try {
      await this.mailService.sendProvisioningNotification(
        app.applicant.alternateEmail,
        `${app.applicant.firstName} ${app.applicant.lastName}`,
        app.applicant.bhuEmail!,
        newTempPassword,
        app.trackingId
      );
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${app.applicant.alternateEmail}`, error);
    }

    return {
      message: 'Password reset successfully. New credentials have been sent to alternate email.',
      alternateEmail: app.applicant.alternateEmail,
      bhuEmail: app.applicant.bhuEmail,
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
    const [rawLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    const performerIds = [...new Set(rawLogs.map(l => l.performedBy))];
    const performers = await this.prisma.user.findMany({
      where: { id: { in: performerIds } },
      include: { department: true }
    });
    const performerMap = new Map(performers.map(p => [p.id, p]));

    const appIds = [...new Set(rawLogs.filter(l => l.entityType === 'APPLICATION').map(l => l.entityId))];
    const apps = await this.prisma.application.findMany({
      where: { id: { in: appIds } },
      select: { id: true, trackingId: true }
    });
    const appMap = new Map(apps.map(a => [a.id, a.trackingId]));

    const logs = rawLogs.map(log => {
      const performer = performerMap.get(log.performedBy);
      return {
        ...log,
        performerName: performer ? `${performer.firstName} ${performer.lastName}` : 'System / Unknown',
        performerDepartment: performer?.department?.name || 'N/A',
        entityTrackingId: log.entityType === 'APPLICATION' ? (appMap.get(log.entityId) || log.entityId) : log.entityId,
      };
    });

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit history for a specific application (timeline view).
   */
  async getApplicationHistory(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, trackingId: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const logs = await this.prisma.auditLog.findMany({
      where: { entityId: applicationId },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich logs with user names
    const userIds = [...new Set(logs.map(l => l.performedBy))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      applicationId,
      trackingId: application.trackingId,
      timeline: logs.map(log => {
        const user = userMap.get(log.performedBy);
        return {
          id: log.id,
          action: log.action,
          performedBy: user
            ? `${user.firstName} ${user.lastName}`
            : log.performedBy,
          performedByRole: user?.role || 'UNKNOWN',
          timestamp: log.createdAt,
          payload: log.payload,
          ipAddress: log.ipAddress,
        };
      }),
    };
  }

  // ═══════════════════════════════════════════════════════
  // Private helpers for email notifications
  // ═══════════════════════════════════════════════════════

  /**
   * Notify the HOD of the applicant's department about a new submission.
   */
  private async notifyHodOfNewApplication(
    departmentId: string,
    applicantId: string,
    trackingId: string,
    departmentName: string,
  ): Promise<void> {
    // Find the HOD for this department
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { hodId: true },
    });

    if (!department?.hodId) {
      this.logger.warn(`No HOD assigned for department ${departmentId} — skipping notification`);
      return;
    }

    const [hod, applicant] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: department.hodId },
        select: { alternateEmail: true },
      }),
      this.prisma.user.findUnique({
        where: { id: applicantId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    if (!hod?.alternateEmail || !applicant) return;

    const applicantName = `${applicant.firstName} ${applicant.lastName}`;
    await this.mailService.sendNewApplicationNotificationToHod(
      hod.alternateEmail,
      applicantName,
      trackingId,
      departmentName,
    );
  }

  /**
   * Notify the applicant about their application status change.
   */
  private async notifyApplicantOfStatusChange(
    applicantId: string,
    trackingId: string,
    status: string,
    remarks?: string,
  ): Promise<void> {
    const applicant = await this.prisma.user.findUnique({
      where: { id: applicantId },
      select: { alternateEmail: true, firstName: true, lastName: true },
    });

    if (!applicant?.alternateEmail) return;

    const applicantName = `${applicant.firstName} ${applicant.lastName}`;
    await this.mailService.sendApplicationStatusNotification(
      applicant.alternateEmail,
      applicantName,
      trackingId,
      status,
      remarks,
    );
  }
}
