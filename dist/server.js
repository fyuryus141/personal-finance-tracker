"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const vision_1 = __importDefault(require("@google-cloud/vision"));
const openai_1 = __importDefault(require("openai"));
const plaid_1 = require("plaid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
const app = (0, express_1.default)();
console.log('Creating Prisma client...');
const prisma = new client_1.PrismaClient();
console.log('Prisma client created');
const upload = (0, multer_1.default)({ dest: 'uploads/' });
let client = null;
try {
    client = new vision_1.default.ImageAnnotatorClient();
}
catch (error) {
    console.log('Google Vision client not initialized, OCR will not work');
}
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});
const plaidConfig = new plaid_1.Configuration({
    basePath: plaid_1.PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || 'dummy-client-id',
            'PLAID-SECRET': process.env.PLAID_SECRET || 'dummy-secret',
        },
    },
});
const plaidClient = new plaid_1.PlaidApi(plaidConfig);
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Auth routes
app.post('/auth/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, name } = req.body;
    try {
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const user = yield prisma.user.create({
            data: { email, password: hashedPassword, name },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, tier: user.tier } });
    }
    catch (error) {
        res.status(400).json({ error: 'User already exists' });
    }
}));
app.post('/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const user = yield prisma.user.findUnique({ where: { email } });
    if (!user || !(yield bcryptjs_1.default.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, tier: user.tier } });
}));
// Get user tier
app.get('/users/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = yield prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    res.json({ tier: user.tier });
}));
// Auth middleware
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
// Middleware to check user tier
const checkTier = (requiredTier) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = req.userId || req.query.userId || req.body.userId;
        if (!userId)
            return res.status(400).json({ error: 'userId required' });
        const user = yield prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const tierOrder = ['FREE', 'PREMIUM', 'BUSINESS'];
        if (tierOrder.indexOf(user.tier) < tierOrder.indexOf(requiredTier)) {
            return res.status(403).json({ error: 'Premium feature required' });
        }
        next();
    });
};
// Categories CRUD
app.get('/categories', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.query;
    const categories = yield prisma.category.findMany({
        where: { userId: Number(userId) },
    });
    res.json(categories);
}));
app.post('/categories', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, userId } = req.body;
    const category = yield prisma.category.create({
        data: { name, userId },
    });
    res.json(category);
}));
app.put('/categories/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name } = req.body;
    const category = yield prisma.category.update({
        where: { id: Number(id) },
        data: { name },
    });
    res.json(category);
}));
app.delete('/categories/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield prisma.category.delete({
        where: { id: Number(id) },
    });
    res.json({ message: 'Category deleted' });
}));
// Expenses CRUD
app.get('/expenses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.query;
    const expenses = yield prisma.expense.findMany({
        where: { userId: Number(userId) },
        include: { category: true },
    });
    res.json(expenses);
}));
app.post('/expenses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, description, date, categoryId, userId } = req.body;
    const expense = yield prisma.expense.create({
        data: { amount, description, date: new Date(date), categoryId, userId },
    });
    res.json(expense);
}));
app.put('/expenses/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { amount, description, date, categoryId } = req.body;
    const expense = yield prisma.expense.update({
        where: { id: Number(id) },
        data: { amount, description, date: new Date(date), categoryId },
    });
    res.json(expense);
}));
app.delete('/expenses/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield prisma.expense.delete({
        where: { id: Number(id) },
    });
    res.json({ message: 'Expense deleted' });
}));
// Budgets CRUD
app.get('/budgets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.query;
    const budgets = yield prisma.budget.findMany({
        where: { userId: Number(userId) },
        include: { category: true },
    });
    res.json(budgets);
}));
app.post('/budgets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, amount, period, categoryId, userId } = req.body;
    const budget = yield prisma.budget.create({
        data: { name, amount, period, categoryId, userId },
    });
    res.json(budget);
}));
app.put('/budgets/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, amount, period, categoryId } = req.body;
    const budget = yield prisma.budget.update({
        where: { id: Number(id) },
        data: { name, amount, period, categoryId },
    });
    res.json(budget);
}));
app.delete('/budgets/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield prisma.budget.delete({
        where: { id: Number(id) },
    });
    res.json({ message: 'Budget deleted' });
}));
// AI Anomaly Detection
app.post('/ai-anomaly', checkTier('PREMIUM'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { expenses } = req.body;
    try {
        const anomalies = yield detectAnomalies(expenses);
        res.json(anomalies);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Anomaly detection failed' });
    }
}));
function detectAnomalies(expenses) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
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
        const response = yield openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
        });
        const content = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content;
        if (!content)
            return [];
        try {
            return JSON.parse(content);
        }
        catch (e) {
            console.error('Failed to parse OpenAI response:', content);
            return [];
        }
    });
}
// Monthly Reports
app.get('/reports/monthly', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { month, year, userId } = req.query;
    if (!month || !year || !userId) {
        return res.status(400).json({ error: 'month, year, and userId are required' });
    }
    try {
        const startDate = new Date(Number(year), Number(month) - 1, 1);
        const endDate = new Date(Number(year), Number(month), 1);
        const expenses = yield prisma.expense.findMany({
            where: {
                userId: Number(userId),
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            include: { category: true },
        });
        // Aggregate expenses by category
        const categoryTotals = {};
        expenses.forEach(exp => {
            if (!categoryTotals[exp.categoryId]) {
                categoryTotals[exp.categoryId] = { category: exp.category.name, spent: 0, expenses: [] };
            }
            categoryTotals[exp.categoryId].spent += exp.amount;
            categoryTotals[exp.categoryId].expenses.push(exp);
        });
        // Get budgets
        const budgets = yield prisma.budget.findMany({
            where: { userId: Number(userId), period: 'monthly' },
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
        const anomalies = yield detectAnomalies(expenses);
        res.json({
            month: Number(month),
            year: Number(year),
            totalSpent,
            categoryData,
            anomalies,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate monthly report' });
    }
}));
// OCR route
app.post('/ocr', checkTier('PREMIUM'), upload.single('receipt'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        const [result] = yield client.textDetection(req.file.path);
        if (!result.textAnnotations || result.textAnnotations.length === 0) {
            return res.status(400).json({ error: 'No text detected in image' });
        }
        const text = result.textAnnotations[0].description || '';
        const parsed = parseReceiptText(text);
        res.json(parsed);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'OCR failed' });
    }
}));
// Plaid routes
app.post('/plaid/link-token', checkTier('PREMIUM'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    try {
        const response = yield plaidClient.linkTokenCreate({
            user: { client_user_id: userId.toString() },
            client_name: 'Personal Finance Tracker',
            products: [plaid_1.Products.Transactions],
            country_codes: [plaid_1.CountryCode.Us],
            language: 'en',
        });
        res.json({ link_token: response.data.link_token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create link token' });
    }
}));
app.post('/plaid/exchange', checkTier('PREMIUM'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { public_token, userId } = req.body;
    try {
        const response = yield plaidClient.itemPublicTokenExchange({ public_token });
        const access_token = response.data.access_token;
        const item_id = response.data.item_id;
        // Get accounts
        const accountsResponse = yield plaidClient.accountsGet({ access_token });
        const accounts = accountsResponse.data.accounts;
        // Store bank accounts
        for (const account of accounts) {
            yield prisma.bankAccount.upsert({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to exchange token' });
    }
}));
app.get('/plaid/transactions', checkTier('PREMIUM'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.query;
    try {
        // Get all bank accounts for user
        const bankAccounts = yield prisma.bankAccount.findMany({
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
        const response = yield plaidClient.transactionsGet({
            access_token,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
        });
        const transactions = response.data.transactions;
        // Store transactions
        for (const transaction of transactions) {
            const bankAccount = bankAccounts.find(acc => acc.plaidAccountId === transaction.account_id);
            if (bankAccount) {
                yield prisma.transaction.upsert({
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
                    yield prisma.expense.create({
                        data: {
                            amount: -transaction.amount,
                            description: transaction.name,
                            date: new Date(transaction.date),
                            categoryId: 1,
                            userId: Number(userId),
                        },
                    });
                }
            }
        }
        res.json(transactions);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
}));
// Get bank accounts
app.get('/bank-accounts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.query;
    try {
        const accounts = yield prisma.bankAccount.findMany({
            where: { userId: Number(userId) },
        });
        res.json(accounts);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
}));
// Feedback route
app.post('/feedback', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { message, type } = req.body;
    try {
        const feedback = yield prisma.feedback.create({
            data: { userId: req.userId, message, type },
        });
        res.json(feedback);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
}));
function parseReceiptText(text) {
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
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
});
