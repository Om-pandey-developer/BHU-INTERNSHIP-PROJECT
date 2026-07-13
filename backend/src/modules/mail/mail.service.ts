import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { bhuVerificationEmail } from './emailTemplate';
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
    // Removed strict 'nodeEnv === development' check so you can test real emails locally
    // just by providing actual SMTP credentials in .env.
    this.isDev =
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

    const htmlBody = bhuVerificationEmail({ otp, expiryMinutes: 5 });

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

    const htmlBody = bhuVerificationEmail({ otp, expiryMinutes: 5 });

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
   * Includes the temporary password and official BHU branding.
   * In dev mode, logs to console instead.
   */
  async sendProvisioningNotification(
    applicantEmail: string,
    applicantName: string,
    bhuEmail: string,
    tempPassword: string,
    trackingId: string,
    quotaGB?: number,
  ): Promise<void> {
    if (this.isDev) {
      this.logger.warn(
        `[DEV MODE] Provisioning Notification → ${applicantEmail}: BHU Email ${bhuEmail} created for ${trackingId}. Password: ${tempPassword}`,
      );
      return;
    }

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        
        <!-- Header with BHU Logo & Colors -->
        <div style="background-color: #21005D; padding: 24px; text-align: center; border-bottom: 4px solid #FFB81C;">
          <img src="https://upload.wikimedia.org/wikipedia/en/4/47/Banaras_Hindu_University_Logo.svg" alt="BHU Logo" style="width: 80px; height: auto; margin-bottom: 12px;" />
          <h1 style="color: #FFFFFF; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 1px;">BANARAS HINDU UNIVERSITY</h1>
          <p style="color: #EADDFF; margin: 8px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Computer Centre</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 40px;">
          <h2 style="color: #1C1B1F; font-size: 22px; margin-top: 0; margin-bottom: 16px;">
            Official Email Account Provisioned
          </h2>
          
          <p style="color: #49454F; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Dear <strong>${applicantName}</strong>,<br><br>
            This is an automated notification from the Computer Centre, Banaras Hindu University. Your application for an institutional email account (Tracking ID: <strong>${trackingId}</strong>) has been processed and approved. Your official Google Workspace account is now ready for use.
          </p>

          <!-- Credentials Box -->
          <div style="background-color: #F4F6F8; border-left: 4px solid #6750A4; padding: 20px 24px; border-radius: 4px; margin-bottom: 32px;">
            <p style="color: #6750A4; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 12px;">Account Credentials</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #49454F; font-size: 14px; width: 140px;">Email Address:</td>
                <td style="padding: 8px 0; color: #1C1B1F; font-size: 16px; font-weight: 700;">${bhuEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #49454F; font-size: 14px;">Temporary Password:</td>
                <td style="padding: 8px 0; color: #1C1B1F; font-size: 16px; font-weight: 700; font-family: monospace; letter-spacing: 1px; background: #EADDFF; padding-left: 8px; border-radius: 4px;">${tempPassword}</td>
              </tr>
              ${quotaGB ? `
              <tr>
                <td style="padding: 8px 0; color: #49454F; font-size: 14px;">Storage Quota:</td>
                <td style="padding: 8px 0; color: #1C1B1F; font-size: 14px; font-weight: 600;">${quotaGB} GB</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Instructions -->
          <h3 style="color: #1C1B1F; font-size: 16px; margin-bottom: 12px;">Important Instructions:</h3>
          <ul style="color: #49454F; font-size: 14px; line-height: 1.6; padding-left: 20px; margin-bottom: 32px;">
            <li style="margin-bottom: 8px;">Go to <strong>mail.google.com</strong> or <strong>workspace.google.com</strong> to log in.</li>
            <li style="margin-bottom: 8px;">Enter the Email Address and Temporary Password provided above.</li>
            <li style="margin-bottom: 8px;">You will be prompted to create a new, strong password upon your first login. Please do so immediately.</li>
            <li>This email is for official academic and administrative communication only. Adhere to the university's IT policy.</li>
          </ul>

          <!-- Sign off -->
          <p style="color: #49454F; font-size: 15px; line-height: 1.6; margin-bottom: 0;">
            Regards,<br>
            <strong>Computer Centre Administrator</strong><br>
            Banaras Hindu University
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F4F6F8; padding: 20px; text-align: center; border-top: 1px solid #E0E0E0;">
          <p style="color: #79747E; font-size: 12px; margin: 0; line-height: 1.5;">
            This is an automatically generated authenticated email. Please do not reply to this email address.<br>
            For support, please contact the Computer Centre helpdesk.
          </p>
          <p style="color: #CAC4D0; font-size: 11px; margin: 12px 0 0 0;">
            © ${new Date().getFullYear()} Banaras Hindu University. All rights reserved.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: '"Computer Centre, BHU" <' + process.env.SMTP_USER + '>',
        to: applicantEmail,
        subject: `Action Required: Official BHU Email Account Provisioned [Tracking ID: ${trackingId}]`,
        html: htmlBody,
      });
      this.logger.log(`Provisioning notification sent to ${applicantEmail} for ${bhuEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send provisioning notification to ${applicantEmail}`, error);
    }
  }

  async sendHodWelcomeMail(
    personalEmail: string,
    name: string,
    designationEmail: string,
    resetToken: string,
    role: string = 'HOD',
  ) {
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #6750A4; padding: 24px; text-align: center;">
          <h2 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 500;">BHU Email Portal</h2>
          <p style="color: #EADDFF; margin: 8px 0 0 0; font-size: 14px;">Official Computer Centre Communication</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; background-color: #FFFFFF;">
          <h3 style="color: #1D1B20; font-size: 18px; margin-top: 0;">Welcome, ${name}</h3>
          
          <p style="color: #49454F; font-size: 15px; line-height: 1.6;">
            You have been assigned the role of <strong>${role}</strong> in the BHU Email Provisioning Portal.
            Your official designation email ID is:
          </p>

          <div style="background-color: #F3EDF7; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
            <p style="color: #21005D; font-size: 18px; font-weight: bold; margin: 0; letter-spacing: 0.5px;">${designationEmail}</p>
          </div>

          <p style="color: #49454F; font-size: 15px; line-height: 1.6;">
            Please click the secure button below to set up your password and access the HOD/Dean Dashboard.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #6750A4; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 100px; font-weight: 500; font-size: 15px; display: inline-block;">
              Set Password & Login
            </a>
          </div>

          <p style="color: #49454F; font-size: 13px; line-height: 1.6; margin-bottom: 0;">
            If you did not expect this invitation, please contact the Computer Centre Administrator.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F4F6F8; padding: 20px; text-align: center; border-top: 1px solid #E0E0E0;">
          <p style="color: #CAC4D0; font-size: 11px; margin: 12px 0 0 0;">
            © ${new Date().getFullYear()} Banaras Hindu University. All rights reserved.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: '"Computer Centre, BHU" <' + process.env.SMTP_USER + '>',
        to: personalEmail,
        subject: `Welcome to BHU Email Portal: Set your ${role} Password`,
        html: htmlBody,
      });
      this.logger.log(`Welcome notification sent to ${personalEmail} for ${designationEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome notification to ${personalEmail}`, error);
    }
  }
}
