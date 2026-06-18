import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ReapplyService } from './reapply.service';
import { CreateReapplyRequestDto } from './dto/create-reapply-request.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reapply Requests')
@Controller('reapply')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReapplyController {
  constructor(private readonly reapplyService: ReapplyService) {}

  /**
   * POST /api/v1/reapply
   * Submit a reapply request for a rejected application.
   * Accessible by: APPLICANT
   */
  @Post()
  @Roles(Role.APPLICANT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Submit a reapply request for a rejected application' })
  async createRequest(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: CreateReapplyRequestDto,
  ) {
    return this.reapplyService.createRequest(req.user.userId, dto);
  }

  /**
   * GET /api/v1/reapply/my
   * Get the applicant's own reapply requests.
   * Accessible by: APPLICANT
   */
  @Get('my')
  @Roles(Role.APPLICANT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Get current user's reapply requests" })
  async findMyRequests(
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.reapplyService.findByApplicant(req.user.userId);
  }

  /**
   * GET /api/v1/reapply/hod
   * Get pending reapply requests for the HOD's department.
   * Accessible by: HOD
   */
  @Get('hod')
  @Roles(Role.HOD)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Get pending reapply requests for HOD's department" })
  async findForHod(
    @Req() req: Request & { user: { userId: string; departmentId?: string } },
  ) {
    const user = req.user as { userId: string; departmentId: string };
    return this.reapplyService.findForHod(user.departmentId);
  }

  /**
   * PATCH /api/v1/reapply/:id/approve
   * HOD approves a reapply request.
   * Accessible by: HOD
   */
  @Patch(':id/approve')
  @Roles(Role.HOD)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Approve a reapply request' })
  async approveRequest(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string; departmentId?: string } },
    @Body() body: { remarks?: string },
  ) {
    const user = req.user as { userId: string; departmentId: string };
    return this.reapplyService.approveRequest(id, user.departmentId, body.remarks);
  }

  /**
   * PATCH /api/v1/reapply/:id/reject
   * HOD rejects a reapply request.
   * Accessible by: HOD
   */
  @Patch(':id/reject')
  @Roles(Role.HOD)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Reject a reapply request' })
  async rejectRequest(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string; departmentId?: string } },
    @Body() body: { remarks?: string },
  ) {
    const user = req.user as { userId: string; departmentId: string };
    return this.reapplyService.rejectRequest(id, user.departmentId, body.remarks);
  }
}
