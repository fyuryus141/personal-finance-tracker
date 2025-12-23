import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

  useEffect(() => {
    if (user && token) {
      fetchExpenses();
      fetchBudgets();
    }
  }, [month, year, user]);

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

  const monthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const totalSpent = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const categoryData: CategoryData[] = budgets.map((budget) => {
    const actual = monthExpenses
      .filter((exp) => exp.categoryId === budget.categoryId)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category: budget.category.name,
      spent: actual,
      budget: budget.amount,
      status: actual > budget.amount ? 'over' : 'under',
    };
  });

  const pieData = categoryData.map((cat) => ({ name: cat.category, value: cat.spent }));
  const barData = categoryData.map((cat) => ({
    category: cat.category,
    budgeted: cat.budget,
    actual: cat.spent,
  }));

  const lineData = monthExpenses.reduce((acc, expense) => {
    const day = new Date(expense.date).getDate();
    const existing = acc.find((item) => item.day === day);
    if (existing) {
      existing.spending += expense.amount;
    } else {
      acc.push({ day, spending: expense.amount });
    }
    return acc;
  }, [] as { day: number; spending: number }[]).sort((a, b) => a.day - b.day);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const exportPDF = async () => {
    const element = document.getElementById('monthly-report-content') as HTMLElement;
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
      const pdf = new jsPDF('p', 'mm', 'a4');

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

      pdf.save(`monthly-report-${year}-${month.toString().padStart(2, '0')}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to generate PDF');
    }
  };

  const isProTier = user.tier === 'PREMIUM' || user.tier === 'BUSINESS';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-2xl text-gray-500 animate-pulse">Loading report...</div>
      </div>
    );
  }

  return (
    <div id="monthly-report-content" className="p-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black mb-8 text-gray-900 dark:text-white bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text">
          📊
          <br />
          <span className="text-2xl md:text-3xl block mt-2 font-light text-gray-600 dark:text-gray-400">Monthly Report - {month}/{year}</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <div className="flex items-center gap-2">
            <label className="text-lg font-semibold text-gray-700 dark:text-gray-300">Month:</label>
            <select 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              className="p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-lg font-medium focus:ring-4 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-lg font-semibold text-gray-700 dark:text-gray-300">Year:</label>
            <input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className="p-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-lg font-medium w-24 focus:ring-4 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 p-8 rounded-3xl shadow-xl mb-16">
          <h3 className="text-3xl font-bold mb-6 text-emerald-800 dark:text-emerald-200">💰 Summary</h3>
          <p className="text-5xl font-black text-gray-900 dark:text-white mb-4">${totalSpent.toFixed(2)}</p>
          <p className="text-xl text-gray-600 dark:text-gray-400">Total spent this month</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
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
            <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-slate-200">Spending Trends (Daily)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
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

        <div className="mb-16">
          <h3 className="text-3xl font-bold mb-8 text-gray-800 dark:text-slate-200 text-center">Category Breakdown</h3>
          <div className="grid gap-4 max-w-4xl mx-auto">
            {categoryData.map((cat) => (
              <div key={cat.category} className={`p-6 rounded-2xl shadow-md flex justify-between items-center ${cat.status === 'over' ? 'bg-red-50 dark:bg-red-900/30 border-2 border-red-200' : 'bg-green-50 dark:bg-green-900/30 border-2 border-green-200'}`}>
                <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">{cat.category}</span>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${cat.status === 'over' ? 'text-red-600' : 'text-green-600'}`}>$${cat.spent.toFixed(2)} / $${cat.budget.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">({cat.status.toUpperCase()})</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isProTier ? (
          <div className="flex justify-center">
            <button
              onClick={exportPDF}
              className="group bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-16 py-6 rounded-3xl font-bold text-2xl shadow-2xl hover:shadow-3xl hover:-translate-y-3 active:scale-[0.98] transition-all duration-500 flex items-center gap-3"
            >
              📄 Export Full Report to PDF
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </button>
          </div>
        ) : (
          <div className="text-center p-12 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-3xl border-4 border-dashed border-yellow-200 dark:border-yellow-800">
            <h3 className="text-3xl font-bold text-yellow-800 dark:text-yellow-200 mb-4">Pro Feature</h3>
            <p className="text-xl text-yellow-700 dark:text-yellow-300 mb-8">PDF exports with charts available for Pro users</p>
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
    </div>
  );
};
 
export default MonthlyReport;