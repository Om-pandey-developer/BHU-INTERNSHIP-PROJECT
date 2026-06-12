import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';

/**
 * DepartmentsController exposes a public endpoint to list all departments.
 * No authentication is required — the frontend registration form needs this
 * to populate the department dropdown before the user has an account.
 */
@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /**
   * GET /api/v1/departments
   * Public endpoint — returns all university departments.
   */
  @Get()
  @ApiOperation({ summary: 'List all departments (public)' })
  async findAll() {
    return this.departmentsService.findAll();
  }
}
