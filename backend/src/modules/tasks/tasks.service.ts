import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleWorkspaceService } from '../google-workspace/google-workspace.service';
import { ApplicationStatus, Role } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: GoogleWorkspaceService,
  ) {}

  /**
   * Runs every day at midnight (server time)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRetirementAndTenureExpiry() {
    this.logger.log('Running daily cron job for retirement and tenure expiry checks...');
    const now = new Date();

    // 1. Handle Role Expiry (HOD/Dean Tenure)
    try {
      const expiredRoles = await this.prisma.user.findMany({
        where: {
          roleExpiryDate: { lte: now },
          role: { in: [Role.HOD, Role.DEAN] },
        },
      });

      for (const user of expiredRoles) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: Role.APPLICANT, roleExpiryDate: null },
        });
        this.logger.log(`Reverted role of ${user.alternateEmail} from ${user.role} to APPLICANT due to tenure expiry.`);
      }
    } catch (error) {
      this.logger.error('Failed to process role expiries', error);
    }

    // 2. Handle Staff Retirement
    try {
      const retiredStaff = await this.prisma.user.findMany({
        where: {
          retirementDate: { lte: now },
          bhuEmail: { not: null },
        },
      });

      for (const staff of retiredStaff) {
        if (staff.bhuEmail) {
          // Suspend in Google Workspace
          const suspended = await this.workspaceService.suspendAccount(staff.bhuEmail);
          
          if (suspended) {
            // Mark all their provisioned applications as ARCHIVED
            await this.prisma.application.updateMany({
              where: { applicantId: staff.id, status: ApplicationStatus.PROVISIONED },
              data: { status: ApplicationStatus.ARCHIVED }
            });
            this.logger.log(`Staff ${staff.alternateEmail} reached retirement. Account suspended and archived.`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to process staff retirements', error);
    }
  }
}
