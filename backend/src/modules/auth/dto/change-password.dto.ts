import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentSecurePassword123!', description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePassword123!', description: 'New password (min 8 chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
