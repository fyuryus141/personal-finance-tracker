import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';

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

interface CategoryData {
  category: string;
  spent: number;
  budget: number;
  status: string;
}

interface MonthlyReportProps {
  user: any;
  token: string | null;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ user, token }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchBudgets();
    }
  }, [month, year, user]);

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

  const monthExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const totalSpent = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const categoryData: CategoryData[] = budgets.map(budget => {
    const actual = monthExpenses
      .filter(exp => exp.categoryId === budget.categoryId)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category: budget.category.name,
      spent: actual,
      budget: budget.amount,
      status: actual > budget.amount ? 'over' : 'under',
    };
  });

  const pieData = categoryData.map(cat => ({ name: cat.category, value: cat.spent }));
  const barData = categoryData.map(cat => ({
    category: cat.category,
    budgeted: cat.budget,
    actual: cat.spent,
  }));

  const lineData = monthExpenses.reduce((acc, expense) => {
    const day = new Date(expense.date).getDate();
    const existing = acc.find(item => item.day === day);
    if (existing) {
      existing.spending += expense.amount;
    } else {
      acc.push({ day, spending: expense.amount });
    }
    return acc;
  }, [] as { day: number; spending: number }[]).sort((a, b) => a.day - b.day);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Monthly Report - ${month}/${year}`, 10, 10);
    doc.text(`Total Spent: $${totalSpent.toFixed(2)}`, 10, 20);
    let y = 30;
    categoryData.forEach(cat => {
      doc.text(`${cat.category}: $${cat.spent.toFixed(2)} / $${cat.budget.toFixed(2)} (${cat.status})`, 10, y);
      y += 10;
    });
    doc.save(`report-${month}-${year}.pdf`);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', margin: '16px' }}>
      <h2 style={{ color: 'var(--accent)' }}>Monthly Report</h2>
      <div style={{ marginBottom: '16px' }}>
        <label>Month: </label>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <label> Year: </label>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <h3>Summary</h3>
        <p>Total Spent: <span style={{ color: 'var(--error)' }}>${totalSpent.toFixed(2)}</span></p>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <h3>Category Breakdown</h3>
        <ul>
          {categoryData.map(cat => (
            <li key={cat.category} style={{ color: cat.status === 'over' ? 'var(--error)' : 'var(--success)' }}>
              {cat.category}: ${cat.spent.toFixed(2)} / ${cat.budget.toFixed(2)} ({cat.status})
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '16px' }}>
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
        <div style={{ flex: '1 1 300px', minHeight: '300px' }}>
          <h3>Spending Trends in Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="spending" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: '1 1 300px', minHeight: '300px' }}>
          <h3>Budgets vs Actual</h3>
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
                  <Cell key={`cell-${index}`} fill={entry.actual > entry.budgeted ? '#F44336' : '#4CAF50'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <button onClick={exportToPDF} style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>
        Export to PDF
      </button>
    </div>
  );
};

export default MonthlyReport;