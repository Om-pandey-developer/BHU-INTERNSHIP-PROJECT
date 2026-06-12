import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { OtpService } from '../auth/otp.service';

/**
 * UsersService manages user CRUD operations.
 * Passwords are hashed with Argon2 before storage.
 * OTP verification is enforced during registration.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Register a new user account.
   * Verifies the email OTP before creating the user.
   * Throws ConflictException if email already exists.
   * Throws BadRequestException if departmentId is provided but doesn't exist.
   * Throws BadRequestException if OTP is invalid or expired.
   */
  async create(createUserDto: CreateUserDto) {
    const { alternateEmail, password, firstName, lastName, role, otp } =
      createUserDto;

    // Normalize departmentId: empty string → undefined (stored as null)
    const departmentId = createUserDto.departmentId?.trim() || undefined;

    // ── Step 1: Verify OTP ──
    await this.otpService.verify(alternateEmail, otp);

    // ── Step 2: Check for duplicate email ──
    const existing = await this.prisma.user.findUnique({
      where: { alternateEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // ── Step 3: Validate departmentId exists in the Department table if provided ──
    if (departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        throw new BadRequestException(
          `Department with ID "${departmentId}" does not exist. Please select a valid department.`,
        );
      }
    }

    // ── Step 4: Hash password using Argon2 ──
    const passwordHash = await argon2.hash(password);

    const user = await this.prisma.user.create({
      data: {
        alternateEmail,
        passwordHash,
        firstName,
        lastName,
        role: role || 'APPLICANT',
        departmentId: departmentId || null,
      },
      select: {
        id: true,
        alternateEmail: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        createdAt: true,
      },
    });

    this.logger.log(`New user registered: ${alternateEmail} (${user.role})`);
    return user;
  }

  /**
   * Find a user by their UUID.
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Exclude sensitive fields
    const { passwordHash, refreshToken, ...safeUser } = user;
    return safeUser;
  }

  /**
   * List all users with optional role filtering.
   */
  async findAll(role?: string) {
    const where = role ? { role: role as any } : {};

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        alternateEmail: true,
        bhuEmail: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
