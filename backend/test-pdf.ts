import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PdfService } from './src/modules/pdf/pdf.service';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const pdfService = app.get(PdfService);
  const prisma = app.get(PrismaService);

  // We will pass fake data directly to the generate function by mocking prisma.application.findUnique
  prisma.application.findUnique = jest.fn().mockResolvedValue({
    id: 'test-123',
    trackingId: 'TEST-TRACKING',
    applicantId: 'applicant-1',
    departmentId: 'dept-1',
    status: 'APPROVED_HOD',
    photoStoragePath: '',
    signatureStoragePath: '',
    createdAt: new Date(),
    applicantDetails: {
      name: 'mnb bnm',
      department: 'Computer Science',
      faculty: 'hcjlhsd',
      mobileNo: '1111111111',
      dateOfBirth: '2006-03-02',
      category: 'GROUP_A_OFFICER',
      designation: 'deygdyeg',
      typeOfEmployment: 'Permanent',
      dateOfAppointment: '2026-06-28',
      employeeId: '548488',
      nationality: 'India',
      dateOfRetirement: '2026-07-01',
      emailChoice1: 'VTF^%O&^*I:(6',
      emailChoice2: 'OUFV{("O}|',
      emailChoice3: 'H*OON}<"',
      alternateEmail: 'bnm@gmail.com'
    },
    applicant: {
      firstName: 'mnb',
      lastName: 'bnm',
      alternateEmail: 'bnm@gmail.com'
    },
    department: { name: 'Computer Science' },
    hod: { firstName: 'HOD', lastName: 'Name' }
  });

  console.log('Generating test PDF...');
  const pdfPath = await pdfService.generateApprovedPdf(
    'test-123',
    '', // hod signature path
    'HOD Name',
    'ABCDEF1234567890',
    new Date()
  );
  console.log('PDF Generated at:', pdfPath);
  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
