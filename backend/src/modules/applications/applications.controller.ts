import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { Request } from 'express';
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
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `photo-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiOperation({ summary: 'Submit a new email account application' })
  @ApiConsumes('multipart/form-data')
  async create(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: CreateApplicationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /(jpeg|jpg|png)$/i }),
        ],
      }),
    )
    photo: Express.Multer.File,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

    return this.applicationsService.create(
      req.user.userId,
      dto,
      photo.path,
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
    const user = req.user as any;
    return this.applicationsService.findForHod(user.departmentId);
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
    const user = req.user as any;
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

  /**
   * GET /api/v1/applications/:id
   * Get a single application by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get application details by ID' })
  async findOne(@Param('id') id: string) {
    return this.applicationsService.findById(id);
  }
}
