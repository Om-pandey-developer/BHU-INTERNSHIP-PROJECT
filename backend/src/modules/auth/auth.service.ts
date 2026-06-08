import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

/**
 * AuthService handles:
 * 1. User login with Argon2 password verification
 * 2. JWT access token generation (15m expiry)
 * 3. JWT refresh token generation (7d expiry, stored hashed in DB)
 * 4. Token refresh flow
 * 5. Logout (invalidates refresh token)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticate a user with email and password.
   * Returns both access and refresh tokens on success.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by alternate email
    const user = await this.prisma.user.findUnique({
      where: { alternateEmail: email },
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
   * Generate an access token (short-lived) and refresh token (long-lived).
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    firstName: string,
    lastName: string,
  ) {
    const payload = {
      sub: userId,
      email,
      role,
      firstName,
      lastName,
    };

    // expiresIn must be a number (seconds) for @nestjs/jwt v11+
    const accessExpiry = parseInt(process.env.JWT_ACCESS_EXPIRY_SECONDS || '900', 10); // 15 minutes
    const refreshExpiry = parseInt(process.env.JWT_REFRESH_EXPIRY_SECONDS || '604800', 10); // 7 days

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
        expiresIn: accessExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        expiresIn: refreshExpiry,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
