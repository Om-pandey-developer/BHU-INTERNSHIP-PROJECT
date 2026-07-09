import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for submitting a reapply request after HOD rejection.
 */
export class CreateReapplyRequestDto {
  @ApiProperty({ description: 'ID of the rejected application' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ description: 'Reason for requesting re-application' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiProperty({ description: 'Roll/Enrollment No. for students, Employee ID for staff' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  rollEmployeeId: string;

  @ApiProperty({ description: 'Full name of the applicant' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  applicantName: string;
}
