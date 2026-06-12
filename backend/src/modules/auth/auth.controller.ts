import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { OtpService } from './otp.service';
import { TurnstileService } from './turnstile.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly turnstileService: TurnstileService,
  ) {}

  /**
   * POST /api/v1/auth/login
   * Authenticates user and returns JWT tokens.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/v1/auth/send-otp
   * Public endpoint — verifies Turnstile CAPTCHA and sends an OTP
   * to the provided email for registration verification.
   * Rate-limited: max 3 requests per 60 seconds per IP.
   */
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send email verification OTP' })
  async sendOtp(@Body() dto: SendOtpDto) {
    // 1. Verify Turnstile CAPTCHA (skipped in dev if not configured)
    await this.turnstileService.verify(dto.captchaToken);

    // 2. Generate and send OTP
    await this.otpService.generateAndSend(dto.email);

    return { message: 'Verification code sent to your email.' };
  }

  /**
   * POST /api/v1/auth/refresh
   * Refreshes the access token using the refresh token.
   * Requires a valid JWT in the Authorization header.
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: Request & { user: { userId: string } },
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshTokens(req.user.userId, refreshToken);
  }

  /**
   * POST /api/v1/auth/logout
   * Invalidates the refresh token, ending the session.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@Req() req: Request & { user: { userId: string } }) {
    return this.authService.logout(req.user.userId);
  }
}
