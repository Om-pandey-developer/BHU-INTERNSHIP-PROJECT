import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';

/**
 * DTO for HOD approval/rejection of an application.
 */
export class UpdateStatusDto {
  @ApiProperty({
    enum: ['APPROVED_HOD', 'REJECTED_HOD'],
    example: 'APPROVED_HOD',
  })
  @IsEnum(ApplicationStatus)
  @IsNotEmpty()
  status: ApplicationStatus;

  @ApiPropertyOptional({
    example: 'Verified - student credentials are valid.',
    description: 'Mandatory remarks for rejection, optional for approval',
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
