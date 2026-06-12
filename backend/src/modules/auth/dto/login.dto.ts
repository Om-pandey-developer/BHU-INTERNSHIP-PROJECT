import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for user login requests.
 * Validated by the global ValidationPipe.
 */
export class LoginDto {
  @ApiProperty({
    example: 'student@gmail.com',
    description: 'Alternate (personal) email address used for login',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Account password (min 8 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Cloudflare Turnstile CAPTCHA token' })
  @IsString()
  @IsOptional()
  captchaToken?: string;
}
