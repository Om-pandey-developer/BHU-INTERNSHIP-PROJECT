import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DatabaseExplorerService } from './database-explorer.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * DatabaseExplorerController — Admin-only read-only access to all database tables.
 * Exposes endpoints for the "Database Explorer" page in the admin dashboard.
 *
 * Security: All routes require JWT authentication + CC_ADMIN role.
 */
@ApiTags('Database Explorer')
@Controller('admin/database')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CC_ADMIN)
@ApiBearerAuth('JWT-auth')
export class DatabaseExplorerController {
  constructor(
    private readonly databaseExplorerService: DatabaseExplorerService,
  ) {}

  /**
   * GET /api/v1/admin/database/tables
   * Returns an overview of all database tables with counts and column info.
   */
  @Get('tables')
  @ApiOperation({ summary: 'Get overview of all database tables' })
  async getTablesOverview() {
    return this.databaseExplorerService.getTablesOverview();
  }

  /**
   * GET /api/v1/admin/database/tables/:tableName
   * Returns paginated records from a specific table.
   */
  @Get('tables/:tableName')
  @ApiOperation({ summary: 'Get paginated records from a database table' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getTableRecords(
    @Param('tableName') tableName: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.databaseExplorerService.getTableRecords(
      tableName,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
      search || undefined,
    );
  }
}
