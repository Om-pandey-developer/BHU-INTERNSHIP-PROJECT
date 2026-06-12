import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

/**
 * OtpService handles generation, storage, and verification of
 * email verification OTPs with Argon2 hashing and brute-force protection.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly expiryMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    this.expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
    this.maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
  }

  /**
   * Generate a cryptographically random 6-digit OTP, hash it with Argon2,
   * upsert into the database (replacing any previous OTP for this email),
   * and send the plaintext OTP via email.
   */
  async generateAndSend(email: string): Promise<void> {
    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash with Argon2 before storing
    const otpHash = await argon2.hash(otp);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + this.expiryMinutes * 60 * 1000);

    // Upsert: replace previous OTP for same email
    await this.prisma.otpVerification.upsert({
      where: { email },
      create: {
        email,
        otpHash,
        expiresAt,
        attempts: 0,
      },
      update: {
        otpHash,
        expiresAt,
        attempts: 0,
      },
    });

    // Send the plaintext OTP via email (or console in dev)
    await this.mailService.sendVerificationOtp(email, otp);

    this.logger.log(`OTP generated and sent for ${email}`);
  }

  /**
   * Verify an OTP against the stored hash.
   * Checks: existence → expiry → attempt limit → hash match.
   * On success: deletes the record.
   * On failure: increments attempts counter.
   */
  async verify(email: string, otp: string): Promise<void> {
    const record = await this.prisma.otpVerification.findUnique({
      where: { email },
    });

    if (!record) {
      throw new BadRequestException(
        'No OTP found for this email. Please request a new one.',
      );
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      // Clean up expired record
      await this.prisma.otpVerification.delete({ where: { email } });
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    // Check brute-force limit
    if (record.attempts >= this.maxAttempts) {
      await this.prisma.otpVerification.delete({ where: { email } });
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    // Verify Argon2 hash
    const isValid = await argon2.verify(record.otpHash, otp);

    if (!isValid) {
      // Increment attempt counter
      await this.prisma.otpVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    // Success — delete the used OTP record
    await this.prisma.otpVerification.delete({ where: { email } });
    this.logger.log(`OTP verified successfully for ${email}`);
  }
}
