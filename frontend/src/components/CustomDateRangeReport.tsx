import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
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

interface DailyData {
  date: string;
  amount: number;
}

interface CustomDateRangeReportProps {
  user: any;
  token: string | null;
}

const CustomDateRangeReport: React.FC<CustomDateRangeReportProps> = ({ user, token }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set default date range to last 30 days
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE}/reports/custom?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('This feature requires a PREMIUM subscription');
        }
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE}/export/pdf?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `custom-report-${startDate}-to-${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const exportToExcel = async () => {
    if (!reportData) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE}/export/excel?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `custom-report-${startDate}-to-${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (user?.tier !== 'PREMIUM' && user?.tier !== 'BUSINESS') {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', margin: '16px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent)' }}>Custom Date Range Reports</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          This feature requires a PREMIUM subscription.
        </p>
        <a
          href="https://ko-fi.com/paul5150?amount=5"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            borderRadius: '4px',
            textDecoration: 'none',
            display: 'inline-block',
            marginTop: '16px'
          }}
        >
          Upgrade to PREMIUM
        </a>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', margin: '16px' }}>
      <h2 style={{ color: 'var(--accent)' }}>Custom Date Range Report</h2>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ marginRight: '8px' }}>Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border)' }}
          />
        </div>
        <div>
          <label style={{ marginRight: '8px' }}>End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border)' }}
          />
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--error)', marginBottom: '16px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {reportData && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <h3>Report Summary</h3>
            <p>Period: {reportData.startDate} to {reportData.endDate}</p>
            <p>Total Spent: <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>${reportData.totalSpent.toFixed(2)}</span></p>
            <p>Total Days: {reportData.totalDays}</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h3>Category Breakdown</h3>
            <ul>
              {reportData.categoryData.map((cat: any) => (
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
                    data={reportData.categoryData.map((cat: any) => ({ name: cat.category, value: cat.spent }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: '1 1 300px', minHeight: '300px' }}>
              <h3>Daily Spending Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Daily Spending" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: '1 1 300px', minHeight: '300px' }}>
              <h3>Budgets vs Actual</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.categoryData.map((cat: any) => ({
                  category: cat.category,
                  budgeted: cat.budget,
                  actual: cat.spent,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="budgeted" fill="#82ca9d" name="Budgeted" />
                  <Bar dataKey="actual" name="Actual">
                    {reportData.categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.spent > entry.budget ? '#F44336' : '#4CAF50'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              onClick={exportToPDF}
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--text-primary)',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                marginRight: '8px'
              }}
            >
              Export to PDF
            </button>
            <button
              onClick={exportToExcel}
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--text-primary)',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Export to Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomDateRangeReport;