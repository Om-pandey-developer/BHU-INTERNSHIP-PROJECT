import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';
import { ApplicantCategory } from '../applications/dto/create-application.dto';
import * as crypto from 'crypto';

/**
 * GoogleWorkspaceService handles the automated provisioning of
 * BHU email accounts via the Google Admin Directory API.
 *
 * When MOCK_GOOGLE_WORKSPACE=true (default for local dev),
 * it simulates provisioning without calling Google APIs.
 *
 * Quota Allocation Rules (SRS Section 4.1):
 * - Group A Officers: 20 GB
 * - Teaching Staff: 20 GB
 * - Research Scholars: 10 GB
 * - Post Graduate Students: 5 GB
 * - Non-Teaching Staff: 5 GB
 */
@Injectable()
export class GoogleWorkspaceService {
  private readonly logger = new Logger(GoogleWorkspaceService.name);
  private readonly isMock: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.isMock = process.env.MOCK_GOOGLE_WORKSPACE === 'true';
    if (this.isMock) {
      this.logger.warn(
        '⚠️  Google Workspace is in MOCK MODE — no real accounts will be created',
      );
    }
  }

  /**
   * Provision an email account for an approved application.
   *
   * Flow:
   * 1. Verify application status is APPROVED_HOD
   * 2. Generate username (firstname.lastname@bhu.ac.in)
   * 3. Generate secure temporary password
   * 4. Determine storage quota from category
   * 5. Call Google Admin Directory API (or mock)
   * 6. Update DB with provisioned email and quota
   * 7. Create audit log entry
   */
  async provision(
    applicationId: string,
    adminUserId: string,
    ipAddress: string,
  ) {
    // ── Step 1: Validate application state ──
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        applicant: true,
        department: true,
      },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (
      application.status !== ApplicationStatus.APPROVED_HOD &&
      application.status !== ApplicationStatus.APPROVED_DEAN
    ) {
      throw new BadRequestException(
        `Application must be in APPROVED_HOD or APPROVED_DEAN status. Current: ${application.status}`,
      );
    }

    // ── Step 2: Generate BHU email username (Policy-Compliant Format) ──
    const firstName = application.applicant.firstName
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const lastName = application.applicant.lastName
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const domain = process.env.GOOGLE_DOMAIN || 'bhu.ac.in';
    const details = application.applicantDetails as Record<string, unknown>;
    const category = details.category as string;
    const deptCode = (application.department?.code || 'dept').toLowerCase().replace(/[^a-z0-9]/g, '');
    const year = new Date().getFullYear();

    // Generate email based on category per BHU IT Policy Section 3(c)
    let bhuEmail: string;
    switch (category) {
      case ApplicantCategory.TEACHING_STAFF:
        bhuEmail = `${firstName}.${deptCode}@${domain}`;
        break;
      case ApplicantCategory.GROUP_A_OFFICER:
        bhuEmail = `${firstName}.admin@${domain}`;
        break;
      case ApplicantCategory.NON_TEACHING_STAFF:
        bhuEmail = `${firstName}.admin@${domain}`;
        break;
      case ApplicantCategory.RESEARCH_SCHOLAR:
        bhuEmail = `${firstName}.${deptCode}.${year}@${domain}`;
        break;
      case ApplicantCategory.POST_GRADUATE_STUDENT:
        bhuEmail = `${firstName}.${deptCode}.${year}@${domain}`;
        break;
      case ApplicantCategory.UNDER_GRADUATE_STUDENT:
        bhuEmail = `${firstName}.${deptCode}.${year}@${domain}`;
        break;
      default:
        bhuEmail = `${firstName}.${lastName}@${domain}`;
    }

    // ── Step 3: Generate secure temporary password ──
    const tempPassword = this.generateSecurePassword();

    // ── Step 4: Determine storage quota ──
    const quotaGB = this.getQuotaForCategory(category);

    // ── Step 5: Call Google API (or mock) ──
    try {
      if (this.isMock) {
        this.logger.log(
          `[MOCK] Provisioned: ${bhuEmail} | Quota: ${quotaGB}GB | Password: ${tempPassword}`,
        );
      } else {
        // TODO: Implement real Google Admin Directory API call
        // const { google } = require('googleapis');
        // const admin = google.admin('directory_v1');
        // await admin.users.insert({ ... });
        throw new Error('Real Google API integration not yet implemented');
      }
    } catch (error) {
      // Mark as failed
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.FAILED_PROVISIONING,
          ccAdminRemarks: `Provisioning failed: ${(error as Error).message}`,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          entityType: 'APPLICATION',
          entityId: applicationId,
          action: 'PROVISIONING_FAILED',
          performedBy: adminUserId,
          ipAddress,
          payload: { error: (error as Error).message },
        },
      });

      if (!this.isMock) {
        throw new InternalServerErrorException(
          'Google Workspace provisioning failed. Application marked as FAILED.',
        );
      }
    }

    // ── Step 6: Update DB ──
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.PROVISIONED,
        provisionedAt: new Date(),
        quotaAssignedGB: quotaGB,
        ccAdminRemarks: `Account provisioned: ${bhuEmail}`,
      },
    });

    // Update the user's BHU email
    await this.prisma.user.update({
      where: { id: application.applicantId },
      data: { bhuEmail },
    });

    // ── Step 7: Audit log ──
    await this.prisma.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        entityId: applicationId,
        action: 'ACCOUNT_PROVISIONED',
        performedBy: adminUserId,
        ipAddress,
        payload: {
          bhuEmail,
          quotaGB,
          applicantAlternateEmail: application.applicant.alternateEmail,
        },
      },
    });

    this.logger.log(
      `✅ Application ${application.trackingId} provisioned → ${bhuEmail} (${quotaGB}GB)`,
    );

    // TODO: Send email via Nodemailer with bhuEmail + tempPassword
    // to application.applicant.alternateEmail

    return {
      trackingId: application.trackingId,
      bhuEmail,
      quotaAssignedGB: quotaGB,
      provisionedAt: updated.provisionedAt,
      message: this.isMock
        ? 'Account provisioned in MOCK mode'
        : 'Account provisioned successfully. Credentials sent to alternate email.',
    };
  }

  /**
   * Determine the storage quota based on the applicant category.
   * SRS Section 4.1 — Business Rules.
   */
  private getQuotaForCategory(category: string): number {
    const quotaMap: Record<string, number> = {
      [ApplicantCategory.GROUP_A_OFFICER]: 20,
      [ApplicantCategory.TEACHING_STAFF]: 20,
      [ApplicantCategory.RESEARCH_SCHOLAR]: 10,
      [ApplicantCategory.POST_GRADUATE_STUDENT]: 5,
      [ApplicantCategory.NON_TEACHING_STAFF]: 5,
      [ApplicantCategory.UNDER_GRADUATE_STUDENT]: 5,
    };

    return quotaMap[category] || 5; // Default to 5GB
  }

  /**
   * Generate a cryptographically secure random password.
   * Format: 16 characters, mixed uppercase/lowercase/numbers/symbols.
   */
  private generateSecurePassword(): string {
    return crypto.randomBytes(12).toString('base64url').slice(0, 16);
  }
}
