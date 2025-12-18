import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import { Configuration as PlaidConfiguration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail, sendMonthlyReport, sendInvitationEmail, sendFeedbackEmail } from './emailService';
import crypto from 'crypto';

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

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://rainbow-brioche-b44150.netlify.app',
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://localhost:3001'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use('/uploads', express.static('uploads'));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use(express.json());

// Health check endpoint for Dead Man's Snitch
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Auth routes
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  console.log('Registration attempt:', { email, name });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomUUID();
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, emailVerified: false, verificationToken },
    });
    console.log('User created successfully:', user.id);
    // Create default categories for the new user
    const defaultCategories = ['Travel', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Education', 'Groceries'];
    for (const name of defaultCategories) {
      await prisma.category.create({
        data: { name, userId: user.id },
      });
    }
    console.log('Default categories created');
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log('Verification email sent to:', email);
      res.json({ message: 'Registration successful. Check your email to verify.' });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      console.error('Email config:', {
        EMAIL_USER: process.env.EMAIL_USER,
        EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'NOT SET',
        FRONTEND_URL: process.env.FRONTEND_URL
      });
      // Still return success to user but log the error
      res.json({ message: 'Registration successful. Check your email to verify.' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('User found, emailVerified:', user.emailVerified, 'verificationToken:', user.verificationToken ? 'set' : 'null');
    if (user.email !== 'test@business.com' && !user.emailVerified) {
      let token = user.verificationToken;
      if (!token) {
        token = crypto.randomUUID();
        await prisma.user.update({
          where: { id: user.id },
          data: { verificationToken: token }
        });
        console.log('Generated new verification token for user:', user.id);
      }
      try {
        await sendVerificationEmail(user.email, token);
        console.log('Verification email sent/resent for:', user.email);
      } catch (error) {
        console.error('Failed to send verification email:', error);
      }
      return res.status(401).json({ error: 'Please verify your email first. A verification email has been sent.' });
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
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, tier: user.tier, emailReports: user.emailReports, profilePicture: user.profilePicture ? `/uploads/${user.profilePicture}` : null } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/auth/verify', async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: 'Token required' });
  const user = await prisma.user.findFirst({ where: { verificationToken: token } });
  if (!user) return res.status(400).json({ error: 'Invalid token' });
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });
  res.json({ message: 'Email verified successfully' });
});

app.post('/auth/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'User not found' });
  if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });
  let token = user.verificationToken;
  if (!token) {
    token = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: token }
    });
  }
  try {
    await sendVerificationEmail(email, token);
    res.json({ message: 'Verification email resent successfully' });
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Auth middleware
const authMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  console.log('Auth middleware: checking token');
  if (!authHeader) {
    console.log('No authorization header');
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  console.log('Token received:', token);
  console.log('Token present, verifying...');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    console.log('Token verification successful, decoded userId:', req.userId);
    next();
  } catch (error) {
    console.log('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check user tier
const checkTier = (requiredTier: string) => {
  return async (req: any, res: any, next: any) => {
    console.log('checkTier: req.userId:', req.userId, 'req.query.userId:', req.query.userId, 'req.body.userId:', req.body.userId);
    const userId = req.userId || req.query.userId || req.body.userId;
    console.log('checkTier: resolved userId:', userId);
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

// Get user data
app.get('/users/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  if (Number(id) !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    tier: (user as any).tier,
    emailReports: (user as any).emailReports,
    profilePicture: (user as any).profilePicture ? `/uploads/${(user as any).profilePicture}` : null
  });
});

// PUT /users/:id/profile-picture
app.put('/users/:id/profile-picture', authMiddleware, upload.single('profilePicture'), async (req: any, res) => {
  const { id } = req.params;
  if (Number(id) !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const profilePicture = req.file.filename;
  await prisma.user.update({
    where: { id: Number(id) },
    data: { profilePicture }
  });
  res.json({ message: 'Profile picture updated', profilePicture: `/uploads/${profilePicture}` });
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
app.get('/users/:id/export', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
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

app.post('/api/subscription/upgrade', authMiddleware, async (req: any, res) => {
  console.log('Upgrade endpoint called with body:', req.body);
  const { tier } = req.body;
  console.log('Tier received:', tier);
  if (!tier || !['PREMIUM', 'BUSINESS'].includes(tier)) {
    console.log('Invalid tier validation failed');
    return res.status(400).json({ error: 'Invalid tier. Must be PREMIUM or BUSINESS.' });
  }
  const backendTier = tier;
  const amount = tier === 'PREMIUM' ? 5 : 10;
  console.log('Calculated amount:', amount, 'for tier:', tier);
  const kofiPage = process.env.KOFI_PAGE || 'paul5150';
  console.log('KOFI_PAGE:', kofiPage);
  const kofiUrl = `https://ko-fi.com/${kofiPage}?amount=${amount}`;
  console.log('Generated kofiUrl:', kofiUrl);
  try {
    const subscription = await prisma.subscription.create({
      data: {
        userId: req.userId,
        tier: backendTier,
        amount,
        status: 'PENDING',
        startDate: new Date(),
      }
    });
    console.log('Subscription created:', subscription.id);
    res.json({ kofiUrl, subscriptionId: subscription.id });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});


app.get('/categories', authMiddleware, async (req: any, res) => {
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { groupId: userGroups[0].id } : { userId: req.userId };
  const categories = await prisma.category.findMany({
    where,
  });
  res.json(categories);
});

app.post('/categories', authMiddleware, checkTier('BUSINESS'), async (req: any, res) => {
  const { name } = req.body;
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const data = userGroups.length > 0 ? { name, groupId: userGroups[0].id } : { name, userId: req.userId };
  const category = await prisma.category.create({
    data,
  });
  res.json(category);
});

app.put('/categories/:id', authMiddleware, checkTier('BUSINESS'), async (req: any, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { id: Number(id), groupId: userGroups[0].id } : { id: Number(id), userId: req.userId };
  const existingCategory = await prisma.category.findFirst({
    where,
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

app.delete('/categories/:id', authMiddleware, checkTier('BUSINESS'), async (req: any, res) => {
  const { id } = req.params;
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { id: Number(id), groupId: userGroups[0].id } : { id: Number(id), userId: req.userId };
  const existingCategory = await prisma.category.findFirst({
    where,
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
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { groupId: userGroups[0].id } : { userId: req.userId };
  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
  });
  const expensesWithParsedTags = expenses.map(exp => ({
    ...exp,
    tags: exp.tags ? JSON.parse(exp.tags) : null,
  }));
  res.json(expensesWithParsedTags);
});

app.post('/expenses', authMiddleware, async (req: any, res) => {
  const { amount, description, date, categoryId, tags } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  const isBusiness = user && user.tier === 'BUSINESS';
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const data: any = userGroups.length > 0 ? { amount, description, date: new Date(date), categoryId, groupId: userGroups[0].id } : { amount, description, date: new Date(date), categoryId, userId: req.userId };
  if (isBusiness && tags) {
    data.tags = JSON.stringify(tags);
  }
  const expense = await prisma.expense.create({
    data,
  });
  const response = { ...expense, tags: expense.tags ? JSON.parse(expense.tags) : null };
  res.json(response);
});

app.put('/expenses/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { amount, description, date, categoryId, tags } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  const isBusiness = user && user.tier === 'BUSINESS';
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { id: Number(id), groupId: userGroups[0].id } : { id: Number(id), userId: req.userId };
  const existingExpense = await prisma.expense.findFirst({
    where,
  });
  if (!existingExpense) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  const data: any = { amount, description, date: new Date(date), categoryId };
  if (isBusiness) {
    data.tags = tags ? JSON.stringify(tags) : null;
  }
  const expense = await prisma.expense.update({
    where: { id: Number(id) },
    data,
  });
  const response = { ...expense, tags: expense.tags ? JSON.parse(expense.tags) : null };
  res.json(response);
});

app.delete('/expenses/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { id: Number(id), groupId: userGroups[0].id } : { id: Number(id), userId: req.userId };
  const existingExpense = await prisma.expense.findFirst({
    where,
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
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { groupId: userGroups[0].id } : { userId: req.userId };
  const budgets = await prisma.budget.findMany({
    where,
    include: { category: true },
  });
  res.json(budgets);
});

app.post('/budgets', authMiddleware, async (req: any, res) => {
  const { name, amount, period, categoryId } = req.body;
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const data = userGroups.length > 0 ? { name, amount, period, categoryId, groupId: userGroups[0].id } : { name, amount, period, categoryId, userId: req.userId };
  const budget = await prisma.budget.create({
    data,
  });
  res.json(budget);
});

app.put('/budgets/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { name, amount, period, categoryId } = req.body;
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { id: Number(id), groupId: userGroups[0].id } : { id: Number(id), userId: req.userId };
  const existingBudget = await prisma.budget.findFirst({
    where,
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
  const userGroups = await prisma.userGroup.findMany({
    where: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { id: req.userId } } },
      ],
    },
  });
  const where = userGroups.length > 0 ? { id: Number(id), groupId: userGroups[0].id } : { id: Number(id), userId: req.userId };
  const existingBudget = await prisma.budget.findFirst({
    where,
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
  console.log('/ai-anomaly: req.body:', req.body);
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

// AI Insights for Premium users
app.get('/ai-insights', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  try {
    const userId = req.userId;

    // Fetch user's expenses, categories, and budgets
    const userGroups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { id: userId } } },
        ],
      },
    });
    const where = userGroups.length > 0 ? { groupId: userGroups[0].id } : { userId };
    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const categories = await prisma.category.findMany({
      where,
    });

    const budgets = await prisma.budget.findMany({
      where,
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

async function generateYearlyForecast(currentYearExpenses: any[], previousYearExpenses: any[]) {
  const prompt = `
You are a financial forecasting AI. Based on the user's expense data from the current year and the previous year, predict their spending for the next year.

Data:
- Current Year Expenses: ${JSON.stringify(currentYearExpenses.slice(0, 100), null, 2)} (showing sample expenses)
- Previous Year Expenses: ${JSON.stringify(previousYearExpenses.slice(0, 100), null, 2)} (showing sample expenses)

Provide a forecast in the following JSON format:
{
  "predictedTotalSpending": 15000,
  "predictedMonthlySpending": [1200, 1300, ..., 1400], // 12 months
  "forecastExplanation": "Brief explanation of the forecast based on trends (e.g., 'Based on a 10% increase from last year, we predict...')",
  "risks": "Potential risks or uncertainties in the forecast."
}

Use historical trends, seasonality, and patterns to make realistic predictions.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
  });

  const content = response.choices[0].message?.content;
  if (!content) return {
    predictedTotalSpending: 0,
    predictedMonthlySpending: Array(12).fill(0),
    forecastExplanation: "Unable to generate forecast at this time.",
    risks: "Insufficient data for accurate forecasting."
  };

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse OpenAI response for forecast:', content);
    return {
      predictedTotalSpending: 0,
      predictedMonthlySpending: Array(12).fill(0),
      forecastExplanation: "Unable to generate forecast at this time.",
      risks: "Insufficient data for accurate forecasting."
    };
  }
}

// Monthly Reports
app.get('/reports/monthly', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    const userGroups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { id: req.userId } } },
        ],
      },
    });
    const where = userGroups.length > 0 ? {
      groupId: userGroups[0].id,
      date: {
        gte: startDate,
        lt: endDate,
      },
    } : {
      userId: req.userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    };
    const expenses = await prisma.expense.findMany({
      where,
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
    const budgetsWhere = userGroups.length > 0 ? { groupId: userGroups[0].id, period: 'monthly' } : { userId: req.userId, period: 'monthly' };
    const budgets = await prisma.budget.findMany({
      where: budgetsWhere,
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

// Monthly Reports CSV
app.get('/reports/monthly/csv', authMiddleware, checkTier('BUSINESS'), async (req: any, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    const userGroups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { id: req.userId } } },
        ],
      },
    });
    const where = userGroups.length > 0 ? {
      groupId: userGroups[0].id,
      date: {
        gte: startDate,
        lt: endDate,
      },
    } : {
      userId: req.userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    };
    const expenses = await prisma.expense.findMany({
      where,
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
    const budgetsWhere = userGroups.length > 0 ? { groupId: userGroups[0].id, period: 'monthly' } : { userId: req.userId, period: 'monthly' };
    const budgets = await prisma.budget.findMany({
      where: budgetsWhere,
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

    // Build CSV for summary
    let csv = 'Type,Category,Spent,Budget,Status\n';
    csv += `Summary,Total,${totalSpent.toFixed(2)},,\n`;
    categoryData.forEach(cat => {
      csv += `Category,${cat.category},${cat.spent.toFixed(2)},${cat.budget.toFixed(2)},${cat.status}\n`;
    });

    // Add expenses
    csv += '\nExpenses\n';
    csv += 'Date,Description,Amount,Category\n';
    expenses.forEach(exp => {
      csv += `${exp.date.toISOString().split('T')[0]},${exp.description.replace(/"/g, '""')},${exp.amount.toFixed(2)},${exp.category.name}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${month}-${year}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate monthly report CSV' });
  }
});

// Yearly Reports
app.get('/reports/yearly', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'year is required' });
  }

  try {
    const startDate = new Date(Number(year), 0, 1);
    const endDate = new Date(Number(year) + 1, 0, 1);

    const userGroups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { id: req.userId } } },
        ],
      },
    });
    const where = userGroups.length > 0 ? {
      groupId: userGroups[0].id,
      date: {
        gte: startDate,
        lt: endDate,
      },
    } : {
      userId: req.userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    };
    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'asc' },
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

    // Get budgets (assuming yearly budgets or sum monthly)
    const budgetsWhere = userGroups.length > 0 ? { groupId: userGroups[0].id } : { userId: req.userId };
    const budgets = await prisma.budget.findMany({
      where: budgetsWhere,
      include: { category: true },
    });

    // Prepare category data with budget comparison (sum budgets for year)
    const categoryData = Object.entries(categoryTotals).map(([catId, data]) => {
      const categoryBudgets = budgets.filter(b => b.categoryId === Number(catId));
      const totalBudget = categoryBudgets.reduce((sum, b) => sum + b.amount * (b.period === 'monthly' ? 12 : 1), 0);
      return {
        category: data.category,
        spent: data.spent,
        budget: totalBudget,
        status: totalBudget > 0 ? (data.spent > totalBudget ? 'over' : 'under') : 'no budget',
      };
    });

    const totalSpent = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.spent, 0);

    // Monthly spending data for trends
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(Number(year), i, 1);
      const monthEnd = new Date(Number(year), i + 1, 1);
      const monthExpenses = expenses.filter(exp => exp.date >= monthStart && exp.date < monthEnd);
      return {
        month: i + 1,
        spending: monthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      };
    });

    // Year-over-year comparison
    const prevYear = Number(year) - 1;
    const prevStartDate = new Date(prevYear, 0, 1);
    const prevEndDate = new Date(prevYear + 1, 0, 1);
    const prevWhere = userGroups.length > 0 ? {
      groupId: userGroups[0].id,
      date: {
        gte: prevStartDate,
        lt: prevEndDate,
      },
    } : {
      userId: req.userId,
      date: {
        gte: prevStartDate,
        lt: prevEndDate,
      },
    };
    const prevExpenses = await prisma.expense.findMany({
      where: prevWhere,
    });
    const prevTotalSpent = prevExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const yearOverYearChange = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

    // Forecasting
    const forecast = await generateYearlyForecast(expenses, prevExpenses);

    res.json({
      year: Number(year),
      totalSpent,
      prevYearTotal: prevTotalSpent,
      yearOverYearChange,
      categoryData,
      monthlyData,
      forecast,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate yearly report' });
  }
});

// Yearly Reports CSV
app.get('/reports/yearly/csv', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'year is required' });
  }

  try {
    const startDate = new Date(Number(year), 0, 1);
    const endDate = new Date(Number(year) + 1, 0, 1);

    const userGroups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { id: req.userId } } },
        ],
      },
    });
    const where = userGroups.length > 0 ? {
      groupId: userGroups[0].id,
      date: {
        gte: startDate,
        lt: endDate,
      },
    } : {
      userId: req.userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    };
    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'asc' },
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

    // Get budgets (assuming yearly budgets or sum monthly)
    const budgetsWhere = userGroups.length > 0 ? { groupId: userGroups[0].id } : { userId: req.userId };
    const budgets = await prisma.budget.findMany({
      where: budgetsWhere,
      include: { category: true },
    });

    // Prepare category data with budget comparison (sum budgets for year)
    const categoryData = Object.entries(categoryTotals).map(([catId, data]) => {
      const categoryBudgets = budgets.filter(b => b.categoryId === Number(catId));
      const totalBudget = categoryBudgets.reduce((sum, b) => sum + b.amount * (b.period === 'monthly' ? 12 : 1), 0);
      return {
        category: data.category,
        spent: data.spent,
        budget: totalBudget,
        status: totalBudget > 0 ? (data.spent > totalBudget ? 'over' : 'under') : 'no budget',
      };
    });

    const totalSpent = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.spent, 0);

    // Monthly spending data for trends
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(Number(year), i, 1);
      const monthEnd = new Date(Number(year), i + 1, 1);
      const monthExpenses = expenses.filter(exp => exp.date >= monthStart && exp.date < monthEnd);
      return {
        month: i + 1,
        spending: monthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      };
    });

    // Year-over-year comparison
    const prevYear = Number(year) - 1;
    const prevStartDate = new Date(prevYear, 0, 1);
    const prevEndDate = new Date(prevYear + 1, 0, 1);
    const prevWhere = userGroups.length > 0 ? {
      groupId: userGroups[0].id,
      date: {
        gte: prevStartDate,
        lt: prevEndDate,
      },
    } : {
      userId: req.userId,
      date: {
        gte: prevStartDate,
        lt: prevEndDate,
      },
    };
    const prevExpenses = await prisma.expense.findMany({
      where: prevWhere,
    });
    const prevTotalSpent = prevExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const yearOverYearChange = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

    // Forecasting
    const forecast = await generateYearlyForecast(expenses, prevExpenses);

    // Build CSV
    let csv = 'Type,Detail,Value\n';
    csv += `Summary,Year,${year}\n`;
    csv += `Summary,Total Spent,${totalSpent.toFixed(2)}\n`;
    csv += `Summary,Previous Year Total,${prevTotalSpent.toFixed(2)}\n`;
    csv += `Summary,Year-over-Year Change,${yearOverYearChange.toFixed(2)}%\n`;
    csv += `Forecast,Predicted Total Spending,${forecast.predictedTotalSpending.toFixed(2)}\n`;
    csv += `Forecast,Predicted Monthly Spending,${forecast.predictedMonthlySpending.join(',')}\n`;
    csv += `Forecast,Explanation,"${forecast.forecastExplanation.replace(/"/g, '""')}"\n`;
    csv += `Forecast,Risks,"${forecast.risks.replace(/"/g, '""')}"\n`;

    csv += '\nCategory Breakdown\n';
    csv += 'Category,Spent,Budget,Status\n';
    categoryData.forEach(cat => {
      csv += `${cat.category},${cat.spent.toFixed(2)},${cat.budget.toFixed(2)},${cat.status}\n`;
    });

    csv += '\nMonthly Spending\n';
    csv += 'Month,Spending\n';
    monthlyData.forEach(m => {
      csv += `${m.month},${m.spending.toFixed(2)}\n`;
    });

    csv += '\nExpenses\n';
    csv += 'Date,Description,Amount,Category\n';
    expenses.forEach(exp => {
      csv += `${exp.date.toISOString().split('T')[0]},${exp.description.replace(/"/g, '""')},${exp.amount.toFixed(2)},${exp.category.name}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="yearly-report-${year}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate yearly report CSV' });
  }
});

// Send Monthly Report via Email
app.post('/reports/monthly/email', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { month, year } = req.body;
  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    // Check if user has emailReports enabled
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.emailReports) {
      return res.status(403).json({ error: 'Email reports are disabled for this user' });
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    const userGroups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { id: req.userId } } },
        ],
      },
    });
    const where = userGroups.length > 0 ? {
      groupId: userGroups[0].id,
      date: {
        gte: startDate,
        lt: endDate,
      },
    } : {
      userId: req.userId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    };
    const expenses = await prisma.expense.findMany({
      where,
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
    const budgetsWhere = userGroups.length > 0 ? { groupId: userGroups[0].id, period: 'monthly' } : { userId: req.userId, period: 'monthly' };
    const budgets = await prisma.budget.findMany({
      where: budgetsWhere,
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

    // Send email
    await sendMonthlyReport(user.email, Number(month), Number(year), totalSpent, categoryData, anomalies);

    res.json({ message: 'Monthly report sent via email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send monthly report email' });
  }
});

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

    // Store or update PlaidItem
    const plaidItem = await prisma.plaidItem.upsert({
      where: { plaidItemId: item_id },
      update: { accessToken: access_token },
      create: {
        userId,
        plaidItemId: item_id,
        accessToken: access_token,
      },
    });

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
          plaidItemId: plaidItem.id,
        },
        create: {
          userId,
          plaidItemId: plaidItem.id,
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
    // Get all PlaidItems for user
    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: Number(userId) },
      include: { bankAccounts: true },
    });

    if (plaidItems.length === 0) {
      return res.json([]);
    }

    const allTransactions: any[] = [];

    for (const plaidItem of plaidItems) {
      const access_token = plaidItem.accessToken;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      const endDate = new Date();

      const response = await plaidClient.transactionsGet({
        access_token,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

      const transactions = response.data.transactions;
      allTransactions.push(...transactions);

      // Store transactions
      for (const transaction of transactions) {
        const bankAccount = plaidItem.bankAccounts.find(acc => acc.plaidAccountId === transaction.account_id);
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
    }

    res.json(allTransactions);
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
  console.log('POST /feedback: req.userId:', req.userId);
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  console.log('User exists in database:', !!user);
  if (!user) {
    console.log('User not found for req.userId:', req.userId);
    return res.status(404).json({ error: 'User not found' });
  }
  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId: req.userId,
        subject,
        message,
        type,
        rating: rating ? parseInt(rating) : null,
        category,
        priority: user.tier === 'BUSINESS' ? true : false,
        attachments: JSON.stringify(attachments)
      },
    });

    // Send email to admin
    try {
      await sendFeedbackEmail(
        user.email,
        user.name || 'User',
        subject,
        message,
        type,
        rating ? parseInt(rating) : 0,
        category,
        attachments,
        user.tier === 'BUSINESS' ? true : false
      );
      console.log('Feedback email sent to admin');
    } catch (emailError) {
      console.error('Failed to send feedback email:', emailError);
      // Don't fail the request if email fails
    }

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
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
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

// Group management routes
app.post('/groups', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { name } = req.body;
  try {
    const group = await prisma.userGroup.create({
      data: {
        name,
        ownerId: req.userId,
      },
    });
    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.get('/groups', authMiddleware, async (req: any, res) => {
  try {
    const groups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { id: req.userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

app.post('/groups/:id/invite', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const { email } = req.body;
  try {
    const group = await prisma.userGroup.findFirst({
      where: { id: Number(id), ownerId: req.userId },
      include: { owner: true },
    });
    if (!group) {
      return res.status(404).json({ error: 'Group not found or not owner' });
    }
    const invitation = await prisma.userGroupInvitation.create({
      data: {
        groupId: Number(id),
        invitedEmail: email,
        invitedById: req.userId,
      },
    });
    await sendInvitationEmail(email, group.name, group.owner.name || 'User');
    res.json(invitation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

app.get('/invitations', authMiddleware, async (req: any, res) => {
  try {
    const invitations = await prisma.userGroupInvitation.findMany({
      where: { invitedEmail: (await prisma.user.findUnique({ where: { id: req.userId } }))?.email },
      include: {
        group: { include: { owner: { select: { name: true } } } },
        invitedBy: { select: { name: true } },
      },
    });
    res.json(invitations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

app.post('/invitations/:id/accept', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  try {
    const invitation = await prisma.userGroupInvitation.findFirst({
      where: { id: Number(id), invitedEmail: (await prisma.user.findUnique({ where: { id: req.userId } }))?.email },
    });
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    await prisma.userGroup.update({
      where: { id: invitation.groupId },
      data: {
        members: { connect: { id: req.userId } },
      },
    });
    await prisma.userGroupInvitation.update({
      where: { id: Number(id) },
      data: { status: 'ACCEPTED' },
    });
    res.json({ message: 'Invitation accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

app.post('/invitations/:id/decline', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  try {
    const invitation = await prisma.userGroupInvitation.updateMany({
      where: { id: Number(id), invitedEmail: (await prisma.user.findUnique({ where: { id: req.userId } }))?.email },
      data: { status: 'DECLINED' },
    });
    if (invitation.count === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
});

app.put('/groups/:id', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const group = await prisma.userGroup.findFirst({
      where: { id: Number(id), ownerId: req.userId },
    });
    if (!group) {
      return res.status(404).json({ error: 'Group not found or not owner' });
    }
    const updatedGroup = await prisma.userGroup.update({
      where: { id: Number(id) },
      data: { name },
    });
    res.json(updatedGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

app.delete('/groups/:id', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { id } = req.params;
  try {
    const group = await prisma.userGroup.findFirst({
      where: { id: Number(id), ownerId: req.userId },
    });
    if (!group) {
      return res.status(404).json({ error: 'Group not found or not owner' });
    }
    await prisma.userGroup.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Group deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

app.post('/groups/:id/members', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { id } = req.params;
  const { userId: memberUserId } = req.body;
  try {
    const group = await prisma.userGroup.findFirst({
      where: { id: Number(id), ownerId: req.userId },
    });
    if (!group) {
      return res.status(404).json({ error: 'Group not found or not owner' });
    }
    await prisma.userGroup.update({
      where: { id: Number(id) },
      data: {
        members: {
          connect: { id: Number(memberUserId) }
        }
      }
    });
    res.json({ message: 'Member added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

app.delete('/groups/:id/members/:memberId', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { id, memberId } = req.params;
  try {
    const group = await prisma.userGroup.findFirst({
      where: { id: Number(id), ownerId: req.userId },
    });
    if (!group) {
      return res.status(404).json({ error: 'Group not found or not owner' });
    }
    await prisma.userGroup.update({
      where: { id: Number(id) },
      data: {
        members: {
          disconnect: { id: Number(memberId) }
        }
      }
    });
    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Ko-fi Webhook
app.post('/api/ko-fi/webhook', async (req, res) => {
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

    const now = new Date(timestamp);
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let tier = amount >= 10 ? 'BUSINESS' : amount >= 5 ? 'PREMIUM' : 'FREE';

    // Create payment without sub first
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        currency,
        status: 'SUCCESS',
        kofiId: kofi_transaction_id,
        timestamp: now,
      },
    });

    // Handle subscription
    let subscription;
    const activeSub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });

    if (activeSub && (is_first_subscription_payment || is_subscription_payment)) {
      const currentEnd = activeSub.endDate || now;
      subscription = await prisma.subscription.update({
        where: { id: activeSub.id },
        data: {
          endDate: new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000),
          kofiId: kofi_transaction_id,
        },
      });
    } else {
      const pendingSub = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: 'PENDING',
          amount,
        },
      });
      if (pendingSub) {
        subscription = await prisma.subscription.update({
          where: { id: pendingSub.id },
          data: {
            status: 'ACTIVE',
            endDate,
            kofiId: kofi_transaction_id,
          },
        });
      } else {
        subscription = await prisma.subscription.create({
          data: {
            userId: user.id,
            tier,
            amount,
            status: 'ACTIVE',
            startDate: now,
            endDate,
            kofiId: kofi_transaction_id,
          },
        });
      }
    }

    // Link payment
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

// Invoices endpoints
app.get('/api/invoices', authMiddleware, checkTier('BUSINESS'), async (req: any, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.userId },
      orderBy: { invoiceDate: 'desc' },
    });
    // Parse items
    const invoicesWithItems = invoices.map(inv => ({
      ...inv,
      items: inv.items ? JSON.parse(inv.items) : []
    }));
    res.json(invoicesWithItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

app.get('/api/invoices/count', authMiddleware, checkTier('BUSINESS'), async (req: any, res) => {
  try {
    const count = await prisma.invoice.count({
      where: { userId: req.userId }
    });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoice count' });
  }
});

app.post('/api/invoices', authMiddleware, checkTier('BUSINESS'), async (req: any, res) => {
  const { title = 'Invoice', startDate, endDate, dueDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }
  try {
    const userGroups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { id: req.userId } } },
        ],
      },
    });
    const whereClause = userGroups.length > 0
      ? { groupId: userGroups[0].id, date: { gte: new Date(startDate), lt: new Date(endDate) } }
      : { userId: req.userId, date: { gte: new Date(startDate), lt: new Date(endDate) } };
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: { category: true },
    });
    const items = expenses.map(exp => ({
      description: exp.description,
      amount: exp.amount,
      category: exp.category.name,
      date: exp.date.toISOString().split('T')[0]
    }));
    const subtotal = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const taxRate = 0.13;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    const invoice = await prisma.invoice.create({
      data: {
        userId: req.userId,
        title,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        items: JSON.stringify(items),
        subtotal,
        taxRate,
        taxAmount,
        total,
      }
    });
    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Tax reports endpoint
app.get('/api/tax-reports', authMiddleware, checkTier('BUSINESS'), async (req: any, res) => {
  const { period = 'yearly', year: yearStr = new Date().getFullYear().toString(), quarter } = req.query as any;
  const year = parseInt(yearStr);
  try {
    let startDate: Date, endDate: Date;
    if (period === 'quarterly' && quarter) {
      const q = parseInt(quarter);
      startDate = new Date(year, (q-1)*3, 1);
      endDate = new Date(year, q*3, 1);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    }
    const userGroups = await prisma.userGroup.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { id: req.userId } } },
        ],
      },
    });
    const whereClause = userGroups.length > 0
      ? { groupId: userGroups[0].id, date: { gte: startDate, lt: endDate } }
      : { userId: req.userId, date: { gte: startDate, lt: endDate } };
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: { category: true },
    });
    const categoryTotals: Record<string, number> = {};
    let totalExpenses = 0;
    expenses.forEach(exp => {
      const cat = exp.category.name;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
      totalExpenses += exp.amount;
    });
    const deductibleExpenses = totalExpenses * 0.3; // mock
    const taxableIncome = totalExpenses - deductibleExpenses;
    const estimatedTax = taxableIncome * 0.25; // mock
    const reportKey = `${period}-${year}${quarter ? `-Q${quarter}` : ''}`;
    res.json({
      period: reportKey,
      year,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      deductibleExpenses: Math.round(deductibleExpenses * 100) / 100,
      taxableIncome: Math.round(taxableIncome * 100) / 100,
      estimatedTax: Math.round(estimatedTax * 100) / 100,
      categories: categoryTotals,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate tax report' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
});