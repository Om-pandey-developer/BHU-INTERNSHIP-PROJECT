import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as svgCaptcha from 'svg-captcha';

@Injectable()
export class CaptchaService {
  constructor(private readonly jwtService: JwtService) {}

  generateCaptcha() {
    // Generate an SVG captcha with noise
    const captcha = svgCaptcha.create({
      size: 6,
      ignoreChars: '0o1iLl',
      noise: 3,
      color: true,
      background: '#f8f9fa',
      width: 150,
      height: 50,
    });

    // Create a JWT containing the text (lowercase for case-insensitivity)
    const token = this.jwtService.sign(
      { captchaText: captcha.text.toLowerCase() },
      { expiresIn: '5m' },
    );

    return {
      svg: captcha.data,
      captchaToken: token,
    };
  }

  verifyCaptcha(token?: string, value?: string) {
    if (!token || !value) {
      throw new BadRequestException('CAPTCHA is required');
    }

    try {
      const payload = this.jwtService.verify(token);
      if (payload.captchaText !== value.toLowerCase()) {
        throw new BadRequestException('Invalid CAPTCHA');
      }
      return true;
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        throw new BadRequestException('CAPTCHA expired. Please refresh.');
      }
      throw new BadRequestException('Invalid or expired CAPTCHA');
    }
  }
}
