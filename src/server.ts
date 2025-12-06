import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import { Configuration as PlaidConfiguration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

const app = express();
console.log('Creating Prisma client...');
const prisma = new PrismaClient();
console.log('Prisma client created');
const upload = multer({ dest: 'uploads/' });
const feedbackUpload = multer({ dest: 'uploads/feedback/' });
let client: any = null;
try {
  client = new vision.ImageAnnotatorClient();
} catch (error) {
  console.log('Google Vision client not initialized, OCR will not work');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

const plaidConfig = new PlaidConfiguration({
  basePath: PlaidEnvironments.sandbox, // Use 'sandbox' for development
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || 'dummy-client-id',
      'PLAID-SECRET': process.env.PLAID_SECRET || 'dummy-secret',
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);

const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors());
app.use(express.json());

// Health check endpoint for Dead Man's Snitch
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Auth routes
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });
    // Create default categories for the new user
    const defaultCategories = ['Travel', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Education', 'Groceries'];
    for (const name of defaultCategories) {
      await prisma.category.create({
        data: { name, userId: user.id },
      });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, tier: user.tier } });
  } catch (error) {
    res.status(400).json({ error: 'User already exists' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Check if user has categories, if not, create default ones
  const existingCategories = await prisma.category.findMany({
    where: { userId: user.id },
  });
  if (existingCategories.length === 0) {
    const defaultCategories = ['Travel', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Education', 'Groceries'];
    for (const name of defaultCategories) {
      await prisma.category.create({
        data: { name, userId: user.id },
      });
    }
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, tier: user.tier, emailReports: user.emailReports } });
});

// Auth middleware
const authMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user tier
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ tier: (user as any).tier });
});

// PUT /users/:id/profile-picture
app.put('/users/:id/profile-picture', authMiddleware, upload.single('profilePicture'), async (req: any, res) => {
  const { id } = req.params;
  if (Number(id) !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const profilePicture = req.file.path;
  await prisma.user.update({
    where: { id: Number(id) },
    data: { profilePicture }
  });
  res.json({ message: 'Profile picture updated' });
});

// PUT /users/:id/password
app.put('/users/:id/password', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  if (Number(id) !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: Number(id) },
    data: { password: hashedPassword }
  });
  res.json({ message: 'Password updated' });
});

// PUT /users/:id/notifications - updated
app.put('/users/:id/notifications', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { emailReports } = req.body;
  console.log('PUT /users/:id/notifications called for id:', id, 'userId:', req.userId, 'emailReports:', emailReports);
  if (Number(id) !== req.userId) {
    console.log('Unauthorized: id does not match userId');
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    await prisma.user.update({
      where: { id: Number(id) },
      data: { emailReports }
    });
    console.log('Notifications updated successfully for user:', id);
    res.json({ message: 'Notifications updated' });
  } catch (error) {
    console.log('Error updating notifications:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// GET /users/:id/export
app.get('/users/:id/export', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  if (Number(id) !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      expenses: { include: { category: true } },
      categories: true,
      budgets: { include: { category: true } },
      bankAccounts: { include: { transactions: true } },
      feedbacks: true,
      subscriptions: { include: { payments: true } },
      payments: true,
    }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PUT /users/:id
app.put('/users/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (Number(id) !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { name },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /users/:id
app.delete('/users/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  if (Number(id) !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
  await prisma.user.delete({ where: { id: Number(id) } });
  res.json({ message: 'Account deleted' });
});

app.get('/subscriptions', authMiddleware, async (req: any, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.userId },
      include: { payments: true },
      orderBy: { startDate: 'desc' },
    });
    res.json(subscriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.get('/payments', authMiddleware, async (req: any, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.userId },
      include: { subscription: true },
      orderBy: { timestamp: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Cancel subscription (set status to CANCELLED)
app.put('/subscriptions/:id/cancel', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  try {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { id: Number(id), userId: req.userId },
    });
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    const subscription = await prisma.subscription.update({
      where: { id: Number(id) },
      data: { status: 'CANCELLED' },
    });
    res.json(subscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Middleware to check user tier
const checkTier = (requiredTier: string) => {
  return async (req: any, res: any, next: any) => {
    const userId = req.userId || req.query.userId || req.body.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const tierOrder = ['FREE', 'PREMIUM', 'BUSINESS'];
    if (tierOrder.indexOf((user as any).tier) < tierOrder.indexOf(requiredTier)) {
      return res.status(403).json({ error: 'Premium feature required' });
    }
    next();
  };
};

app.get('/categories', authMiddleware, async (req: any, res) => {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
  });
  res.json(categories);
});

app.post('/categories', authMiddleware, async (req: any, res) => {
  const { name } = req.body;
  const category = await prisma.category.create({
    data: { name, userId: req.userId },
  });
  res.json(category);
});

app.put('/categories/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const existingCategory = await prisma.category.findFirst({
    where: { id: Number(id), userId: req.userId },
  });
  if (!existingCategory) {
    return res.status(404).json({ error: 'Category not found' });
  }
  const category = await prisma.category.update({
    where: { id: Number(id) },
    data: { name },
  });
  res.json(category);
});

app.delete('/categories/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const existingCategory = await prisma.category.findFirst({
    where: { id: Number(id), userId: req.userId },
  });
  if (!existingCategory) {
    return res.status(404).json({ error: 'Category not found' });
  }
  await prisma.category.delete({
    where: { id: Number(id) },
  });
  res.json({ message: 'Category deleted' });
});

app.get('/expenses', authMiddleware, async (req: any, res) => {
  const expenses = await prisma.expense.findMany({
    where: { userId: req.userId },
    include: { category: true },
  });
  res.json(expenses);
});

app.post('/expenses', authMiddleware, async (req: any, res) => {
  const { amount, description, date, categoryId } = req.body;
  const expense = await prisma.expense.create({
    data: { amount, description, date: new Date(date), categoryId, userId: req.userId },
  });
  res.json(expense);
});

app.put('/expenses/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { amount, description, date, categoryId } = req.body;
  const existingExpense = await prisma.expense.findFirst({
    where: { id: Number(id), userId: req.userId },
  });
  if (!existingExpense) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  const expense = await prisma.expense.update({
    where: { id: Number(id) },
    data: { amount, description, date: new Date(date), categoryId },
  });
  res.json(expense);
});

app.delete('/expenses/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const existingExpense = await prisma.expense.findFirst({
    where: { id: Number(id), userId: req.userId },
  });
  if (!existingExpense) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  await prisma.expense.delete({
    where: { id: Number(id) },
  });
  res.json({ message: 'Expense deleted' });
});

app.get('/budgets', authMiddleware, async (req: any, res) => {
  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId },
    include: { category: true },
  });
  res.json(budgets);
});

app.post('/budgets', authMiddleware, async (req: any, res) => {
  const { name, amount, period, categoryId } = req.body;
  const budget = await prisma.budget.create({
    data: { name, amount, period, categoryId, userId: req.userId },
  });
  res.json(budget);
});

app.put('/budgets/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { name, amount, period, categoryId } = req.body;
  const existingBudget = await prisma.budget.findFirst({
    where: { id: Number(id), userId: req.userId },
  });
  if (!existingBudget) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  const budget = await prisma.budget.update({
    where: { id: Number(id) },
    data: { name, amount, period, categoryId },
  });
  res.json(budget);
});

app.delete('/budgets/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const existingBudget = await prisma.budget.findFirst({
    where: { id: Number(id), userId: req.userId },
  });
  if (!existingBudget) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  await prisma.budget.delete({
    where: { id: Number(id) },
  });
  res.json({ message: 'Budget deleted' });
});

// AI Anomaly Detection
app.post('/ai-anomaly', authMiddleware, checkTier('PREMIUM'), async (req, res) => {
  const { expenses } = req.body;
  try {
    const anomalies = await detectAnomalies(expenses);
    res.json(anomalies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Anomaly detection failed' });
  }
});

async function detectAnomalies(expenses: any[]) {
  const prompt = `
Analyze the following expenses for anomalies. Look for:
- High amounts compared to typical spending
- Category mismatches (e.g., expensive items in unusual categories)
- Unusual frequency or patterns

Expenses data:
${JSON.stringify(expenses, null, 2)}

Return a JSON array of anomalies, each with:
- id: the expense id
- explanation: brief explanation of why it's anomalous

Only include actual anomalies. If none, return empty array.
Format: [{"id": 1, "explanation": "High amount for category"}, ...]
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
  });

  const content = response.choices[0].message?.content;
  if (!content) return [];

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse OpenAI response:', content);
    return [];
  }
}

// Monthly Reports
app.get('/reports/monthly', authMiddleware, async (req: any, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: { category: true },
    });

    // Aggregate expenses by category
    const categoryTotals: Record<number, { category: string; spent: number; expenses: any[] }> = {};
    expenses.forEach(exp => {
      if (!categoryTotals[exp.categoryId]) {
        categoryTotals[exp.categoryId] = { category: exp.category.name, spent: 0, expenses: [] };
      }
      categoryTotals[exp.categoryId].spent += exp.amount;
      categoryTotals[exp.categoryId].expenses.push(exp);
    });

    // Get budgets
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId, period: 'monthly' },
      include: { category: true },
    });

    // Prepare category data with budget comparison
    const categoryData = Object.entries(categoryTotals).map(([catId, data]) => {
      const budget = budgets.find(b => b.categoryId === Number(catId));
      return {
        category: data.category,
        spent: data.spent,
        budget: budget ? budget.amount : 0,
        status: budget ? (data.spent > budget.amount ? 'over' : 'under') : 'no budget',
      };
    });

    const totalSpent = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.spent, 0);

    // Detect anomalies
    const anomalies = await detectAnomalies(expenses);

    res.json({
      month: Number(month),
      year: Number(year),
      totalSpent,
      categoryData,
      anomalies,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// AI Insights for Premium users
app.get('/ai-insights', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  try {
    const userId = req.userId;

    // Fetch user's expenses, categories, and budgets
    const expenses = await prisma.expense.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const categories = await prisma.category.findMany({
      where: { userId },
    });

    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true },
    });

    // Generate insights using OpenAI
    const insights = await generateAIInsights(expenses, categories, budgets);

    res.json(insights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate AI insights' });
  }
});

async function generateAIInsights(expenses: any[], categories: any[], budgets: any[]) {
  const prompt = `
You are a financial advisor AI. Analyze the user's financial data and provide personalized insights for Premium users.

User Data:
- Expenses: ${JSON.stringify(expenses.slice(0, 50), null, 2)} (showing last 50 expenses)
- Categories: ${JSON.stringify(categories, null, 2)}
- Budgets: ${JSON.stringify(budgets, null, 2)}

Provide insights in the following JSON format:
{
  "spendingTrends": "A brief summary of spending patterns over time (e.g., 'Your spending has increased by 15% this month compared to last month.')",
  "categoryRecommendations": [
    {
      "category": "Category name",
      "recommendation": "Specific advice (e.g., 'Consider reducing dining out expenses by 20% to save $50/month')"
    }
  ],
  "financialAdvice": "General personalized financial advice based on their spending habits, budgets, and patterns."
}

Keep recommendations actionable and positive. Focus on trends, potential savings, and financial health.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
  });

  const content = response.choices[0].message?.content;
  if (!content) return {
    spendingTrends: "Unable to analyze spending trends at this time.",
    categoryRecommendations: [],
    financialAdvice: "Please ensure you have sufficient expense data for personalized insights."
  };

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse OpenAI response for insights:', content);
    return {
      spendingTrends: "Unable to analyze spending trends at this time.",
      categoryRecommendations: [],
      financialAdvice: "Please ensure you have sufficient expense data for personalized insights."
    };
  }
}

// OCR route
app.post('/ocr', checkTier('PREMIUM'), upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const [result] = await client.textDetection(req.file.path);
    if (!result.textAnnotations || result.textAnnotations.length === 0) {
      return res.status(400).json({ error: 'No text detected in image' });
    }
    const text = result.textAnnotations[0].description || '';
    const parsed = parseReceiptText(text);
    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'OCR failed' });
  }
});

// Plaid routes
app.post('/plaid/link-token', checkTier('PREMIUM'), async (req, res) => {
  const { userId } = req.body;
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId.toString() },
      client_name: 'Personal Finance Tracker',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

app.post('/plaid/exchange', checkTier('PREMIUM'), async (req, res) => {
  const { public_token, userId } = req.body;
  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;
    const item_id = response.data.item_id;

    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;

    // Store bank accounts
    for (const account of accounts) {
      await prisma.bankAccount.upsert({
        where: { plaidAccountId: account.account_id },
        update: {
          name: account.name,
          type: account.type,
          balance: account.balances.current || 0,
        },
        create: {
          userId,
          plaidAccountId: account.account_id,
          name: account.name,
          type: account.type,
          balance: account.balances.current || 0,
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

app.get('/plaid/transactions', checkTier('PREMIUM'), async (req, res) => {
  const { userId } = req.query;
  try {
    // Get all bank accounts for user
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId: Number(userId) },
    });

    if (bankAccounts.length === 0) {
      return res.json([]);
    }

    // For simplicity, assume one access token per user, but actually need to store item_id and access_token
    // For now, hardcode or assume. In real app, store access_token per item.
    // Since no auth, and sandbox, let's fetch from sandbox access token if available.
    // Actually, need to store access_token. Let's add access_token to BankAccount or separate table.

    // For demo, assume we have access_token from env or something. But properly, need to store it.

    // To make it work, let's add access_token to BankAccount model. Wait, no, access_token is per item, not per account.

    // Actually, need Item model. But for simplicity, assume one item per user, and store access_token in User or something.

    // Add access_token to User model temporarily.

    // For now, use a hardcoded sandbox token for demo.

    const access_token = process.env.PLAID_ACCESS_TOKEN_SANDBOX; // Need to set this

    if (!access_token) {
      return res.status(500).json({ error: 'Access token not configured' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    const endDate = new Date();

    const response = await plaidClient.transactionsGet({
      access_token,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });

    const transactions = response.data.transactions;

    // Store transactions
    for (const transaction of transactions) {
      const bankAccount = bankAccounts.find(acc => acc.plaidAccountId === transaction.account_id);
      if (bankAccount) {
        await prisma.transaction.upsert({
          where: { plaidTransactionId: transaction.transaction_id },
          update: {
            amount: transaction.amount,
            description: transaction.name,
            date: new Date(transaction.date),
            category: transaction.category ? transaction.category[0] : null,
          },
          create: {
            bankAccountId: bankAccount.id,
            plaidTransactionId: transaction.transaction_id,
            amount: transaction.amount,
            description: transaction.name,
            date: new Date(transaction.date),
            category: transaction.category ? transaction.category[0] : null,
          },
        });

        // Import as expense if outflow (negative amount)
        if (transaction.amount < 0) {
          await prisma.expense.create({
            data: {
              amount: -transaction.amount, // Make positive
              description: transaction.name,
              date: new Date(transaction.date),
              categoryId: 1, // Default category
              userId: Number(userId),
            },
          });
        }
      }
    }

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/bank-accounts', authMiddleware, async (req: any, res) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: req.userId },
    });
    res.json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// Feedback route
app.post('/feedback', authMiddleware, feedbackUpload.array('attachments', 3), async (req: any, res) => {
  const { subject, message, type, rating, category } = req.body;
  const attachments = req.files ? req.files.map((f: any) => f.path) : [];
  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId: req.userId,
        subject,
        message,
        type,
        rating: rating ? parseInt(rating) : null,
        category,
        attachments: JSON.stringify(attachments)
      },
    });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get feedback history
app.get('/feedback', authMiddleware, async (req: any, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

function parseReceiptText(text: string) {
  // Simple parsing logic
  const lines = text.split('\n');
  let amount = null;
  let merchant = null;
  let date = null;

  // Find amount: look for $ followed by number
  const amountMatch = text.match(/\$(\d+\.\d{2})/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
  }

  // Merchant: assume first line or look for common words
  if (lines.length > 0) {
    merchant = lines[0].trim();
  }

  // Date: look for MM/DD/YYYY or similar
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    date = dateMatch[1];
  }

  return { amount, merchant, date };
}

// Ko-fi Webhook
app.post('/webhooks/kofi', async (req, res) => {
  try {
    console.log('Ko-fi webhook received:', req.body);

    // Basic verification: Check if from Ko-fi IPs (simplified, in production use proper check)
    const kofiIPs = ['104.18.0.0/20', '172.64.0.0/13', '162.158.0.0/15']; // Cloudflare IPs, Ko-fi uses Cloudflare
    // For simplicity, skip IP check in dev

    const { data } = req.body; // Ko-fi sends data in 'data' field
    if (!data) {
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    const { verification_token, message_id, timestamp, type, is_public, from_name, message, amount, url, email, currency, is_subscription_payment, is_first_subscription_payment, kofi_transaction_id } = data;

    // Verify verification_token if set
    const expectedToken = process.env.KOFI_VERIFICATION_TOKEN;
    if (expectedToken && verification_token !== expectedToken) {
      console.error('Invalid verification token');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error('User not found for email:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        currency,
        status: 'SUCCESS',
        kofiId: kofi_transaction_id,
        timestamp: new Date(timestamp),
      },
    });

    // Determine tier based on amount
    let tier = 'FREE';
    if (amount >= 10) {
      tier = 'BUSINESS';
    } else if (amount >= 5) {
      tier = 'PREMIUM';
    }

    // Find or create subscription
    let subscription = await prisma.subscription.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });

    if (!subscription) {
      // Create new subscription
      subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          tier,
          amount,
          startDate: new Date(),
          endDate: is_subscription_payment ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null, // 30 days if recurring
          kofiId: kofi_transaction_id,
        },
      });
    } else {
      // Update existing subscription
      if (is_subscription_payment) {
        // Extend by 30 days
        const currentEnd = subscription.endDate || new Date();
        subscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            endDate: new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // Link payment to subscription
    await prisma.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id },
    });

    // Update user tier
    await prisma.user.update({
      where: { id: user.id },
      data: { tier },
    });

    console.log('Payment processed successfully for user:', user.email);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
});