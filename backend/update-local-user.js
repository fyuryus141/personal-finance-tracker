const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'muppetalert1@protonmail.com';
  const password = 'Panserainer@100';
  const tier = 'BUSINESS';

  console.log(`Updating user ${email} to ${tier} tier in local database...`);

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user
    const user = await prisma.user.updateMany({
      where: { email },
      data: {
        tier,
        password: hashedPassword,
        emailVerified: true
      },
    });

    if (user.count === 0) {
      console.log('❌ User not found in local database');
      return;
    }

    console.log(`✅ SUCCESS: Updated ${user.count} user(s) to ${tier} tier`);
    console.log('You can now test premium and business features on localhost');

  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();