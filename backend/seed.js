const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Update or create test@example.com as PREMIUM
  const user1 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: { tier: 'PREMIUM' },
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password: await bcrypt.hash('testpassword', 10),
      tier: 'PREMIUM',
      emailVerified: true,
    },
  });

  // Update or create test@business.com as BUSINESS
  const user2 = await prisma.user.upsert({
    where: { email: 'test@business.com' },
    update: { tier: 'BUSINESS' },
    create: {
      email: 'test@business.com',
      name: 'Test Business User',
      password: await bcrypt.hash('testpassword', 10),
      tier: 'BUSINESS',
      emailVerified: true,
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

  // Create sample budgets
  const budgets = [
    { name: 'Monthly Groceries', amount: 400, period: 'monthly', categoryId: 7 },
    { name: 'Monthly Entertainment', amount: 200, period: 'monthly', categoryId: 2 },
    { name: 'Monthly Utilities', amount: 150, period: 'monthly', categoryId: 4 },
  ];

  for (const budget of budgets) {
    await prisma.budget.upsert({
      where: { id: budgets.indexOf(budget) + 1 },
      update: {},
      create: {
        id: budgets.indexOf(budget) + 1,
        name: budget.name,
        amount: budget.amount,
        period: budget.period,
        categoryId: budget.categoryId,
        userId: 1,
      },
    });
  }

  // Create sample expenses to trigger budget alerts
  const expenses = [
    { amount: 350, description: 'Grocery shopping', date: new Date(), categoryId: 7 },
    { amount: 180, description: 'Movie tickets and dinner', date: new Date(), categoryId: 2 },
    { amount: 160, description: 'Electricity bill', date: new Date(), categoryId: 4 },
  ];

  for (const expense of expenses) {
    await prisma.expense.create({
      data: {
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        categoryId: expense.categoryId,
        userId: 1,
      },
    });
  }

  console.log('Seeded users, categories, budgets, and expenses');
  console.log('Test accounts:');
  console.log('- test@example.com: PREMIUM tier');
  console.log('- test@business.com: BUSINESS tier');
  console.log('Password for both: testpassword');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });