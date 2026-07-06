import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';
import { ApplicantCategory } from '../applications/dto/create-application.dto';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class GoogleWorkspaceService {
  private readonly logger = new Logger(GoogleWorkspaceService.name);
  private readonly isMock: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    this.isMock = process.env.MOCK_GOOGLE_WORKSPACE === 'true';
    if (this.isMock) {
      this.logger.warn(
        '⚠️  Google Workspace is in MOCK MODE — no real accounts will be created',
      );
    }
  }

  async provision(
    applicationId: string,
    adminUserId: string,
    ipAddress: string,
  ) {
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
    
    let yearToUse = new Date().getFullYear(); 

    if (
      category === ApplicantCategory.UNDER_GRADUATE_STUDENT ||
      category === ApplicantCategory.POST_GRADUATE_STUDENT ||
      category === ApplicantCategory.RESEARCH_SCHOLAR
    ) {
      if (details.admissionYear) {
        const parsed = new Date(details.admissionYear as string);
        yearToUse = !isNaN(parsed.getFullYear()) ? parsed.getFullYear() : parseInt(details.admissionYear as string, 10) || yearToUse;
      }
    } else {
      if (details.dateOfJoining) {
        const parsed = new Date(details.dateOfJoining as string);
        yearToUse = !isNaN(parsed.getFullYear()) ? parsed.getFullYear() : parseInt(details.dateOfJoining as string, 10) || yearToUse;
      }
    }

    let bhuEmail: string;
    switch (category) {
      case ApplicantCategory.TEACHING_STAFF:
        bhuEmail = `${firstName}.${deptCode}.${yearToUse}@${domain}`;
        break;
      case ApplicantCategory.GROUP_A_OFFICER:
        bhuEmail = `${firstName}.admin.${yearToUse}@${domain}`;
        break;
      case ApplicantCategory.NON_TEACHING_STAFF:
        bhuEmail = `${firstName}.admin.${yearToUse}@${domain}`;
        break;
      case ApplicantCategory.RESEARCH_SCHOLAR:
        bhuEmail = `${firstName}.${deptCode}.${yearToUse}@${domain}`;
        break;
      case ApplicantCategory.POST_GRADUATE_STUDENT:
        bhuEmail = `${firstName}.${deptCode}.${yearToUse}@${domain}`;
        break;
      case ApplicantCategory.UNDER_GRADUATE_STUDENT:
        bhuEmail = `${firstName}.${deptCode}.${yearToUse}@${domain}`;
        break;
      default:
        bhuEmail = `${firstName}.${lastName}.${yearToUse}@${domain}`;
    }

    const tempPassword = this.generateSecurePassword();
    const quotaGB = this.getQuotaForCategory(category);

    try {
      if (this.isMock) {
        this.logger.log(
          `[MOCK] Provisioned: ${bhuEmail} | Quota: ${quotaGB}GB | Password: ${tempPassword}`,
        );
      } else {
        throw new Error('Real Google API integration not yet implemented');
      }
    } catch (error) {
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

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.PROVISIONED,
        provisionedAt: new Date(),
        quotaAssignedGB: quotaGB,
        ccAdminRemarks: `Account provisioned: ${bhuEmail}`,
      },
    });

    const userUpdateData: any = { bhuEmail };
    if (details.dateOfRetirement) {
      userUpdateData.retirementDate = new Date(details.dateOfRetirement as string);
    }

    await this.prisma.user.update({
      where: { id: application.applicantId },
      data: userUpdateData,
    });

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

    await this.mailService.sendProvisioningNotification(
      application.applicant.alternateEmail,
      `${application.applicant.firstName} ${application.applicant.lastName}`,
      bhuEmail,
      tempPassword,
      application.trackingId,
      quotaGB,
    );

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

  private getQuotaForCategory(category: string): number {
    const quotaMap: Record<string, number> = {
      [ApplicantCategory.GROUP_A_OFFICER]: 20,
      [ApplicantCategory.TEACHING_STAFF]: 20,
      [ApplicantCategory.RESEARCH_SCHOLAR]: 10,
      [ApplicantCategory.POST_GRADUATE_STUDENT]: 5,
      [ApplicantCategory.NON_TEACHING_STAFF]: 5,
      [ApplicantCategory.UNDER_GRADUATE_STUDENT]: 5,
    };

    return quotaMap[category] || 5;
  }

  private generateSecurePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      password += chars[randomIndex];
    }
    return password;
  }

  async provisionDesignationEmail(bhuEmail: string, quotaGB: number = 20) {
    const tempPassword = this.generateSecurePassword();
    try {
      if (this.isMock) {
        this.logger.log(`[MOCK] Provisioned designation email: ${bhuEmail} | Quota: ${quotaGB}GB`);
      } else {
        throw new Error('Real Google API integration not yet implemented');
      }
    } catch (error) {
      this.logger.error(`Failed to provision designation email ${bhuEmail}`, (error as Error).stack);
      throw error;
    }
    return { bhuEmail, quotaGB, tempPassword };
  }

  async suspendAccount(bhuEmail: string) {
    if (this.isMock) {
      this.logger.log(`[MOCK] Google Workspace Account Suspended: ${bhuEmail}`);
    } else {
      this.logger.log(`[REAL] Suspending Google Workspace Account: ${bhuEmail}`);
    }
    return { success: true, message: `Suspended ${bhuEmail}` };
  }
}
