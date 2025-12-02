const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      tier: 'FREE',
    },
  });

  const categories = [
    { id: 1, name: 'Food' },
    { id: 2, name: 'Transportation' },
    { id: 3, name: 'Entertainment' },
    { id: 4, name: 'Utilities' },
    { id: 5, name: 'Healthcare' },
    { id: 6, name: 'Shopping' },
    { id: 7, name: 'Education' },
    { id: 8, name: 'Travel' },
    { id: 9, name: 'Groceries' },
    { id: 10, name: 'Dining Out' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        name: cat.name,
        userId: 1,
      },
    });
  }

  console.log('Seeded user and categories');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });