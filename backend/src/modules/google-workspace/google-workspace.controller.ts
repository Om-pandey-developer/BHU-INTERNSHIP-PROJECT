import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { GoogleWorkspaceService } from './google-workspace.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Workspace')
@Controller('workspace')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class GoogleWorkspaceController {
  constructor(
    private readonly googleWorkspaceService: GoogleWorkspaceService,
  ) {}

  /**
   * POST /api/v1/workspace/provision/:applicationId
   * Trigger Google Workspace account provisioning.
   * Accessible by: CC_ADMIN only
   */
  @Post('provision/:applicationId')
  @Roles(Role.CC_ADMIN)
  @ApiOperation({
    summary:
      'Trigger Google Workspace provisioning for an approved application',
  })
  async provision(
    @Param('applicationId') applicationId: string,
    @Req() req: Request & { user: { userId: string } },
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

    return this.googleWorkspaceService.provision(
      applicationId,
      req.user.userId,
      ipAddress,
    );
  }
}
