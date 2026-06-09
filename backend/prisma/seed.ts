import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed departments into the database.
 * IDs and names match exactly with the frontend department list.
 */
async function main() {
  const departments = [
    { id: 'dept-cs', code: 'COMP_SCI', name: 'Computer Science' },
    { id: 'dept-phy', code: 'PHYSICS', name: 'Physics' },
    { id: 'dept-chem', code: 'CHEMISTRY', name: 'Chemistry' },
    { id: 'dept-math', code: 'MATHEMATICS', name: 'Mathematics' },
    { id: 'dept-bio', code: 'BIO_SCI', name: 'Biological Sciences' },
    { id: 'dept-eng', code: 'ENGLISH', name: 'English' },
    { id: 'dept-hist', code: 'HISTORY', name: 'History' },
    { id: 'dept-eco', code: 'ECONOMICS', name: 'Economics' },
    { id: 'dept-law', code: 'LAW', name: 'Law' },
    { id: 'dept-med', code: 'MED_SCI', name: 'Medical Sciences' },
    { id: 'dept-edu', code: 'EDUCATION', name: 'Education' },
    { id: 'dept-mech', code: 'MECH_ENG', name: 'Mechanical Engineering' },
    { id: 'dept-civil', code: 'CIVIL_ENG', name: 'Civil Engineering' },
    { id: 'dept-elec', code: 'ELEC_ENG', name: 'Electrical Engineering' },
  ];

  console.log('🌱 Seeding departments...');

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: { code: dept.code, name: dept.name },
      create: dept,
    });
    console.log(`  ✔ ${dept.name} (${dept.id})`);
  }

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
