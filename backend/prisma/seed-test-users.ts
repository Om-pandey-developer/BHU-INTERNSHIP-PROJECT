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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
