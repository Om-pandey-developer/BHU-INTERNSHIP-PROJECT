import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
