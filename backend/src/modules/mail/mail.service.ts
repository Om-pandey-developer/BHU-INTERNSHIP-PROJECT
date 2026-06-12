import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * MailService handles sending emails via SMTP (Brevo or any SMTP provider).
 *
 * Dev mode fallback: If SMTP_USER is a placeholder or NODE_ENV=development,
 * the OTP is logged to the console instead of sending an actual email.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private readonly isDev: boolean;

  constructor() {
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Dev mode: skip real email if credentials are placeholders
    this.isDev =
      nodeEnv === 'development' ||
      smtpUser === 'noreply@bhu.ac.in' ||
      smtpPass === 'your-smtp-password' ||
      !smtpUser ||
      !smtpPass;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  /**
   * Send a verification OTP email.
   * In dev mode, logs the OTP to the console instead.
   */
  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    if (this.isDev) {
      this.logger.warn(
        `[DEV MODE] OTP for ${email}: ${otp} (email not sent — configure SMTP for production)`,
      );
      return;
    }

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FFFBFE; border-radius: 16px; border: 1px solid #CAC4D0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 16px; background: #6750A4; border-radius: 12px;">
            <span style="color: white; font-size: 24px; font-weight: 700;">BHU</span>
          </div>
        </div>

        <h2 style="color: #1C1B1F; font-size: 20px; text-align: center; margin-bottom: 8px;">
          Email Verification
        </h2>
        <p style="color: #79747E; font-size: 14px; text-align: center; margin-bottom: 24px;">
          Use the code below to verify your email address for the BHU Email Portal.
        </p>

        <div style="background: #EADDFF; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #21005D;">
            ${otp}
          </span>
        </div>

        <p style="color: #79747E; font-size: 12px; text-align: center; margin-bottom: 4px;">
          This code expires in <strong>5 minutes</strong>.
        </p>
        <p style="color: #79747E; font-size: 12px; text-align: center;">
          If you did not request this code, please ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #CAC4D0; margin: 24px 0;" />
        <p style="color: #CAC4D0; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} Banaras Hindu University — Computer Centre
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"BHU Email Portal" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your BHU Email Portal Verification Code',
        html: htmlBody,
      });
      this.logger.log(`Verification OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send a password reset OTP email.
   * Uses a different template/subject than the registration verification OTP.
   * In dev mode, logs the OTP to the console instead.
   */
  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    if (this.isDev) {
      this.logger.warn(
        `[DEV MODE] Password Reset OTP for ${email}: ${otp} (email not sent — configure SMTP for production)`,
      );
      return;
    }

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FFFBFE; border-radius: 16px; border: 1px solid #CAC4D0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 16px; background: #6750A4; border-radius: 12px;">
            <span style="color: white; font-size: 24px; font-weight: 700;">BHU</span>
          </div>
        </div>

        <h2 style="color: #1C1B1F; font-size: 20px; text-align: center; margin-bottom: 8px;">
          Password Reset Request
        </h2>
        <p style="color: #79747E; font-size: 14px; text-align: center; margin-bottom: 24px;">
          Use the code below to reset your password for the BHU Email Portal. If you did not request this, please ignore this email.
        </p>

        <div style="background: #EADDFF; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #21005D;">
            ${otp}
          </span>
        </div>

        <p style="color: #79747E; font-size: 12px; text-align: center; margin-bottom: 4px;">
          This code expires in <strong>5 minutes</strong>.
        </p>
        <p style="color: #79747E; font-size: 12px; text-align: center;">
          If you did not request a password reset, your account is safe — no action is needed.
        </p>

        <hr style="border: none; border-top: 1px solid #CAC4D0; margin: 24px 0;" />
        <p style="color: #CAC4D0; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} Banaras Hindu University — Computer Centre
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"BHU Email Portal" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'BHU Email Portal — Password Reset Code',
        html: htmlBody,
      });
      this.logger.log(`Password reset OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${email}`, error);
      throw error;
    }
  }
}
