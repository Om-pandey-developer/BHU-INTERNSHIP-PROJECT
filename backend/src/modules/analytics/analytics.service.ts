import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';

/**
 * AnalyticsService aggregates metrics for the CC Admin dashboard.
 *
 * Provides:
 * - Application volume by status
 * - Average HOD approval time
 * - Department-wise submission breakdown
 * - Quota utilization summary
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive dashboard metrics for CC Admin.
   */
  async getDashboardMetrics() {
    const [
      totalApplications,
      statusBreakdown,
      departmentBreakdown,
      recentApplications,
      avgApprovalTime,
      quotaUtilization,
    ] = await Promise.all([
      this.getTotalApplications(),
      this.getStatusBreakdown(),
      this.getDepartmentBreakdown(),
      this.getRecentApplications(),
      this.getAverageApprovalTime(),
      this.getQuotaUtilization(),
    ]);

    return {
      totalApplications,
      statusBreakdown,
      departmentBreakdown,
      recentApplications,
      avgApprovalTime,
      quotaUtilization,
    };
  }

  private async getTotalApplications(): Promise<number> {
    return this.prisma.application.count();
  }

  private async getStatusBreakdown() {
    const statuses = Object.values(ApplicationStatus);
    const counts = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await this.prisma.application.count({ where: { status } }),
      })),
    );
    return counts;
  }

  private async getDepartmentBreakdown() {
    const departments = await this.prisma.department.findMany({
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    return departments.map((dept) => ({
      id: dept.id,
      code: dept.code,
      name: dept.name,
      applicationCount: dept._count.applications,
    }));
  }

  private async getRecentApplications() {
    return this.prisma.application.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        applicant: {
          select: {
            firstName: true,
            lastName: true,
            alternateEmail: true,
          },
        },
        department: {
          select: { name: true, code: true },
        },
      },
    });
  }

  /**
   * Calculate average time (in hours) between application submission
   * and HOD approval for approved applications.
   */
  private async getAverageApprovalTime() {
    const approved = await this.prisma.application.findMany({
      where: {
        hodApprovedAt: { not: null },
      },
      select: {
        createdAt: true,
        hodApprovedAt: true,
      },
    });

    if (approved.length === 0) {
      return { averageHours: 0, sampleSize: 0 };
    }

    const totalMs = approved.reduce((sum, app) => {
      const diff =
        new Date(app.hodApprovedAt!).getTime() -
        new Date(app.createdAt).getTime();
      return sum + diff;
    }, 0);

    const avgMs = totalMs / approved.length;
    const avgHours = Math.round((avgMs / (1000 * 60 * 60)) * 100) / 100;

    return { averageHours: avgHours, sampleSize: approved.length };
  }

  /**
   * Summarize total storage quota allocated across all provisioned accounts.
   */
  private async getQuotaUtilization() {
    const provisioned = await this.prisma.application.findMany({
      where: { status: ApplicationStatus.PROVISIONED },
      select: { quotaAssignedGB: true },
    });

    const totalQuotaGB = provisioned.reduce(
      (sum, app) => sum + (app.quotaAssignedGB || 0),
      0,
    );

    return {
      totalProvisionedAccounts: provisioned.length,
      totalQuotaAllocatedGB: totalQuotaGB,
    };
  }
}
