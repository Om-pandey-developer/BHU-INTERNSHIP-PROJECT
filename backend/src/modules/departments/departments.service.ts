import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DepartmentsService provides CRUD operations for departments
 * and management of "Others" department requests.
 */
@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return all active departments, ordered by name.
   */
  async findAll() {
    return this.prisma.department.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      where: {
        NOT: { code: { startsWith: 'DEACTIVATED_' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new department.
   */
  async create(name: string, code: string) {
    // Check for duplicate code
    const existing = await this.prisma.department.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Department with code "${code}" already exists.`);
    }

    const dept = await this.prisma.department.create({
      data: { name, code },
    });

    this.logger.log(`Department created: ${name} (${code})`);
    return { message: 'Department created successfully.', department: dept };
  }

  /**
   * Update a department's name or code.
   */
  async update(id: string, data: { name?: string; code?: string }) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found.');

    if (data.code) {
      const existing = await this.prisma.department.findUnique({ where: { code: data.code } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Department with code "${data.code}" already exists.`);
      }
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.trim().toUpperCase() }),
      },
    });

    this.logger.log(`Department updated: ${updated.name} (${updated.code})`);
    return { message: 'Department updated successfully.', department: updated };
  }

  /**
   * Soft-delete a department by prefixing its code with "DEACTIVATED_".
   * This preserves historical data integrity.
   */
  async deactivate(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found.');

    if (dept.code.startsWith('DEACTIVATED_')) {
      return { message: 'Department is already deactivated.' };
    }

    await this.prisma.department.update({
      where: { id },
      data: { code: `DEACTIVATED_${dept.code}` },
    });

    this.logger.log(`Department deactivated: ${dept.name} (${dept.code})`);
    return { message: `Department "${dept.name}" has been deactivated.` };
  }

  // ════════════════════════════════════════════
  // DEPARTMENT REQUESTS ("Others" approval)
  // ════════════════════════════════════════════

  /**
   * List all pending "Others" department requests.
   */
  async getPendingRequests() {
    return this.prisma.departmentRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        applicant: {
          select: { id: true, firstName: true, lastName: true, alternateEmail: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve a department request — creates the department, marks ALL matching
   * PENDING requests as APPROVED, and auto-assigns the new departmentId to
   * all users who requested it.
   */
  async approveRequest(requestId: string, code: string, remarks?: string) {
    const request = await this.prisma.departmentRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Department request not found.');

    // Create the new department
    const dept = await this.prisma.department.create({
      data: { name: request.requestedName, code },
    });

    // Find ALL PENDING requests with the same requestedName (deduplication-aware)
    const allMatchingRequests = await this.prisma.departmentRequest.findMany({
      where: {
        requestedName: request.requestedName,
        status: 'PENDING',
      },
      select: { id: true, applicantId: true },
    });

    // Collect unique applicant IDs from all matching requests
    const applicantIds = [...new Set(allMatchingRequests.map(r => r.applicantId))];

    // Mark ALL matching PENDING requests as APPROVED
    await this.prisma.departmentRequest.updateMany({
      where: {
        requestedName: request.requestedName,
        status: 'PENDING',
      },
      data: { status: 'APPROVED', adminRemarks: remarks || `Approved as ${code}` },
    });

    // Auto-assign the new department to all users who requested it (only if they have no department yet)
    if (applicantIds.length > 0) {
      await this.prisma.user.updateMany({
        where: {
          id: { in: applicantIds },
          departmentId: null, // Only update users who still don't have a department
        },
        data: { departmentId: dept.id },
      });
      this.logger.log(`Auto-assigned department "${request.requestedName}" to ${applicantIds.length} user(s)`);
    }

    this.logger.log(`Department request approved: "${request.requestedName}" → ${code}`);
    return { message: `Department "${request.requestedName}" approved and created.`, department: dept };
  }

  /**
   * Reject a department request.
   */
  async rejectRequest(requestId: string, remarks?: string) {
    const request = await this.prisma.departmentRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Department request not found.');

    await this.prisma.departmentRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', adminRemarks: remarks || 'Rejected by admin' },
    });

    this.logger.log(`Department request rejected: "${request.requestedName}"`);
    return { message: `Department request "${request.requestedName}" has been rejected.` };
  }
}
