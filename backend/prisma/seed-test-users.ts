import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('password123');

  // Create a test HOD
  const hod = await prisma.user.upsert({
    where: { alternateEmail: 'hod@bhu.ac.in' },
    update: {},
    create: {
      alternateEmail: 'hod@bhu.ac.in',
      passwordHash,
      firstName: 'Test',
      lastName: 'HOD',
      role: 'HOD',
      departmentId: 'dept-cs', // Computer Science
    },
  });
  console.log(`✅ Created Test HOD: ${hod.alternateEmail} / password123`);

  // Create a test Applicant
  const applicant = await prisma.user.upsert({
    where: { alternateEmail: 'student@bhu.ac.in' },
    update: {},
    create: {
      alternateEmail: 'student@bhu.ac.in',
      passwordHash,
      firstName: 'Test',
      lastName: 'Student',
      role: 'APPLICANT',
      departmentId: 'dept-cs', // Must be same as HOD for testing
    },
  });
  console.log(`✅ Created Test Applicant: ${applicant.alternateEmail} / password123`);

  // Create a test CC Admin
  const admin = await prisma.user.upsert({
    where: { alternateEmail: 'admin@bhu.ac.in' },
    update: {},
    create: {
      alternateEmail: 'admin@bhu.ac.in',
      passwordHash,
      firstName: 'CC',
      lastName: 'Admin',
      role: 'CC_ADMIN',
    },
  });
  console.log(`✅ Created Test CC Admin: ${admin.alternateEmail} / password123`);
  // Create dummy applications for HOD dashboard
  console.log('🌱 Seeding 40 dummy applications...');
  const categories = [
    { cat: 'GROUP_A_OFFICER', prefix: 'GA' },
    { cat: 'TEACHING_STAFF', prefix: 'TS' },
    { cat: 'NON_TEACHING_STAFF', prefix: 'NTS' },
    { cat: 'RESEARCH_SCHOLAR', prefix: 'RS' },
  ];

  const statuses: any[] = [
    'PENDING_HOD', 'PENDING_HOD', 'PENDING_HOD',
    'APPROVED_HOD', 'APPROVED_HOD', 'APPROVED_HOD',
    'REJECTED_HOD', 'REJECTED_HOD',
    'PROVISIONED', 'PROVISIONED'
  ];

  for (const category of categories) {
    for (let i = 0; i < 10; i++) {
      const status = statuses[i];
      const email = `dummy_${category.prefix.toLowerCase()}_${i}@bhu.ac.in`;
      
      const user = await prisma.user.upsert({
        where: { alternateEmail: email },
        update: {},
        create: {
          alternateEmail: email,
          passwordHash,
          firstName: 'Dummy',
          lastName: `${category.prefix} User ${i}`,
          role: 'APPLICANT',
          departmentId: 'dept-cs',
        }
      });

      // Check if application exists
      const existingApp = await prisma.application.findFirst({
        where: { applicantId: user.id }
      });

      if (!existingApp) {
        const applicantDetails: any = {
          category: category.cat,
          mobileNo: `98765${Math.floor(10000 + Math.random() * 90000)}`,
          facultyInstituteCentre: 'Computer Science',
          emailChoice: email,
          dateOfBirth: '1990-01-01',
        };
        
        if (category.cat === 'RESEARCH_SCHOLAR' || category.cat === 'POST_GRADUATE_STUDENT') {
          applicantDetails.programEnrolled = category.cat === 'RESEARCH_SCHOLAR' ? 'Ph.D.' : 'M.Sc.';
          applicantDetails.enrollmentNo = `EN${1000 + i}`;
        } else {
          applicantDetails.typeOfEmployment = 'Permanent';
          applicantDetails.designation = category.cat === 'TEACHING_STAFF' ? 'Assistant Professor' : 'Officer';
          applicantDetails.employeeId = `EMP${1000 + i}`;
        }

        const app = await prisma.application.create({
          data: {
            applicantId: user.id,
            departmentId: 'dept-cs',
            status,
            applicantDetails,
            photoStoragePath: '/dummy/photo.jpg',
            signatureStoragePath: '/dummy/signature.jpg',
            createdAt: new Date(Date.now() - Math.random() * 10000000000), // Random past date
          }
        });

        if (status === 'REJECTED_HOD') {
          await prisma.reapplyRequest.create({
            data: {
              applicationId: app.id,
              applicantId: user.id,
              reason: 'Mistake in form, please allow reapply.',
              rollNumber: applicantDetails.employeeId || applicantDetails.enrollmentNo || 'N/A',
              studentName: `${user.firstName} ${user.lastName}`,
              status: i % 2 === 0 ? 'PENDING' : 'APPROVED',
            }
          });
        }
      }
    }
  }
  console.log('✅ Created 40 Dummy Applications!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
