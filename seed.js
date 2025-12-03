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
    { id: 1, name: 'Travel' },
    { id: 2, name: 'Entertainment' },
    { id: 3, name: 'Shopping' },
    { id: 4, name: 'Utilities' },
    { id: 5, name: 'Healthcare' },
    { id: 6, name: 'Education' },
    { id: 7, name: 'Groceries' },
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