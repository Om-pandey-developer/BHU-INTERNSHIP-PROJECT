import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * DTO for creating new users (registration or admin-created accounts).
 */
export class CreateUserDto {
  @ApiProperty({ example: 'student@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  alternateEmail: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Rahul' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ enum: Role, default: Role.APPLICANT })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ example: 'uuid-department-id' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'SPACE SCIENCES', description: 'Custom department name when "Others" is selected' })
  @IsString()
  @IsOptional()
  otherDepartmentName?: string;

  @ApiProperty({ example: '123456', description: 'Email verification OTP' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
