import {
  Allow,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Categories of applicants that determine storage quota allocation.
 */
export enum ApplicantCategory {
  GROUP_A_OFFICER = 'GROUP_A_OFFICER',
  TEACHING_STAFF = 'TEACHING_STAFF',
  NON_TEACHING_STAFF = 'NON_TEACHING_STAFF',
  RESEARCH_SCHOLAR = 'RESEARCH_SCHOLAR',
  POST_GRADUATE_STUDENT = 'POST_GRADUATE_STUDENT',
  UNDER_GRADUATE_STUDENT = 'UNDER_GRADUATE_STUDENT',
}

/**
 * DTO for submitting a new email account application.
 * The photo file is handled separately via Multer (multipart/form-data).
 */
export class CreateApplicationDto {
  @ApiProperty({ example: 'uuid-department-id' })
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({
    enum: ApplicantCategory,
    example: ApplicantCategory.POST_GRADUATE_STUDENT,
  })
  @IsEnum(ApplicantCategory)
  @IsNotEmpty()
  category: ApplicantCategory;

  @ApiProperty({
    example: '{"enrollmentNo":"12345","course":"MCA"}',
    description:
      'Stringified JSON with category-specific details (enrollment, designation, etc.)',
  })
  @IsString()
  @IsNotEmpty()
  details: string;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  @Allow()
  photo?: any;
}
