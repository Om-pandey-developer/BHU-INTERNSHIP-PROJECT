import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/v1/users/register
   * Public endpoint for new user registration.
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * POST /api/v1/users/me/signature
   * HOD uploads their signature image.
   * Stored in a secured directory on disk.
   */
  @Post('me/signature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOD)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('signature', {
      limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
      storage: diskStorage({
        destination: process.env.SIGNATURE_DIR || './uploads/signatures',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `hod-sig-${uniqueSuffix}${extname(file.originalname)}`);
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
    }),
  )
  @ApiOperation({ summary: 'Upload HOD signature image' })
  @ApiConsumes('multipart/form-data')
  async uploadSignature(
    @Req() req: Request & { user: { userId: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('Signature file is required');
    }
    return this.usersService.uploadSignature(req.user.userId, file.path);
  }

  /**
   * GET /api/v1/users/me/signature
   * Check if the HOD has uploaded a signature & return status.
   */
  @Get('me/signature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOD)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check HOD signature upload status' })
  async getSignatureStatus(
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.usersService.getSignatureStatus(req.user.userId);
  }

  /**
   * GET /api/v1/users/me/signature/image
   * Stream the HOD's signature image for preview.
   */
  @Get('me/signature/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOD)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get HOD signature image' })
  async getSignatureImage(
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ) {
    const sigPath = await this.usersService.getSignaturePath(req.user.userId);
    if (!sigPath) {
      throw new NotFoundException('No signature uploaded');
    }

    try {
      const { createReadStream } = await import('fs');
      const fileStream = createReadStream(sigPath);
      fileStream.pipe(res);
    } catch {
      throw new NotFoundException('Signature file not found on disk');
    }
  }

  /**
   * GET /api/v1/users
   * List all users — CC Admin only.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CC_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all users (CC Admin only)' })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  async findAll(@Query('role') role?: string) {
    return this.usersService.findAll(role);
  }

  /**
   * GET /api/v1/users/:id
   * Get user details by ID — requires authentication.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user details by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
