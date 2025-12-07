const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUsers() {
  try {
    // Update test@example.com to PREMIUM
    const user1 = await prisma.user.updateMany({
      where: { email: 'test@example.com' },
      data: { tier: 'PREMIUM' },
    });

    // Update test@business.com to BUSINESS
    const user2 = await prisma.user.updateMany({
      where: { email: 'test@business.com' },
      data: { tier: 'BUSINESS' },
    });

    console.log('Updated users:');
    console.log('- test@example.com: PREMIUM');
    console.log('- test@business.com: BUSINESS');
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUsers();