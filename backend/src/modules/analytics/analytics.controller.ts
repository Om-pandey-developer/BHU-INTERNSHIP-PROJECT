import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /api/v1/analytics/dashboard
   * Get aggregated dashboard metrics.
   * Accessible by: CC_ADMIN only
   */
  @Get('dashboard')
  @Roles(Role.CC_ADMIN)
  @ApiOperation({ summary: 'Get CC Admin dashboard analytics' })
  async getDashboard() {
    return this.analyticsService.getDashboardMetrics();
  }
}
