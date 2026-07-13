import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OtpService } from './otp.service';
import * as fs from 'fs';
import * as path from 'path';

const privateKey = fs.existsSync(path.join(process.cwd(), 'keys', 'private.pem'))
  ? fs.readFileSync(path.join(process.cwd(), 'keys', 'private.pem'), 'utf8')
  : 'default-secret';

/**
 * AuthService handles:
 * 1. User login with Argon2 password verification
 * 2. JWT access token generation (15m expiry)
 * 3. JWT refresh token generation (7d expiry, stored hashed in DB)
 * 4. Token refresh flow
 * 5. Logout (invalidates refresh token)
 * 6. Password reset via OTP verification
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Authenticate a user with email and password.
   * Returns both access and refresh tokens on success.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by alternate email or BHU email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { alternateEmail: email },
          { bhuEmail: email }
        ]
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password using Argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.alternateEmail,
      user.role,
      user.firstName,
      user.lastName,
      user.departmentId,
    );

    // Hash and store the refresh token in the database
    const hashedRefreshToken = await argon2.hash(tokens.refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    this.logger.log(`User ${user.alternateEmail} logged in successfully`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.alternateEmail,
        bhuEmail: user.bhuEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
        requiresPasswordChange: user.requiresPasswordChange,
      },
    };
  }

  /**
   * Refresh the access token using a valid refresh token.
   */
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied — no active session');
    }

    // Verify the refresh token against the stored hash
    const isRefreshValid = await argon2.verify(user.refreshToken, refreshToken);
    if (!isRefreshValid) {
      throw new UnauthorizedException('Access denied — invalid refresh token');
    }

    // Generate new token pair
    const tokens = await this.generateTokens(
      user.id,
      user.alternateEmail,
      user.role,
      user.firstName,
      user.lastName,
      user.departmentId,
    );

    // Update stored refresh token hash
    const hashedRefreshToken = await argon2.hash(tokens.refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logout — invalidate the stored refresh token.
   */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    this.logger.log(`User ${userId} logged out`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Reset a user's password after OTP verification.
   *
   * Flow:
   * 1. Verify the OTP (delegates to OtpService — handles expiry, brute-force, hash match)
   * 2. Look up the user by alternateEmail
   * 3. Hash the new password with Argon2
   * 4. Update the passwordHash and invalidate the refreshToken (forces re-login)
   */
  async resetPassword(email: string, otp: string, newPassword: string) {
    // 1. Verify OTP — throws on invalid/expired/too-many-attempts
    await this.otpService.verify(email, otp);

    // 2. Find the user
    const user = await this.prisma.user.findUnique({
      where: { alternateEmail: email },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address.');
    }

    // 3. Hash the new password
    const passwordHash = await argon2.hash(newPassword);

    // 4. Update password and invalidate refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        refreshToken: null, // Force re-login
        requiresPasswordChange: false,
      },
    });

    this.logger.log(`Password reset successfully for ${email}`);
    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  /**
   * Change password for an already authenticated user.
   * 
   * Flow:
   * 1. Look up user by ID.
   * 2. Verify current password.
   * 3. Hash new password.
   * 4. Update database and invalidate refresh token (forces re-login).
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Verify current password
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password.');
    }

    // Check if new password is the same as the old one (optional but good practice)
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password.');
    }

    // Hash the new password
    const passwordHash = await argon2.hash(dto.newPassword);

    // Update password and invalidate refresh token
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshToken: null, // Force re-login
        requiresPasswordChange: false,
      },
    });

    this.logger.log(`Password changed successfully for user ${userId}`);
    return { message: 'Password changed successfully. Please log in with your new password.' };
  }

  /**
   * Generate an access token (short-lived) and refresh token (long-lived).
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    firstName: string,
    lastName: string,
    departmentId: string | null,
  ) {
    const payload = {
      sub: userId,
      email,
      role,
      firstName,
      lastName,
      departmentId,
    };

    // expiresIn must be a number (seconds) for @nestjs/jwt v11+
    const accessExpiry = parseInt(process.env.JWT_ACCESS_EXPIRY_SECONDS || '900', 10); // 15 minutes
    const refreshExpiry = parseInt(process.env.JWT_REFRESH_EXPIRY_SECONDS || '7200', 10); // 2 hours

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        privateKey: privateKey,
        algorithm: 'RS256',
        expiresIn: accessExpiry,
      }),
      this.jwtService.signAsync(payload, {
        privateKey: privateKey,
        algorithm: 'RS256',
        expiresIn: refreshExpiry,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
