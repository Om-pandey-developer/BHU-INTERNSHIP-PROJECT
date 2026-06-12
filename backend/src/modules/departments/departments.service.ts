import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DepartmentsService provides read access to the department list.
 * Used by the frontend registration form and other modules.
 */
@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return all departments, ordered by name.
   */
  async findAll() {
    return this.prisma.department.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
