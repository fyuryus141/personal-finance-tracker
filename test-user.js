const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  const hashedPassword = await bcrypt.hash('testpassword', 10);
  const user = await prisma.user.create({
    data: {
      email: 'test@business.com',
      password: hashedPassword,
      name: 'Test Business User',
      tier: 'BUSINESS',
      emailVerified: true,
    },
  });
  console.log('Test user created:', user);
}

createTestUser().catch(console.error).finally(() => prisma.$disconnect());