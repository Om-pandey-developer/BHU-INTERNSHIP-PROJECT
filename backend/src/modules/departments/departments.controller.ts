import { Controller, Get, Post, Patch, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * DepartmentsController exposes:
 * - Public GET for listing departments (registration form)
 * - Admin-only CRUD for managing departments
 * - Admin-only approval for "Others" department requests
 */
@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /**
   * GET /api/v1/departments
   * Public endpoint — returns all active university departments.
   */
  @Get()
  @ApiOperation({ summary: 'List all departments (public)' })
  async findAll() {
    return this.departmentsService.findAll();
  }

  // ════════════════════════════════════════════
  // ADMIN-ONLY DEPARTMENT MANAGEMENT
  // ════════════════════════════════════════════

  /**
   * POST /api/v1/departments/admin
   * Create a new department (admin only).
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CC_ADMIN)
  @ApiOperation({ summary: 'Create a new department (admin)' })
  async create(@Body() body: { name: string; code: string }) {
    if (!body.name?.trim() || !body.code?.trim()) {
      throw new BadRequestException('Department name and code are required.');
    }
    return this.departmentsService.create(body.name.trim(), body.code.trim().toUpperCase());
  }

  /**
   * PATCH /api/v1/departments/admin/:id
   * Update department name/code (admin only).
   */
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CC_ADMIN)
  @ApiOperation({ summary: 'Update a department (admin)' })
  async update(@Param('id') id: string, @Body() body: { name?: string; code?: string }) {
    return this.departmentsService.update(id, body);
  }

  /**
   * PATCH /api/v1/departments/admin/:id/deactivate
   * Soft-delete (deactivate) a department (admin only).
   */
  @Patch('admin/:id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CC_ADMIN)
  @ApiOperation({ summary: 'Deactivate a department (admin)' })
  async deactivate(@Param('id') id: string) {
    return this.departmentsService.deactivate(id);
  }

  // ════════════════════════════════════════════
  // DEPARTMENT REQUESTS ("Others" approval)
  // ════════════════════════════════════════════

  /**
   * GET /api/v1/departments/requests
   * List all pending "Others" department requests (admin only).
   */
  @Get('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CC_ADMIN)
  @ApiOperation({ summary: 'List pending department requests (admin)' })
  async getRequests() {
    return this.departmentsService.getPendingRequests();
  }

  /**
   * PATCH /api/v1/departments/requests/:id/approve
   * Approve a department request and add it to the official list.
   */
  @Patch('requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CC_ADMIN)
  @ApiOperation({ summary: 'Approve a department request (admin)' })
  async approveRequest(
    @Param('id') id: string,
    @Body() body: { code: string; remarks?: string },
  ) {
    if (!body.code?.trim()) {
      throw new BadRequestException('Department code is required for approval.');
    }
    return this.departmentsService.approveRequest(id, body.code.trim().toUpperCase(), body.remarks);
  }

  /**
   * PATCH /api/v1/departments/requests/:id/reject
   * Reject a department request.
   */
  @Patch('requests/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CC_ADMIN)
  @ApiOperation({ summary: 'Reject a department request (admin)' })
  async rejectRequest(
    @Param('id') id: string,
    @Body() body: { remarks?: string },
  ) {
    return this.departmentsService.rejectRequest(id, body.remarks);
  }
}
