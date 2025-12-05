import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';

interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  categoryId: number;
  userId: number;
  category: { id: number; name: string; userId: number };
}

interface Budget {
  id: number;
  name: string;
  amount: number;
  period: string;
  categoryId: number;
  userId: number;
  category: { id: number; name: string; userId: number };
}

interface SpendingChartsProps {
  user: any;
  token: string | null;
}

const SpendingCharts: React.FC<SpendingChartsProps> = ({ user, token }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchBudgets();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/expenses?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/budgets?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setBudgets(data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  // Pie chart data: expenses by category
  const pieData = expenses.reduce((acc, expense) => {
    const category = expense.category.name;
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.value += expense.amount;
    } else {
      acc.push({ name: category, value: expense.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Line chart data: spending trends over time (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentExpenses = expenses.filter(expense => new Date(expense.date) >= sixMonthsAgo);
  const lineData = recentExpenses.reduce((acc, expense) => {
    const month = new Date(expense.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.spending += expense.amount;
    } else {
      acc.push({ month, spending: expense.amount });
    }
    return acc;
  }, [] as { month: string; spending: number }[]).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Bar chart data: budgets vs actual spending (assuming monthly, current month)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const barData = budgets.map(budget => {
    const actual = expenses
      .filter(exp => exp.categoryId === budget.categoryId && exp.date.startsWith(currentMonth))
      .reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category: budget.category.name,
      budgeted: budget.amount,
      actual,
    };
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Spending Visualizations</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {/* Pie Chart */}
        <div style={{ flex: '1 1 300px', minHeight: '300px' }}>
          <h3>Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div style={{ flex: '1 1 300px', minHeight: '300px' }}>
          <h3>Spending Trends Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="spending" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div style={{ flex: '1 1 300px', minHeight: '300px' }}>
          <h3>Budgets vs Actual Spending</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budgeted" fill="#82ca9d" name="Budgeted" />
              <Bar dataKey="actual" name="Actual">
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.actual > entry.budgeted ? '#ff0000' : '#00ff00'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SpendingCharts;