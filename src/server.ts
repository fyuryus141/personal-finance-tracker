import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendFeedbackEmail } from './emailService';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

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

const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors());
app.use(express.json());

// Health check endpoint for Dead Man's Snitch
app.get('/health', (req, res) => {
  res.status(200).send('OK');
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
      feedbacks: true,
      subscriptions: { include: { payments: true } },
      payments: true,
    }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Export to PDF (PREMIUM)
app.get('/export/pdf', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  try {
    const { startDate, endDate, type = 'expenses' } = req.query;

    let expenses: any[] = [];
    let title = 'Expense Report';

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      expenses = await prisma.expense.findMany({
        where: {
          userId: req.userId,
          date: { gte: start, lte: end },
        },
        include: { category: true },
        orderBy: { date: 'asc' },
      });
      title = `Expense Report (${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]})`;
    } else {
      expenses = await prisma.expense.findMany({
        where: { userId: req.userId },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 100, // Limit for PDF generation
      });
      title = 'Recent Expenses Report';
    }

    // Create PDF
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`);
      res.send(pdfData);
    });

    // PDF Content
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
    doc.text(`Total Expenses: ${expenses.length}`);
    doc.moveDown();

    // Summary by category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category.name] = (categoryTotals[exp.category.name] || 0) + exp.amount;
    });

    doc.fontSize(14).text('Category Summary:');
    Object.entries(categoryTotals).forEach(([category, total]) => {
      doc.fontSize(10).text(`${category}: $${total.toFixed(2)}`);
    });
    doc.moveDown();

    // Expense details
    doc.fontSize(14).text('Expense Details:');
    doc.moveDown();

    expenses.forEach(exp => {
      doc.fontSize(10).text(
        `${exp.date.toISOString().split('T')[0]} - ${exp.description} - ${exp.category.name} - $${exp.amount.toFixed(2)}`
      );
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Export to Excel (PREMIUM)
app.get('/export/excel', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  try {
    const { startDate, endDate, type = 'expenses' } = req.query;

    let expenses: any[] = [];
    let filename = 'expense_report';

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      expenses = await prisma.expense.findMany({
        where: {
          userId: req.userId,
          date: { gte: start, lte: end },
        },
        include: { category: true },
        orderBy: { date: 'asc' },
      });
      filename = `expenses_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
    } else {
      expenses = await prisma.expense.findMany({
        where: { userId: req.userId },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 1000, // Limit for Excel generation
      });
      filename = 'recent_expenses';
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expenses');

    // Add headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data
    expenses.forEach(exp => {
      worksheet.addRow({
        date: exp.date.toISOString().split('T')[0],
        description: exp.description,
        category: exp.category.name,
        amount: exp.amount,
      });
    });

    // Add summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Total Amount', key: 'total', width: 15 },
      { header: 'Count', key: 'count', width: 10 },
    ];

    const categorySummary: Record<string, { total: number; count: number }> = {};
    expenses.forEach(exp => {
      if (!categorySummary[exp.category.name]) {
        categorySummary[exp.category.name] = { total: 0, count: 0 };
      }
      categorySummary[exp.category.name].total += exp.amount;
      categorySummary[exp.category.name].count += 1;
    });

    Object.entries(categorySummary).forEach(([category, data]) => {
      summarySheet.addRow({
        category,
        total: data.total,
        count: data.count,
      });
    });

    // Style summary headers
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Send Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
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

// Budget Alerts (PREMIUM)
app.get('/budgets/alerts', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId },
      include: { category: true },
    });

    const alerts: any[] = [];

    for (const budget of budgets) {
      // Calculate spending for the current period
      let startDate: Date;
      let endDate: Date;
      const now = new Date();

      if (budget.period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (budget.period === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      } else { // daily
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      }

      const expenses = await prisma.expense.findMany({
        where: {
          userId: req.userId,
          categoryId: budget.categoryId,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const percentageUsed = (totalSpent / budget.amount) * 100;

      // Check for alerts
      if (percentageUsed >= 100) {
        alerts.push({
          budgetId: budget.id,
          category: budget.category.name,
          budgetAmount: budget.amount,
          spent: totalSpent,
          percentage: percentageUsed,
          status: 'exceeded',
          message: `Budget exceeded for ${budget.category.name}: $${totalSpent.toFixed(2)} spent of $${budget.amount.toFixed(2)} budget`,
          period: budget.period,
        });
      } else if (percentageUsed >= 80) {
        alerts.push({
          budgetId: budget.id,
          category: budget.category.name,
          budgetAmount: budget.amount,
          spent: totalSpent,
          percentage: percentageUsed,
          status: 'warning',
          message: `Budget warning for ${budget.category.name}: ${percentageUsed.toFixed(1)}% used ($${totalSpent.toFixed(2)} of $${budget.amount.toFixed(2)})`,
          period: budget.period,
        });
      }
    }

    res.json({
      alerts: alerts.sort((a, b) => b.percentage - a.percentage), // Sort by highest percentage first
      totalAlerts: alerts.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check budget alerts' });
  }
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

// Custom Date Range Reports (PREMIUM)
app.get('/reports/custom', authMiddleware, checkTier('PREMIUM'), async (req: any, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    const expenses = await prisma.expense.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: start,
          lte: end,
        },
      },
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

    // Get budgets (find budgets that overlap with the date range)
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId },
      include: { category: true },
    });

    // Prepare category data with budget comparison (prorated for the date range)
    const daysInRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const categoryData = Object.entries(categoryTotals).map(([catId, data]) => {
      const budget = budgets.find(b => b.categoryId === Number(catId));
      let proratedBudget = 0;
      if (budget) {
        if (budget.period === 'monthly') {
          proratedBudget = (budget.amount / 30) * daysInRange;
        } else if (budget.period === 'yearly') {
          proratedBudget = (budget.amount / 365) * daysInRange;
        } else {
          proratedBudget = budget.amount; // daily budget
        }
      }
      return {
        category: data.category,
        spent: data.spent,
        budget: proratedBudget,
        status: proratedBudget > 0 ? (data.spent > proratedBudget ? 'over' : 'under') : 'no budget',
      };
    });

    const totalSpent = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.spent, 0);

    // Group expenses by date for trend analysis
    const dailySpending: Record<string, number> = {};
    expenses.forEach(exp => {
      const dateKey = exp.date.toISOString().split('T')[0];
      dailySpending[dateKey] = (dailySpending[dateKey] || 0) + exp.amount;
    });

    const dailyData = Object.entries(dailySpending).map(([date, amount]) => ({
      date,
      amount,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Detect anomalies
    const anomalies = await detectAnomalies(expenses);

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalSpent,
      categoryData,
      dailyData,
      anomalies,
      totalDays: daysInRange,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate custom date range report' });
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

    // Get user details for email
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user) {
      // Send feedback email to admin
      try {
        await sendFeedbackEmail(
          user.email,
          user.name || 'Anonymous User',
          subject,
          message,
          type,
          parseInt(rating) || 1,
          category,
          attachments,
          user.tier === 'BUSINESS' // priority flag
        );
      } catch (emailError) {
        console.error('Failed to send feedback email:', emailError);
        // Don't fail the request if email fails
      }
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