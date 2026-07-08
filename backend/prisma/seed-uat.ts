import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding UAT Environment with Dummy Accounts...');

  // Create Departments
  const deptCS = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: { code: 'CS', name: 'Computer Science' },
  });

  // Create HOD for UAT
  await prisma.user.upsert({
    where: { alternateEmail: 'hod.cs.uat@bhu.ac.in' },
    update: {},
    create: {
      id: 'uat-hod-1',
      alternateEmail: 'hod.cs.uat@bhu.ac.in',
      role: 'HOD',
      passwordHash: 'password123', // Assume hashed in real scenario or bypassed for UAT
      firstName: 'UAT',
      lastName: 'HOD',
      departmentId: deptCS.id
    },
  });

  // Create Admin for UAT
  await prisma.user.upsert({
    where: { alternateEmail: 'admin.uat@bhu.ac.in' },
    update: {},
    create: {
      id: 'uat-admin-1',
      alternateEmail: 'admin.uat@bhu.ac.in',
      role: 'CC_ADMIN',
      passwordHash: 'password123',
      firstName: 'UAT',
      lastName: 'Admin',
    },
  });

  // Create 5 Dummy Applicants
  for (let i = 1; i <= 5; i++) {
    await prisma.user.upsert({
      where: { alternateEmail: `applicant${i}.uat@gmail.com` },
      update: {},
      create: {
        id: `uat-app-${i}`,
        alternateEmail: `applicant${i}.uat@gmail.com`,
        role: 'APPLICANT',
        passwordHash: 'password123',
        firstName: 'UAT',
        lastName: `Applicant ${i}`,
      },
    });
  }

  console.log('UAT Seeding completed successfully. Ready for manual testing.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
