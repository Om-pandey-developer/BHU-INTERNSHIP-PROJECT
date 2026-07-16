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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { OtpService } from './otp.service';
import { TurnstileService } from './turnstile.service';
import { CaptchaService } from './captcha.service';
import { Get } from '@nestjs/common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly turnstileService: TurnstileService,
    private readonly captchaService: CaptchaService,
  ) {}

  /**
   * GET /api/v1/auth/captcha
   * Generates an SVG Captcha and returns the image along with an encrypted token.
   */
  @Get('captcha')
  @ApiOperation({ summary: 'Generate SVG Captcha' })
  generateCaptcha() {
    return this.captchaService.generateCaptcha();
  }

  /**
   * POST /api/v1/auth/login
   * Authenticates user and returns JWT tokens.
   * Optionally verifies Turnstile CAPTCHA if token is provided.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() loginDto: LoginDto) {
    // Verify SVG CAPTCHA (Turnstile is commented out per user request)
    // await this.turnstileService.verify(loginDto.captchaToken);
    this.captchaService.verifyCaptcha(loginDto.captchaToken, loginDto.captchaValue);

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
    // 1. Verify SVG CAPTCHA (Turnstile commented out)
    // await this.turnstileService.verify(dto.captchaToken);
    this.captchaService.verifyCaptcha(dto.captchaToken, dto.captchaValue);

    // 2. Generate and send OTP
    await this.otpService.generateAndSend(dto.email);

    return { message: 'Verification code sent to your email.' };
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Public endpoint — verifies Turnstile CAPTCHA and sends a password
   * reset OTP to the provided email.
   * Rate-limited: max 3 requests per 60 seconds per IP.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send password reset OTP' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // 1. Verify SVG CAPTCHA (Turnstile commented out)
    // await this.turnstileService.verify(dto.captchaToken);
    this.captchaService.verifyCaptcha(dto.captchaToken, dto.captchaValue);

    // 2. Generate and send password reset OTP (uses distinct email template)
    await this.otpService.generateAndSendPasswordReset(dto.email);

    return { message: 'Password reset code sent to your email.' };
  }

  /**
   * POST /api/v1/auth/reset-password
   * Public endpoint — verifies OTP and resets the user's password.
   * Rate-limited: max 5 requests per 60 seconds per IP.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with OTP verification' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  /**
   * POST /api/v1/auth/change-password
   * Authenticated endpoint — changes the user's password.
   * Requires a valid JWT in the Authorization header.
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for authenticated user' })
  async changePassword(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, dto);
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
