import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue(true);
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationOtp', () => {
    it('should send verification OTP email when not in dev mode', async () => {
      (service as any).isDev = false;

      await service.sendVerificationOtp('test@example.com', '123456');

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Your BHU Email Portal Verification Code',
          html: expect.stringContaining('123456'),
        }),
      );
    });

    it('should not send email in dev mode (logging instead)', async () => {
      (service as any).isDev = true;
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.sendVerificationOtp('test@example.com', '123456');

      expect(sendMailMock).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEV MODE] OTP for test@example.com: 123456'),
      );
    });
  });

  describe('sendPasswordResetOtp', () => {
    it('should send password reset OTP when not in dev mode', async () => {
      (service as any).isDev = false;

      await service.sendPasswordResetOtp('test2@example.com', '654321');

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test2@example.com',
          subject: 'BHU Email Portal — Password Reset Code',
          html: expect.stringContaining('654321'),
        }),
      );
    });

    it('should log in dev mode for password reset', async () => {
      (service as any).isDev = true;
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.sendPasswordResetOtp('test@example.com', '123456');

      expect(sendMailMock).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Password Reset OTP for test@example.com: 123456'),
      );
    });
  });

  describe('sendNewApplicationNotificationToHod', () => {
    it('should send new application notification when not in dev mode', async () => {
      (service as any).isDev = false;

      await service.sendNewApplicationNotificationToHod(
        'hod@bhu.ac.in',
        'John Doe',
        'TRK-123',
        'Computer Science'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'hod@bhu.ac.in',
          subject: 'New Application Pending: TRK-123 — BHU Email Portal',
          html: expect.stringContaining('John Doe'),
        }),
      );
    });
  });

  describe('sendApplicationStatusNotification', () => {
    it('should send approved status notification', async () => {
      (service as any).isDev = false;

      await service.sendApplicationStatusNotification(
        'applicant@example.com',
        'John',
        'TRK-123',
        'APPROVED_HOD',
        'Looks good'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          subject: 'Application Approved: TRK-123 — BHU Email Portal',
          html: expect.stringContaining('Looks good'),
        }),
      );
    });

    it('should send rejected status notification', async () => {
      (service as any).isDev = false;

      await service.sendApplicationStatusNotification(
        'applicant@example.com',
        'John',
        'TRK-123',
        'REJECTED',
        'Invalid document'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          subject: 'Application Update: TRK-123 — BHU Email Portal',
          html: expect.stringContaining('Invalid document'),
        }),
      );
    });
  });

  describe('sendProvisioningNotification', () => {
    it('should send provisioning notification with temp password', async () => {
      (service as any).isDev = false;

      await service.sendProvisioningNotification(
        'applicant@example.com',
        'Jane',
        'jane@bhu.ac.in',
        'temp-pass-123',
        'TRK-456',
        5
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          subject: 'Action Required: Official BHU Email Account Provisioned [Tracking ID: TRK-456]',
          html: expect.stringContaining('jane@bhu.ac.in'),
        }),
      );
      // Ensure temp password is in the email body
      const emailArgs = sendMailMock.mock.calls[0][0];
      expect(emailArgs.html).toContain('temp-pass-123');
      expect(emailArgs.html).toContain('5 GB');
    });
  });

  describe('sendHodWelcomeMail', () => {
    it('should send HOD welcome mail', async () => {
      (service as any).isDev = false;

      await service.sendHodWelcomeMail(
        'hod_personal@example.com',
        'Dr. Smith',
        'hod.cs@bhu.ac.in',
        'reset-token-xyz',
        'HOD'
      );

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'hod_personal@example.com',
          subject: 'Welcome to BHU Email Portal: Set your HOD Password',
          html: expect.stringContaining('Dr. Smith'),
        }),
      );
      const emailArgs = sendMailMock.mock.calls[0][0];
      expect(emailArgs.html).toContain('hod.cs@bhu.ac.in');
      expect(emailArgs.html).toContain('reset-token-xyz');
    });
  });
});
