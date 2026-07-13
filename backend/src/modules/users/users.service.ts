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
import { Role } from '@prisma/client';
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
    const where = role ? { role: role as Role } : {};

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

  /**
   * Upload/update the HOD's signature image path.
   * Deletes the old file if one existed.
   */
  async uploadSignature(userId: string, filePath: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { signatureStoragePath: true },
    });

    // Delete old signature file if it exists
    if (user?.signatureStoragePath) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(user.signatureStoragePath)) {
          fs.unlinkSync(user.signatureStoragePath);
        }
      } catch {
        this.logger.warn(`Failed to delete old signature: ${user.signatureStoragePath}`);
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { signatureStoragePath: filePath },
    });

    this.logger.log(`HOD ${userId} uploaded signature: ${filePath}`);
    return { message: 'Signature uploaded successfully', hasSignature: true };
  }

  /**
   * Check whether the HOD has uploaded a signature.
   */
  async getSignatureStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { signatureStoragePath: true },
    });

    return { hasSignature: !!user?.signatureStoragePath };
  }

  /**
   * Get the actual file path of the HOD's signature (internal use).
   */
  async getSignaturePath(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { signatureStoragePath: true },
    });

    return user?.signatureStoragePath || null;
  }

  /**
   * Fetch users by an array of roles.
   */
  async getUsersByRoles(roles: Role[]) {
    return this.prisma.user.findMany({
      where: { role: { in: roles } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bhuEmail: true,
        alternateEmail: true,
        role: true,
        departmentId: true,
        roleExpiryDate: true,
      },
    });
  }

  /**
   * Create an admin user (HOD/Dean) directly.
   */
  async createAdminUser(data: any) {
    // ── Step 1: Check for duplicate emails ──
    const existingAlternate = await this.prisma.user.findUnique({
      where: { alternateEmail: data.alternateEmail },
    });
    if (existingAlternate) {
      throw new ConflictException(`An account with alternate email ${data.alternateEmail} already exists.`);
    }

    if (data.bhuEmail) {
      const existingBhu = await this.prisma.user.findUnique({
        where: { bhuEmail: data.bhuEmail },
      });
      if (existingBhu) {
        throw new ConflictException(`An account with BHU email ${data.bhuEmail} already exists.`);
      }
    }

    // Generate a random temporary password hash since they will reset it via the token
    const passwordHash = await argon2.hash(Math.random().toString(36).slice(-8));

    return this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        alternateEmail: data.alternateEmail,
        bhuEmail: data.bhuEmail,
        role: data.role,
        departmentId: data.departmentId,
        roleExpiryDate: data.roleExpiryDate,
        passwordHash,
        requiresPasswordChange: true,
      },
    });
  }

  /**
   * Update a user's details.
   */
  async updateUser(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Save a password reset token. (We use refreshToken field or create a new one. 
   * Since we don't have a resetToken field in schema, we will reuse refreshToken for this purpose temporarily, 
   * or preferably, we should add a resetToken field to Prisma schema.
   * Wait, let's just use refreshToken for now, or add resetToken). 
   * Actually, it's better to add resetToken to the schema in the next phase, but for now we can store it in refreshToken.
   */
  async savePasswordResetToken(id: string, token: string) {
    const hashedToken = await argon2.hash(token);
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken: hashedToken },
    });
  }
}

