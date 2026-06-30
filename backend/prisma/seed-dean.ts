import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Dean...');
  const passwordHash = await argon2.hash('password123');

  const deanUser = await prisma.user.upsert({
    where: { alternateEmail: 'dean@bhu.ac.in' },
    update: {
      passwordHash,
      role: 'DEAN',
    },
    create: {
      alternateEmail: 'dean@bhu.ac.in',
      firstName: 'Test',
      lastName: 'Dean',
      passwordHash,
      role: 'DEAN',
    },
  });

  console.log('Dean user seeded:', deanUser.alternateEmail);

  // Assign this Dean to Computer Science department
  const csDept = await prisma.department.findUnique({
    where: { code: 'COMP_SCI' },
  });

  if (csDept) {
    await prisma.department.update({
      where: { id: csDept.id },
      data: {
        deanId: deanUser.id,
      },
    });
    console.log('Dean assigned to Computer Science (COMP_SCI) department.');
  } else {
    console.log('Computer Science department not found!');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
