import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DatabaseExplorerService — Provides read-only access to all database tables
 * for the CC Admin "Database Explorer" dashboard page.
 *
 * All methods are read-only (SELECT queries). No mutations are allowed.
 * This service is protected by CC_ADMIN role at the controller level.
 */
@Injectable()
export class DatabaseExplorerService {
  private readonly logger = new Logger(DatabaseExplorerService.name);

  /** Whitelist of allowed table names to prevent SQL injection / arbitrary access */
  private readonly allowedTables = [
    'User',
    'Application',
    'Department',
    'AuditLog',
    'OtpVerification',
    'ReapplyRequest',
  ] as const;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get an overview of all tables: name, row count, and column info.
   */
  async getTablesOverview() {
    const [
      userCount,
      applicationCount,
      departmentCount,
      auditLogCount,
      otpCount,
      reapplyCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.application.count(),
      this.prisma.department.count(),
      this.prisma.auditLog.count(),
      this.prisma.otpVerification.count(),
      this.prisma.reapplyRequest.count(),
    ]);

    return [
      {
        name: 'User',
        icon: 'group',
        description: 'All registered users (Applicants, HODs, Admins)',
        count: userCount,
        columns: ['id', 'alternateEmail', 'bhuEmail', 'firstName', 'lastName', 'role', 'departmentId', 'createdAt', 'updatedAt'],
      },
      {
        name: 'Application',
        icon: 'description',
        description: 'Email account applications with workflow status',
        count: applicationCount,
        columns: ['trackingId', 'applicantId', 'departmentId', 'status', 'hodRemarks', 'ccAdminRemarks', 'createdAt', 'updatedAt'],
      },
      {
        name: 'Department',
        icon: 'business',
        description: 'University departments with assigned HODs',
        count: departmentCount,
        columns: ['id', 'code', 'name', 'hodId'],
      },
      {
        name: 'AuditLog',
        icon: 'history',
        description: 'Immutable audit trail for compliance',
        count: auditLogCount,
        columns: ['trackingId', 'entityType', 'action', 'performedBy', 'ipAddress', 'createdAt'],
      },
      {
        name: 'OtpVerification',
        icon: 'pin',
        description: 'Email verification OTPs with expiry',
        count: otpCount,
        columns: ['id', 'email', 'expiresAt', 'attempts', 'createdAt'],
      },
      {
        name: 'ReapplyRequest',
        icon: 'replay',
        description: 'Re-application requests after HOD rejection',
        count: reapplyCount,
        columns: ['id', 'applicationId', 'applicantId', 'reason', 'rollNumber', 'studentName', 'status', 'hodRemarks', 'createdAt', 'updatedAt'],
      },
    ];
  }

  /**
   * Get paginated records from a specific table.
   * @param tableName - Must be one of the allowed table names.
   * @param page - Page number (1-indexed)
   * @param limit - Records per page (max 100)
   * @param search - Optional search string
   */
  async getTableRecords(
    tableName: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    if (!this.allowedTables.includes(tableName as any)) {
      throw new BadRequestException(
        `Invalid table name "${tableName}". Allowed: ${this.allowedTables.join(', ')}`,
      );
    }

    // Clamp values
    page = Math.max(1, page);
    limit = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * limit;

    let records: any[];
    let totalCount: number;

    switch (tableName) {
      case 'User':
        const userWhere = search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { alternateEmail: { contains: search, mode: 'insensitive' as const } },
                { bhuEmail: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {};
        [records, totalCount] = await Promise.all([
          this.prisma.user.findMany({
            where: userWhere,
            select: {
              id: true,
              alternateEmail: true,
              bhuEmail: true,
              firstName: true,
              lastName: true,
              role: true,
              departmentId: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.user.count({ where: userWhere }),
        ]);
        break;

      case 'Application':
        const appWhere = search
          ? {
              OR: [
                { trackingId: { contains: search, mode: 'insensitive' as const } },
                { applicant: { firstName: { contains: search, mode: 'insensitive' as const } } },
                { applicant: { lastName: { contains: search, mode: 'insensitive' as const } } },
                { applicant: { alternateEmail: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {};
        [records, totalCount] = await Promise.all([
          this.prisma.application.findMany({
            where: appWhere,
            select: {
              id: true,
              trackingId: true,
              applicantId: true,
              departmentId: true,
              status: true,
              hodRemarks: true,
              ccAdminRemarks: true,
              hodApprovedAt: true,
              provisionedAt: true,
              createdAt: true,
              updatedAt: true,
              applicant: { select: { firstName: true, lastName: true, alternateEmail: true } },
              department: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.application.count({ where: appWhere }),
        ]);
        break;

      case 'Department':
        const deptWhere = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { code: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {};
        [records, totalCount] = await Promise.all([
          this.prisma.department.findMany({
            where: deptWhere,
            include: {
              _count: { select: { users: true, applications: true } },
            },
            skip,
            take: limit,
          }),
          this.prisma.department.count({ where: deptWhere }),
        ]);
        break;

      case 'AuditLog':
        const auditWhere = search
          ? {
              OR: [
                { action: { contains: search, mode: 'insensitive' as const } },
                { entityType: { contains: search, mode: 'insensitive' as const } },
                { entityId: { contains: search, mode: 'insensitive' as const } },
                { performedBy: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {};
        const [rawAuditLogs, auditTotalCount] = await Promise.all([
          this.prisma.auditLog.findMany({
            where: auditWhere,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.auditLog.count({ where: auditWhere }),
        ]);

        // Enrich: resolve performedBy UUIDs to user name/role/department
        const performerIds = [...new Set(rawAuditLogs.map(l => l.performedBy))];
        const performers = performerIds.length > 0
          ? await this.prisma.user.findMany({
              where: { id: { in: performerIds } },
              select: { id: true, firstName: true, lastName: true, role: true, department: { select: { name: true } } },
            })
          : [];
        const performerMap = new Map(performers.map(p => [p.id, p]));

        // Enrich: resolve entityId to trackingId for APPLICATION entities
        const appEntityIds = [...new Set(rawAuditLogs.filter(l => l.entityType === 'APPLICATION').map(l => l.entityId))];
        const appEntities = appEntityIds.length > 0
          ? await this.prisma.application.findMany({
              where: { id: { in: appEntityIds } },
              select: { id: true, trackingId: true },
            })
          : [];
        const appTrackingMap = new Map(appEntities.map(a => [a.id, a.trackingId]));

        records = rawAuditLogs.map(log => {
          const performer = performerMap.get(log.performedBy);
          const roleLabelMap: Record<string, string> = { APPLICANT: 'Student', HOD: 'HOD', CC_ADMIN: 'Admin' };
          return {
            ...log,
            trackingId: log.entityType === 'APPLICATION' ? (appTrackingMap.get(log.entityId) || log.entityId) : log.entityId,
            performedBy: performer
              ? `${performer.firstName} ${performer.lastName} (${roleLabelMap[performer.role] || performer.role}, ${performer.department?.name || 'N/A'})`
              : log.performedBy,
          };
        });
        totalCount = auditTotalCount;
        break;

      case 'OtpVerification':
        const otpWhere = search
          ? {
              email: { contains: search, mode: 'insensitive' as const },
            }
          : {};
        [records, totalCount] = await Promise.all([
          this.prisma.otpVerification.findMany({
            where: otpWhere,
            select: {
              id: true,
              email: true,
              expiresAt: true,
              attempts: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.otpVerification.count({ where: otpWhere }),
        ]);
        break;

      case 'ReapplyRequest':
        const reapplyWhere = search
          ? {
              OR: [
                { studentName: { contains: search, mode: 'insensitive' as const } },
                { rollNumber: { contains: search, mode: 'insensitive' as const } },
                { reason: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {};
        [records, totalCount] = await Promise.all([
          this.prisma.reapplyRequest.findMany({
            where: reapplyWhere,
            include: {
              applicant: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.reapplyRequest.count({ where: reapplyWhere }),
        ]);
        break;

      default:
        throw new BadRequestException(`Unsupported table: ${tableName}`);
    }

    return {
      tableName,
      records,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    };
  }
}
