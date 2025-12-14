import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.REACT_APP_API_BASE || 'https://financial-tracker-ai-insight-a194fc716874.herokuapp.com';

  useEffect(() => {
    if (user && token) {
      fetchExpenses();
      fetchBudgets();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE}/expenses?userId=${user.id}`, {
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
      const response = await fetch(`${API_BASE}/budgets?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setBudgets(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setLoading(false);
    }
  };

  // Pie chart data: expenses by category
  const pieData = expenses.reduce((acc, expense) => {
    const category = expense.category.name;
    const existing = acc.find((item) => item.name === category);
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
  const recentExpenses = expenses.filter((expense) => new Date(expense.date) >= sixMonthsAgo);
  const lineData = recentExpenses.reduce((acc, expense) => {
    const month = new Date(expense.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    const existing = acc.find((item) => item.month === month);
    if (existing) {
      existing.spending += expense.amount;
    } else {
      acc.push({ month, spending: expense.amount });
    }
    return acc;
  }, [] as { month: string; spending: number }[]).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Bar chart data: budgets vs actual spending (current month)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const barData = budgets.map((budget) => {
    const actual = expenses
      .filter((exp) => exp.categoryId === budget.categoryId && exp.date.startsWith(currentMonth))
      .reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category: budget.category.name,
      budgeted: budget.amount,
      actual,
    };
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const exportPDF = async () => {
    const element = document.getElementById('charts-content') as HTMLElement;
    if (!element) {
      alert('Content not found');
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`spending-charts-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-2xl text-gray-500 animate-pulse">Loading charts...</div>
      </div>
    );
  }

  const isProTier = user.tier === 'PREMIUM' || user.tier === 'BUSINESS';

  return (
    <div id="charts-content" className="p-8 max-w-7xl mx-auto">
      <h2 className="text-4xl md:text-5xl font-black mb-12 text-center text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
        📊
        <br />
        <span className="text-2xl md:text-3xl block mt-2 font-light text-gray-600 dark:text-gray-400">Spending Visualizations</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Pie Chart */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 border border-gray-200 dark:border-slate-700">
          <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-slate-200">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={90}
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
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 border border-gray-200 dark:border-slate-700">
          <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-slate-200">Spending Trends (6 Months)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="spending" stroke="#8884d8" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 border border-gray-200 dark:border-slate-700">
          <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-slate-200">Budgets vs Actual</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budgeted" fill="#82ca9d" name="Budgeted" />
              <Bar dataKey="actual" name="Actual">
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.actual > entry.budgeted ? '#ef4444' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isProTier ? (
        <div className="flex justify-center mt-16">
          <button
            onClick={exportPDF}
            className="group bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-16 py-6 rounded-3xl font-bold text-2xl shadow-2xl hover:shadow-3xl hover:-translate-y-3 active:scale-[0.98] transition-all duration-500 flex items-center gap-3"
          >
            📄 Export to PDF
            <span className="group-hover:translate-x-2 transition-transform">→</span>
          </button>
        </div>
      ) : (
        <div className="text-center mt-16 p-12 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-3xl border-4 border-dashed border-yellow-200 dark:border-yellow-800">
          <h3 className="text-3xl font-bold text-yellow-800 dark:text-yellow-200 mb-4">Pro Feature</h3>
          <p className="text-xl text-yellow-700 dark:text-yellow-300 mb-8">Unlock PDF exports with full charts and data</p>
          <a
            href="https://ko-fi.com/paul5150"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            Upgrade to Pro
          </a>
        </div>
      )}
    </div>
  );
};

export default SpendingCharts;