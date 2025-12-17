const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setPassword() {
  try {
    const hashedPassword = await bcrypt.hash('Panserainer@100', 10);
    const user = await prisma.user.update({
      where: { email: 'muppetalert1@protonmail.com' },
      data: { password: hashedPassword },
    });
    console.log('Password set for user:', user.email);
  } catch (error) {
    console.error('Error setting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setPassword();