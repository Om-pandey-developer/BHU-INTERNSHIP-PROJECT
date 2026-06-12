import { Injectable, BadRequestException, Logger } from '@nestjs/common';

/**
 * TurnstileService handles server-side verification of Cloudflare Turnstile
 * CAPTCHA tokens. In dev mode (no secret key configured), verification is
 * skipped with a warning log.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.TURNSTILE_SECRET_KEY || '';
  }

  /**
   * Verify a Turnstile CAPTCHA token with Cloudflare's siteverify endpoint.
   * Skips verification in dev mode if no secret key is configured.
   */
  async verify(token: string | undefined): Promise<void> {
    // Dev mode: skip verification if no secret key
    if (!this.secretKey) {
      this.logger.warn(
        '[DEV MODE] Turnstile verification skipped — TURNSTILE_SECRET_KEY not configured',
      );
      return;
    }

    if (!token) {
      throw new BadRequestException('CAPTCHA verification is required.');
    }

    try {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: this.secretKey,
            response: token,
          }),
        },
      );

      const data = await response.json();

      if (!data.success) {
        this.logger.warn(`Turnstile verification failed: ${JSON.stringify(data['error-codes'])}`);
        throw new BadRequestException(
          'CAPTCHA verification failed. Please try again.',
        );
      }

      this.logger.log('Turnstile CAPTCHA verified successfully');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Turnstile verification request failed', error);
      throw new BadRequestException(
        'CAPTCHA verification service unavailable. Please try again.',
      );
    }
  }
}
