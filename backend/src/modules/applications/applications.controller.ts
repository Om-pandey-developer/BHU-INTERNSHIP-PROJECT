import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * POST /api/v1/applications
   * Submit a new email account application with photo upload.
   * Accessible by: APPLICANT
   */
  @Post()
  @Roles(Role.APPLICANT)
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photo', maxCount: 1 },
        { name: 'signature', maxCount: 1 },
      ],
      {
        limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
        storage: diskStorage({
          destination: process.env.UPLOAD_DIR || './uploads',
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const prefix = file.fieldname === 'signature' ? 'sig' : 'photo';
            cb(null, `${prefix}-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (!file.mimetype.match(/\/(jpeg|jpg|png)$/i)) {
            return cb(
              new Error('Only JPEG and PNG image files are allowed'),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  @ApiOperation({ summary: 'Submit a new email account application' })
  @ApiConsumes('multipart/form-data')
  async create(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: CreateApplicationDto,
    @UploadedFiles() files: { photo?: Express.Multer.File[], signature?: Express.Multer.File[] },
  ) {
    const photoFile = files.photo?.[0];
    const signatureFile = files.signature?.[0];
    
    if (!photoFile) throw new NotFoundException('Photo is required');
    if (!signatureFile) throw new NotFoundException('Signature is required');

    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

    return this.applicationsService.create(
      req.user.userId,
      dto,
      photoFile.path,
      signatureFile.path,
      ipAddress,
    );
  }

  /**
   * GET /api/v1/applications/my
   * Get the authenticated applicant's own applications.
   */
  @Get('my')
  @ApiOperation({ summary: "Get current user's applications" })
  async findMyApplications(
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.applicationsService.findByApplicant(req.user.userId);
  }

  /**
   * GET /api/v1/applications/hod-queue
   * Get pending applications for the HOD's department.
   * Accessible by: HOD
   */
  @Get('hod-queue')
  @Roles(Role.HOD)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get pending applications for HOD's department",
  })
  async findHodQueue(
    @Req()
    req: Request & { user: { userId: string; departmentId?: string } },
  ) {
    // departmentId should be resolved from user profile
    const user = req.user as { userId: string; departmentId: string };
    return this.applicationsService.findForHod(user.departmentId);
  }

  /**
   * GET /api/v1/applications/hod-reviewed
   * Get applications reviewed by the HOD for their department.
   * Accessible by: HOD
   */
  @Get('hod-reviewed')
  @Roles(Role.HOD)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get reviewed applications for HOD's department",
  })
  async findHodReviewed(
    @Req()
    req: Request & { user: { userId: string; departmentId?: string } },
  ) {
    const user = req.user as { userId: string; departmentId: string };
    return this.applicationsService.findReviewedForHod(user.departmentId);
  }

  /**
   * GET /api/v1/applications/hod-provisioned
   * Get applications provisioned for the HOD's department.
   * Accessible by: HOD
   */
  @Get('hod-provisioned')
  @Roles(Role.HOD)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get provisioned applications for HOD's department",
  })
  async findHodProvisioned(
    @Req()
    req: Request & { user: { userId: string; departmentId?: string } },
  ) {
    const user = req.user as { userId: string; departmentId: string };
    return this.applicationsService.findProvisionedForHod(user.departmentId);
  }

  /**
   * PATCH /api/v1/applications/:id/hod-status
   * HOD approves or rejects an application.
   * Accessible by: HOD
   */
  @Patch(':id/hod-status')
  @Roles(Role.HOD)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'HOD approve or reject an application' })
  async updateHodStatus(
    @Param('id') id: string,
    @Req()
    req: Request & {
      user: { userId: string; departmentId?: string };
    },
    @Body() dto: UpdateStatusDto,
  ) {
    const user = req.user as { userId: string; departmentId: string };
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

    return this.applicationsService.updateHodStatus(
      id,
      user.userId,
      user.departmentId,
      dto,
      ipAddress,
    );
  }

  /**
   * GET /api/v1/applications/admin-queue
   * Get HOD-approved applications ready for provisioning.
   * Accessible by: CC_ADMIN
   */
  @Get('admin-queue')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get approved applications for CC Admin provisioning',
  })
  async findAdminQueue() {
    return this.applicationsService.findForCcAdmin();
  }

  // ═══════════════════════════════════════════════════════
  // CC Admin — User Lifecycle Management Endpoints
  // (MUST be above :id route to avoid NestJS treating 'admin' as :id)
  // ═══════════════════════════════════════════════════════

  /**
   * GET /api/v1/applications/admin/active
   * Get all PROVISIONED (Flag 1) users.
   */
  @Get('admin/active')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all active/provisioned users' })
  async findActiveUsers() {
    return this.applicationsService.findActiveUsers();
  }

  /**
   * GET /api/v1/applications/admin/suspended
   * Get all SUSPENDED users.
   */
  @Get('admin/suspended')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all suspended users' })
  async findSuspendedUsers() {
    return this.applicationsService.findSuspendedUsers();
  }

  /**
   * GET /api/v1/applications/admin/archived
   * Get all ARCHIVED users.
   */
  @Get('admin/archived')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all archived users' })
  async findArchivedUsers() {
    return this.applicationsService.findArchivedUsers();
  }

  /**
   * GET /api/v1/applications/admin/quota-stats
   * Get storage quota statistics.
   */
  @Get('admin/quota-stats')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get quota allocation statistics' })
  async getQuotaStats() {
    return this.applicationsService.getQuotaStats();
  }

  /**
   * GET /api/v1/applications/admin/audit-logs
   * Get audit logs (paginated).
   */
  @Get('admin/audit-logs')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(
    @Req() req: Request & { query: { page?: string; limit?: string } },
  ) {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    return this.applicationsService.getAuditLogs(page, limit);
  }

  /**
   * POST /api/v1/applications/admin/bulk-suspend
   * Bulk suspend multiple accounts.
   */
  @Post('admin/bulk-suspend')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Bulk suspend multiple accounts' })
  async bulkSuspend(
    @Req() req: Request & { user: { userId: string } },
    @Body() body: { applicationIds: string[]; remarks?: string },
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    return this.applicationsService.bulkSuspend(body.applicationIds, req.user.userId, body.remarks || '', ipAddress);
  }

  /**
   * POST /api/v1/applications/admin/bulk-archive
   * Bulk archive multiple accounts.
   */
  @Post('admin/bulk-archive')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Bulk archive multiple accounts' })
  async bulkArchive(
    @Req() req: Request & { user: { userId: string } },
    @Body() body: { applicationIds: string[]; remarks?: string },
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    return this.applicationsService.bulkArchive(body.applicationIds, req.user.userId, body.remarks || '', ipAddress);
  }

  /**
   * POST /api/v1/applications/lookup-email
   * Secure email domain lookup — user finds their @bhu.ac.in email.
   * Requires alternate email + name verification.
   */
  @Post('lookup-email')
  @ApiOperation({ summary: 'Lookup BHU email by alternate email (secure)' })
  async lookupBhuEmail(
    @Body() body: { alternateEmail: string; firstName: string; lastName: string },
  ) {
    return this.applicationsService.lookupBhuEmail(body.alternateEmail, body.firstName, body.lastName);
  }

  /**
   * GET /api/v1/applications/:id/history
   * Get the audit log timeline for a specific application.
   * Accessible by: any authenticated user (permission checked in service).
   */
  @Get(':id/history')
  @ApiOperation({ summary: 'Get application audit history timeline' })
  async getApplicationHistory(@Param('id') id: string) {
    return this.applicationsService.getApplicationHistory(id);
  }

  /**
   * GET /api/v1/applications/:id
   * Get a single application by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get application details by ID' })
  async findOne(@Param('id') id: string) {
    return this.applicationsService.findById(id);
  }

  /**
   * GET /api/v1/applications/:id/photo
   * Download the uploaded photo for the application.
   */
  @Get(':id/photo')
  @ApiOperation({ summary: 'Get the application photo' })
  async getPhoto(@Param('id') id: string, @Req() req: Request & { user: { userId: string; role: string; departmentId?: string } }, @Res() res: Response) {
    const app = await this.applicationsService.findById(id);
    
    // Check permissions
    if (req.user.role === 'APPLICANT' && app.applicantId !== req.user.userId) {
      throw new ForbiddenException('You can only view your own applications');
    }
    if (req.user.role === 'HOD' && app.departmentId !== req.user.departmentId) {
      throw new ForbiddenException('You can only view applications from your department');
    }

    if (!app.photoStoragePath) {
      throw new NotFoundException('Photo not found');
    }

    try {
      const { createReadStream } = await import('fs');
      const fileStream = createReadStream(app.photoStoragePath);
      fileStream.pipe(res);
    } catch (error) {
      throw new NotFoundException('Photo file not found on disk');
    }
  }

  /**
   * GET /api/v1/applications/:id/signature
   * Download the uploaded signature for the application.
   */
  @Get(':id/signature')
  @ApiOperation({ summary: 'Get the application signature' })
  async getSignature(@Param('id') id: string, @Req() req: Request & { user: { userId: string; role: string; departmentId?: string } }, @Res() res: Response) {
    const app = await this.applicationsService.findById(id);
    
    // Check permissions
    if (req.user.role === 'APPLICANT' && app.applicantId !== req.user.userId) {
      throw new ForbiddenException('You can only view your own applications');
    }
    if (req.user.role === 'HOD' && app.departmentId !== req.user.departmentId) {
      throw new ForbiddenException('You can only view applications from your department');
    }

    if (!app.signatureStoragePath) {
      throw new NotFoundException('Signature not found');
    }

    try {
      const { createReadStream } = await import('fs');
      const fileStream = createReadStream(app.signatureStoragePath);
      fileStream.pipe(res);
    } catch (error) {
      throw new NotFoundException('Signature file not found on disk');
    }
  }

  /**
   * GET /api/v1/applications/:id/approved-pdf
   * Download the finalized, digitally signed PDF.
   * Available to: the applicant (own app), HOD (own department), CC_ADMIN (any).
   */
  @Get(':id/approved-pdf')
  @ApiOperation({ summary: 'Download the approved, digitally signed PDF' })
  async getApprovedPdf(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string; role: string; departmentId?: string } },
    @Res() res: Response,
  ) {
    const app = await this.applicationsService.findById(id);

    // Permission checks
    if (req.user.role === 'APPLICANT' && app.applicantId !== req.user.userId) {
      throw new ForbiddenException('You can only download your own application PDFs');
    }
    if (req.user.role === 'HOD' && app.departmentId !== req.user.departmentId) {
      throw new ForbiddenException('You can only download PDFs from your department');
    }

    const pdfPath = (app as unknown as { approvedPdfPath: string | null }).approvedPdfPath;

    if (!pdfPath) {
      throw new NotFoundException('Approved PDF not yet generated. Application may not be approved yet.');
    }

    try {
      const { createReadStream, existsSync } = await import('fs');
      if (!existsSync(pdfPath)) {
        throw new NotFoundException('Approved PDF file not found on disk');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${app.trackingId}_Approved.pdf"`,
      );

      const fileStream = createReadStream(pdfPath);
      fileStream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('Failed to stream PDF file');
    }
  }

  /**
   * PATCH /api/v1/applications/:id/suspend
   * Suspend a provisioned account.
   */
  @Patch(':id/suspend')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Suspend a provisioned account' })
  async suspendApplication(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
    @Body() body: { remarks?: string },
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    return this.applicationsService.suspendApplication(id, req.user.userId, body.remarks || '', ipAddress);
  }

  /**
   * PATCH /api/v1/applications/:id/archive
   * Archive a suspended or provisioned account.
   */
  @Patch(':id/archive')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Archive an account (data retained per IT policy)' })
  async archiveApplication(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
    @Body() body: { remarks?: string },
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    return this.applicationsService.archiveApplication(id, req.user.userId, body.remarks || '', ipAddress);
  }

  /**
   * PATCH /api/v1/applications/:id/reactivate
   * Reactivate a suspended account.
   */
  @Patch(':id/reactivate')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Reactivate a suspended account' })
  async reactivateApplication(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
    @Body() body: { remarks?: string },
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    return this.applicationsService.reactivateApplication(id, req.user.userId, body.remarks || '', ipAddress);
  }

  /**
   * POST /api/v1/applications/:id/reset-password
   * Reset password for a provisioned account (secure, admin only).
   */
  @Post(':id/reset-password')
  @Roles(Role.CC_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Reset password for a provisioned account' })
  async resetPassword(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    return this.applicationsService.resetPassword(id, req.user.userId, ipAddress);
  }
}


