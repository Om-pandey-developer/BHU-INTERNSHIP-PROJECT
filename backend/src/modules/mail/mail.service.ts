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

  /**
   * Send notification to HOD when a new application is submitted.
   * In dev mode, logs to console instead.
   */
  async sendNewApplicationNotificationToHod(
    hodEmail: string,
    applicantName: string,
    trackingId: string,
    departmentName: string,
  ): Promise<void> {
    if (this.isDev) {
      this.logger.warn(
        `[DEV MODE] HOD Notification → ${hodEmail}: New application ${trackingId} from ${applicantName} (${departmentName})`,
      );
      return;
    }

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FFFBFE; border-radius: 16px; border: 1px solid #CAC4D0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 16px; background: #6750A4; border-radius: 12px;">
            <span style="color: white; font-size: 24px; font-weight: 700;">BHU</span>
          </div>
        </div>

        <h2 style="color: #1C1B1F; font-size: 20px; text-align: center; margin-bottom: 8px;">
          New Application Pending
        </h2>
        <p style="color: #79747E; font-size: 14px; text-align: center; margin-bottom: 24px;">
          A new email account application requires your review and approval.
        </p>

        <div style="background: #EADDFF; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #79747E; font-size: 13px;">Applicant</td>
              <td style="padding: 6px 0; color: #1C1B1F; font-size: 13px; font-weight: 600; text-align: right;">${applicantName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #79747E; font-size: 13px;">Tracking ID</td>
              <td style="padding: 6px 0; color: #6750A4; font-size: 13px; font-weight: 700; text-align: right;">${trackingId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #79747E; font-size: 13px;">Department</td>
              <td style="padding: 6px 0; color: #1C1B1F; font-size: 13px; font-weight: 600; text-align: right;">${departmentName}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/hod" 
             style="display: inline-block; padding: 12px 28px; background: #6750A4; color: white; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 600;">
            Review Application →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #CAC4D0; margin: 24px 0;" />
        <p style="color: #CAC4D0; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} Banaras Hindu University — Computer Centre
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"BHU Email Portal" <${process.env.SMTP_USER}>`,
        to: hodEmail,
        subject: `New Application Pending: ${trackingId} — BHU Email Portal`,
        html: htmlBody,
      });
      this.logger.log(`HOD notification sent to ${hodEmail} for ${trackingId}`);
    } catch (error) {
      this.logger.error(`Failed to send HOD notification to ${hodEmail}`, error);
      // Don't throw — notification failure should not block the main flow
    }
  }

  /**
   * Send status update notification to applicant when HOD approves/rejects.
   * In dev mode, logs to console instead.
   */
  async sendApplicationStatusNotification(
    applicantEmail: string,
    applicantName: string,
    trackingId: string,
    status: string,
    remarks?: string,
  ): Promise<void> {
    if (this.isDev) {
      this.logger.warn(
        `[DEV MODE] Status Notification → ${applicantEmail}: Application ${trackingId} status changed to ${status}`,
      );
      return;
    }

    const isApproved = status === 'APPROVED_HOD';
    const statusLabel = isApproved ? 'Approved by HOD' : 'Requires Attention';
    const statusColor = isApproved ? '#1B873E' : '#B3261E';
    const statusIcon = isApproved ? '✅' : '❌';
    const statusBg = isApproved ? '#D4F5DF' : '#F9DEDC';
    const nextStep = isApproved
      ? 'Your application has been forwarded to CC Admin for email provisioning. You will be notified once your @bhu.ac.in email is created.'
      : 'Please review the remarks below and consider re-submitting your application.';

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FFFBFE; border-radius: 16px; border: 1px solid #CAC4D0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 16px; background: #6750A4; border-radius: 12px;">
            <span style="color: white; font-size: 24px; font-weight: 700;">BHU</span>
          </div>
        </div>

        <h2 style="color: #1C1B1F; font-size: 20px; text-align: center; margin-bottom: 8px;">
          Application ${statusLabel}
        </h2>
        <p style="color: #79747E; font-size: 14px; text-align: center; margin-bottom: 24px;">
          Dear ${applicantName}, your application status has been updated.
        </p>

        <div style="background: ${statusBg}; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 28px;">${statusIcon}</span>
          <p style="color: ${statusColor}; font-size: 16px; font-weight: 700; margin-top: 8px;">
            ${status.replace(/_/g, ' ')}
          </p>
          <p style="color: #79747E; font-size: 12px; margin-top: 4px;">
            Tracking ID: <strong>${trackingId}</strong>
          </p>
        </div>

        ${remarks ? `
        <div style="background: #F5F0FF; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #6750A4;">
          <p style="color: #6750A4; font-size: 12px; font-weight: 600; margin-bottom: 6px;">HOD Remarks</p>
          <p style="color: #1C1B1F; font-size: 14px;">${remarks}</p>
        </div>
        ` : ''}

        <p style="color: #79747E; font-size: 13px; text-align: center; margin-bottom: 24px;">
          ${nextStep}
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/applicant" 
             style="display: inline-block; padding: 12px 28px; background: #6750A4; color: white; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 600;">
            View My Applications →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #CAC4D0; margin: 24px 0;" />
        <p style="color: #CAC4D0; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} Banaras Hindu University — Computer Centre
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"BHU Email Portal" <${process.env.SMTP_USER}>`,
        to: applicantEmail,
        subject: `Application ${isApproved ? 'Approved' : 'Update'}: ${trackingId} — BHU Email Portal`,
        html: htmlBody,
      });
      this.logger.log(`Status notification sent to ${applicantEmail} for ${trackingId}`);
    } catch (error) {
      this.logger.error(`Failed to send status notification to ${applicantEmail}`, error);
    }
  }

  /**
   * Send provisioning notification to applicant when CC Admin provisions the email.
   * In dev mode, logs to console instead.
   */
  async sendProvisioningNotification(
    applicantEmail: string,
    applicantName: string,
    bhuEmail: string,
    trackingId: string,
    quotaGB?: number,
  ): Promise<void> {
    if (this.isDev) {
      this.logger.warn(
        `[DEV MODE] Provisioning Notification → ${applicantEmail}: BHU Email ${bhuEmail} created for ${trackingId}`,
      );
      return;
    }

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FFFBFE; border-radius: 16px; border: 1px solid #CAC4D0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 16px; background: #6750A4; border-radius: 12px;">
            <span style="color: white; font-size: 24px; font-weight: 700;">BHU</span>
          </div>
        </div>

        <h2 style="color: #1C1B1F; font-size: 20px; text-align: center; margin-bottom: 8px;">
          🎉 Email Account Created!
        </h2>
        <p style="color: #79747E; font-size: 14px; text-align: center; margin-bottom: 24px;">
          Congratulations ${applicantName}! Your BHU institutional email has been provisioned.
        </p>

        <div style="background: #D4F5DF; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #1B873E30;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #79747E; font-size: 13px;">BHU Email</td>
              <td style="padding: 8px 0; color: #1B873E; font-size: 15px; font-weight: 700; text-align: right;">${bhuEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #79747E; font-size: 13px;">Tracking ID</td>
              <td style="padding: 8px 0; color: #1C1B1F; font-size: 13px; font-weight: 600; text-align: right;">${trackingId}</td>
            </tr>
            ${quotaGB ? `
            <tr>
              <td style="padding: 8px 0; color: #79747E; font-size: 13px;">Storage Quota</td>
              <td style="padding: 8px 0; color: #1C1B1F; font-size: 13px; font-weight: 600; text-align: right;">${quotaGB} GB</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <p style="color: #79747E; font-size: 13px; text-align: center; margin-bottom: 24px;">
          You will receive a separate email from Google Workspace with your login credentials. 
          Use your new @bhu.ac.in email for all official university communications.
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
        to: applicantEmail,
        subject: `Your BHU Email is Ready: ${bhuEmail} — BHU Email Portal`,
        html: htmlBody,
      });
      this.logger.log(`Provisioning notification sent to ${applicantEmail} for ${bhuEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send provisioning notification to ${applicantEmail}`, error);
    }
  }
}
