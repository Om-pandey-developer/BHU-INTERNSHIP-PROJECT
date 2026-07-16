import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OtpService } from './otp.service';
import { TurnstileService } from './turnstile.service';
import { MailModule } from '../mail/mail.module';
import { CaptchaService } from './captcha.service';
import * as fs from 'fs';
import * as path from 'path';

const privateKey = fs.existsSync(path.join(process.cwd(), 'keys', 'private.pem'))
  ? fs.readFileSync(path.join(process.cwd(), 'keys', 'private.pem'), 'utf8')
  : 'default-secret';
const publicKey = fs.existsSync(path.join(process.cwd(), 'keys', 'public.pem'))
  ? fs.readFileSync(path.join(process.cwd(), 'keys', 'public.pem'), 'utf8')
  : 'default-secret';

/**
 * AuthModule configures:
 * - PassportModule with JWT as the default strategy
 * - JwtModule for token signing and verification
 * - JwtStrategy for Passport-based token extraction
 * - OtpService for email OTP generation and verification
 * - TurnstileService for Cloudflare CAPTCHA verification
 * - MailModule for sending OTP emails
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      privateKey: privateKey,
      publicKey: publicKey,
      signOptions: {
        algorithm: 'RS256',
        expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRY_SECONDS || '900', 10), // 15 minutes in seconds
      },
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OtpService, TurnstileService, CaptchaService],
  exports: [AuthService, JwtModule, OtpService, CaptchaService],
})
export class AuthModule {}
