import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Cloudflare Turnstile CAPTCHA token' })
  @IsString()
  @IsOptional()
  captchaToken?: string;

  @ApiPropertyOptional({ description: 'SVG CAPTCHA input value' })
  @IsString()
  @IsOptional()
  captchaValue?: string;
}
