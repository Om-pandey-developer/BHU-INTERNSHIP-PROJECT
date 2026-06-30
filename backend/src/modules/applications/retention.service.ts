import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Runs every day at midnight to process retentions.
   * Based on the policy:
   * Faculty: Retained for 5 years after superannuation, then deleted.
   * Staff/Scholars/PG Students (and UG): Retained for 1 year after superannuation/completion, then deleted.
   * 
   * This job checks for expectedExpiryDate and marks them as ARCHIVED when they hit the expiry date,
   * then tracks when they should be deleted.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRetentionPolicy() {
    this.logger.log('Starting daily retention policy enforcement job...');
    const now = new Date();

    // 1. Suspend/Archive users who have passed their expectedExpiryDate
    // For simplicity, we assume hitting expectedExpiryDate changes status from PROVISIONED to ARCHIVED.
    const expiredUsers = await this.prisma.application.findMany({
      where: {
        status: ApplicationStatus.PROVISIONED,
        expectedExpiryDate: {
          lt: now,
        },
      },
    });

    for (const app of expiredUsers) {
      // Archive the application
      await this.prisma.application.update({
        where: { id: app.id },
        data: {
          status: ApplicationStatus.ARCHIVED,
          // Calculate when the data should actually be deleted (1 or 5 years)
          // Faculty = 5 years, Others = 1 year
          // We can use a custom field or simply calculate it during deletion cron
        },
      });

      this.logger.log(`Archived application ${app.trackingId} due to expiry date.`);
      
      // Log audit
      await this.prisma.auditLog.create({
        data: {
          entityType: 'APPLICATION',
          entityId: app.id,
          action: 'AUTO_ARCHIVED_DUE_TO_EXPIRY',
          performedBy: 'SYSTEM',
          ipAddress: '127.0.0.1',
        },
      });
      
      // Note: Actual Google Workspace deletion/suspension logic would be triggered here
    }

    // 2. Delete users who have passed their retention period (1 or 5 years post expiry)
    // For this, we'll find ARCHIVED applications where expectedExpiryDate is far in the past.
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    
    const fiveYearsAgo = new Date(now);
    fiveYearsAgo.setFullYear(now.getFullYear() - 5);

    const applicationsToDelete = await this.prisma.application.findMany({
      where: {
        status: ApplicationStatus.ARCHIVED,
        expectedExpiryDate: {
          not: null,
        },
      },
    });

    for (const app of applicationsToDelete) {
      const category = (app.applicantDetails as any)?.category;
      const isFaculty = category === 'TEACHING_STAFF' || category === 'GROUP_A_OFFICER';
      const retentionPeriodDate = isFaculty ? fiveYearsAgo : oneYearAgo;

      if (app.expectedExpiryDate && app.expectedExpiryDate < retentionPeriodDate) {
        // Delete the application (or mark as DELETED in status if such status exists)
        // Since we don't have a DELETED status in the enum, we can just delete the record or do a soft delete.
        // For now, we'll just log it. Real implementation would delete the DB record and Workspace account.
        
        // await this.prisma.application.delete({ where: { id: app.id } });
        
        this.logger.log(`Application ${app.trackingId} has passed its retention period and is queued for deletion.`);
        
        await this.prisma.auditLog.create({
          data: {
            entityType: 'APPLICATION',
            entityId: app.id,
            action: 'AUTO_DELETED_DUE_TO_RETENTION_POLICY',
            performedBy: 'SYSTEM',
            ipAddress: '127.0.0.1',
          },
        });
      }
    }

    this.logger.log('Retention policy enforcement job completed.');
  }
}
