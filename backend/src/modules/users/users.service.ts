import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * UsersService manages user CRUD operations.
 * Passwords are hashed with Argon2 before storage.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new user account.
   * Throws ConflictException if email already exists.
   */
  async create(createUserDto: CreateUserDto) {
    const { alternateEmail, password, firstName, lastName, role, departmentId } =
      createUserDto;

    // Check for duplicate email
    const existing = await this.prisma.user.findUnique({
      where: { alternateEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password using Argon2
    const passwordHash = await argon2.hash(password);

    const user = await this.prisma.user.create({
      data: {
        alternateEmail,
        passwordHash,
        firstName,
        lastName,
        role: role || 'APPLICANT',
        departmentId,
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
