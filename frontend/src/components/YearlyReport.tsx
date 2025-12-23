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

interface MonthlyData {
  month: number;
  spending: number;
}

interface Forecast {
  predictedTotalSpending: number;
  predictedMonthlySpending: number[];
  forecastExplanation: string;
  risks: string;
}

interface YearlyReportData {
  year: number;
  totalSpent: number;
  prevYearTotal: number;
  yearOverYearChange: number;
  categoryData: CategoryData[];
  monthlyData: MonthlyData[];
  forecast: Forecast;
}

interface YearlyReportProps {
  user: any;
  token: string | null;
}

const YearlyReport: React.FC<YearlyReportProps> = ({ user, token }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<YearlyReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.tier !== 'FREE') {
      fetchYearlyReport();
    }
  }, [year, user]);

  const fetchYearlyReport = async () => {
    setLoading(true);
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/reports/yearly?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching yearly report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    doc.text(`Yearly Report - ${year}`, 10, 10);
    doc.text(`Total Spent: $${reportData.totalSpent?.toFixed(2) || '0.00'}`, 10, 20);
    doc.text(`Previous Year: $${reportData.prevYearTotal?.toFixed(2) || '0.00'}`, 10, 30);
    doc.text(`Year-over-Year Change: ${reportData.yearOverYearChange?.toFixed(2) || '0.00'}%`, 10, 40);
    doc.text(`Predicted Next Year: $${reportData.forecast?.predictedTotalSpending?.toFixed(2) || '0.00'}`, 10, 50);
    let y = 60;
    reportData.categoryData?.forEach(cat => {
      doc.text(`${cat.category}: $${cat.spent?.toFixed(2) || '0.00'} / $${cat.budget?.toFixed(2) || '0.00'} (${cat.status || 'unknown'})`, 10, y);
      y += 10;
    });
    doc.save(`yearly-report-${year}.pdf`);
  };

  const exportToCSV = async () => {
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/reports/yearly/csv?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `yearly-report-${year}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV report');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (user.tier === 'FREE') {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', margin: '16px' }}>
        <h2 style={{ color: 'var(--accent)' }}>Yearly Report</h2>
        <p>This feature is available for Premium and Business tier users only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', margin: '16px' }}>
        <h2 style={{ color: 'var(--accent)' }}>Yearly Report</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', margin: '16px' }}>
        <h2 style={{ color: 'var(--accent)' }}>Yearly Report</h2>
        <p>No data available.</p>
      </div>
    );
  }

  const pieData = reportData.categoryData?.map(cat => ({ name: cat.category, value: cat.spent })) || [];
  const barData = reportData ? [
    { year: `${year - 1}`, spending: reportData.prevYearTotal },
    { year: `${year}`, spending: reportData.totalSpent },
    { year: `${year + 1} (Predicted)`, spending: reportData.forecast?.predictedTotalSpending || 0 },
  ] : [];

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', margin: '16px' }}>
      <h2 style={{ color: 'var(--accent)' }}>Yearly Report</h2>
      <div style={{ marginBottom: '16px' }}>
        <label>Year: </label>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <h3>Summary</h3>
        <p>Total Spent: <span style={{ color: 'var(--error)' }}>${reportData.totalSpent?.toFixed(2) || '0.00'}</span></p>
        <p>Previous Year: <span style={{ color: 'var(--text-primary)' }}>${reportData.prevYearTotal?.toFixed(2) || '0.00'}</span></p>
        <p>Year-over-Year Change: <span style={{ color: reportData.yearOverYearChange > 0 ? 'var(--error)' : 'var(--success)' }}>
          {reportData.yearOverYearChange > 0 ? '+' : ''}{reportData.yearOverYearChange?.toFixed(2) || '0.00'}%
        </span></p>
        <p>Predicted Next Year: <span style={{ color: 'var(--accent)' }}>${reportData.forecast?.predictedTotalSpending?.toFixed(2) || '0.00'}</span></p>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <h3>Category Breakdown</h3>
        <ul>
          {reportData.categoryData?.map(cat => (
            <li key={cat.category} style={{ color: cat.status === 'over' ? 'var(--error)' : 'var(--success)' }}>
              {cat.category}: ${cat.spent?.toFixed(2) || '0.00'} / ${cat.budget?.toFixed(2) || '0.00'} ({cat.status})
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <h3>Predicted Spending Insights</h3>
        <p>{reportData.forecast?.forecastExplanation || 'No forecast available'}</p>
        <p><strong>Risks:</strong> {reportData.forecast?.risks || 'No risk assessment available'}</p>
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
          <h3>Yearly Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.monthlyData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="spending" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: '1 1 300px', minHeight: '300px' }}>
          <h3>Year-over-Year Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="spending" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <button onClick={exportToPDF} style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>
        Export to PDF
      </button>
      <button onClick={exportToCSV} style={{ backgroundColor: 'var(--accent)', color: 'var(--text-primary)', padding: '8px 16px', border: 'none', borderRadius: '4px', marginLeft: '8px' }}>
        Export to CSV
      </button>
    </div>
  );
};

export default YearlyReport;