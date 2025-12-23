import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BarChart3, Settings as SettingsIcon, MessageSquare, CreditCard } from 'lucide-react';
import ExpenseList from './components/ExpenseList';
import AddExpenseForm from './components/AddExpenseForm';
import ReceiptScanner from './components/ReceiptScanner';
import BudgetList from './components/BudgetList';
import SetBudgetForm from './components/SetBudgetForm';
import AIInsights from './components/AIInsights';
import SpendingCharts from './components/SpendingCharts';
import MonthlyReport from './components/MonthlyReport';
import YearlyReport from './components/YearlyReport';
import CustomDateRangeReport from './components/CustomDateRangeReport';
import Subscription from './components/Subscription';
import Login from './components/Login';
import Feedback from './components/Feedback';
import DarkModeToggle from './components/DarkModeToggle';
import Settings from './components/Settings';
import EmailVerification from './components/EmailVerification';
import './App.css';

function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [reportType, setReportType] = useState('monthly');
  const [quickStats, setQuickStats] = useState({ totalExpenses: 0, totalBudget: 0, insightsAvailable: true });
  const [comparisonData, setComparisonData] = useState({
    currentMonth: 0,
    lastMonth: 0,
    currentYear: 0,
    lastYear: 0,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    console.log('Checking authentication status:');
    console.log('Token present:', !!storedToken);
    console.log('User present:', !!storedUser);
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      console.log('Loaded storedUser:', parsedUser);
      setToken(storedToken);
      setUser(parsedUser);
    } else {
      console.log('User is not logged in');
    }
  }, []);

  useEffect(() => {
    if (token && user && !user.id) {
      console.log('Recovering missing user.id from JWT token');
      const decodeJWT = (tokenStr: string) => {
        try {
          const base64Url = tokenStr.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          return JSON.parse(jsonPayload);
        } catch (e) {
          console.error('JWT decode error:', e);
          return null;
        }
      };

      const payload = decodeJWT(token);
      if (payload && payload.userId) {
        const uid = payload.userId;
        const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
        fetch(`${API_BASE}/users/${uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).then(async (response) => {
          if (response.ok) {
            const fullUser = await response.json();
            setUser(fullUser);
            localStorage.setItem('user', JSON.stringify(fullUser));
            console.log('Recovered full user from backend:', fullUser);
          } else {
            console.error('Failed to fetch user data for recovery:', response.status);
          }
        }).catch((e) => {
          console.error('Recovery fetch error:', e);
        });
      }
    }
  }, [token, user]);

  useEffect(() => {
    if (user && token) {
      const fetchQuickStats = async () => {
        try {
          const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

          // Fetch expenses
          const expensesResponse = await fetch(`${API_BASE}/expenses`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const expenses = expensesResponse.ok ? await expensesResponse.json() : [];

          // Calculate total expenses this month
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const monthlyExpenses = expenses.filter((exp: any) => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
          });
          const totalExpenses = monthlyExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

          // Fetch budgets
          const budgetsResponse = await fetch(`${API_BASE}/budgets`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const budgets = budgetsResponse.ok ? await budgetsResponse.json() : [];
          const totalBudget = budgets.reduce((sum: number, budget: any) => sum + budget.amount, 0);

          setQuickStats({
            totalExpenses,
            totalBudget,
            insightsAvailable: true,
          });
        } catch (error) {
          console.error('Error fetching quick stats:', error);
        }
      };
      fetchQuickStats();
    }
  }, [user, token]);

  useEffect(() => {
    if (user && token && currentView === 'comparison') {
      const fetchComparisonData = async () => {
        try {
          const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

          // Fetch expenses
          const expensesResponse = await fetch(`${API_BASE}/expenses`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const expenses = expensesResponse.ok ? await expensesResponse.json() : [];

          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          // Current month
          const currentMonthExpenses = expenses.filter((exp: any) => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
          });
          const currentMonthTotal = currentMonthExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

          // Last month
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          const lastMonthExpenses = expenses.filter((exp: any) => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear;
          });
          const lastMonthTotal = lastMonthExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

          // Current year
          const currentYearExpenses = expenses.filter((exp: any) => {
            const expDate = new Date(exp.date);
            return expDate.getFullYear() === currentYear;
          });
          const currentYearTotal = currentYearExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

          // Last year
          const lastYearExpenses = expenses.filter((exp: any) => {
            const expDate = new Date(exp.date);
            return expDate.getFullYear() === currentYear - 1;
          });
          const lastYearTotal = lastYearExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

          setComparisonData({
            currentMonth: currentMonthTotal,
            lastMonth: lastMonthTotal,
            currentYear: currentYearTotal,
            lastYear: lastYearTotal,
          });
        } catch (error) {
          console.error('Error fetching comparison data:', error);
        }
      };
      fetchComparisonData();
    }
  }, [user, token, currentView]);

  const handleLogin = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleUserUpdate = async (updatedUser: any) => {
    // Fetch the complete updated user data from backend
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/users/${updatedUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const completeUser = await response.json();
        setUser(completeUser);
        localStorage.setItem('user', JSON.stringify(completeUser));
      } else {
        // Fallback to the updated user if fetch fails
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to fetch complete user data:', error);
      // Fallback to the updated user if fetch fails
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const handleExpenseAdded = () => {
    setRefreshKey(prev => prev + 1);
    // Reset form
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
    setTags([]);
  };

  const handleBudgetAdded = () => {
    setBudgetRefreshKey(prev => prev + 1);
  };

  const renderView = () => {
    console.log('renderView called, user:', !!user, 'currentView:', currentView);
    // Check for email verification token
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token')) {
      return <EmailVerification />;
    }
    if (!user) {
      console.log('Rendering login');
      return <Login onLogin={handleLogin} />;
    }

    console.log('Rendering authenticated view:', currentView);
    switch (currentView) {
      case 'dashboard':
        console.log('Rendering dashboard components');
        try {
          return (
            <div>
              {/* Hero Section */}
              <div className="max-w-4xl mx-auto text-center mb-12 p-8 bg-bg-primary/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50">
                <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-accent to-blue-500 bg-clip-text text-transparent mb-4">
                  Welcome back, {user.name}!
                </h2>
                <p className="text-lg text-text-secondary mb-6">
                  Here's your financial overview. Manage expenses, track budgets, and gain insights.
                </p>
                {quickStats.totalExpenses > quickStats.totalBudget && quickStats.totalBudget > 0 && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 backdrop-blur-sm">
                    <p className="text-red-400 font-semibold">⚠️ Budget Alert</p>
                    <p className="text-red-300 text-sm">Your expenses this month (${quickStats.totalExpenses.toFixed(2)}) exceed your total budget (${quickStats.totalBudget.toFixed(2)}).</p>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-6 text-sm">
                  <div className="bg-bg-secondary/50 rounded-xl p-4 backdrop-blur-sm border border-border/30">
                    <p className="text-text-primary font-semibold">This Month's Expenses</p>
                    <p className="text-accent">${quickStats.totalExpenses.toFixed(2)}</p>
                  </div>
                  <div className="bg-bg-secondary/50 rounded-xl p-4 backdrop-blur-sm border border-border/30">
                    <p className="text-text-primary font-semibold">Total Budget</p>
                    <p className="text-accent">${quickStats.totalBudget.toFixed(2)}</p>
                  </div>
                  <div className="bg-bg-secondary/50 rounded-xl p-4 backdrop-blur-sm border border-border/30">
                    <p className="text-text-primary font-semibold">AI Insights</p>
                    <p className="text-accent">{quickStats.insightsAvailable ? 'Available' : 'Unavailable'}</p>
                  </div>
                </div>
              </div>
              {/* Dashboard Grid */}
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"><SetBudgetForm onBudgetAdded={handleBudgetAdded} user={user} token={token} /></div>
              <div className="bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"><BudgetList key={budgetRefreshKey} user={user} token={token} /></div>
              <div className="bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"><ReceiptScanner
                setAmount={setAmount}
                setDescription={setDescription}
                setDate={setDate}
                user={user}
              /></div>
              <div className="bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"><AddExpenseForm
                onExpenseAdded={handleExpenseAdded}
                amount={amount}
                setAmount={setAmount}
                description={description}
                setDescription={setDescription}
                date={date}
                setDate={setDate}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                tags={tags}
                setTags={setTags}
                user={user}
                token={token}
              /></div>
              <div className="bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"><ExpenseList key={refreshKey} user={user} token={token} /></div>
              <div className="bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"><AIInsights user={user} token={token} /></div>
              <div className="bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group col-span-full lg:col-span-2"><SpendingCharts user={user} token={token} /></div>
              </div>
            </div>
          );
        } catch (error) {
          console.error('Error rendering dashboard:', error);
          return <div>Error loading dashboard</div>;
        }
      case 'reports':
        console.log('Rendering reports');
        return (
          <div>
            <div className="flex flex-col items-center mb-12">
              <div className="flex flex-wrap gap-4 justify-center mb-6 p-4 bg-bg-secondary/50 rounded-2xl backdrop-blur-sm border border-border/30">
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-transparent hover:border-accent hover:bg-accent hover:text-bg-primary text-text-primary backdrop-blur-sm ${reportType === 'monthly' ? 'bg-accent text-bg-primary border-accent ring-4 ring-accent/30 shadow-xl !translate-y-0 scale-[1.05]' : ''}`}
                >
                  Monthly
                </button>
                {user.tier !== 'FREE' && (
                  <button
                    onClick={() => setReportType('yearly')}
                    className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-transparent hover:border-accent hover:bg-accent hover:text-bg-primary text-text-primary backdrop-blur-sm ${reportType === 'yearly' ? 'bg-accent text-bg-primary border-accent ring-4 ring-accent/30 shadow-xl !translate-y-0 scale-[1.05]' : ''}`}
                  >
                    Yearly
                  </button>
                )}
                {(user.tier === 'PREMIUM' || user.tier === 'BUSINESS') && (
                  <button
                    onClick={() => setReportType('custom')}
                    className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-transparent hover:border-accent hover:bg-accent hover:text-bg-primary text-text-primary backdrop-blur-sm ${reportType === 'custom' ? 'bg-accent text-bg-primary border-accent ring-4 ring-accent/30 shadow-xl !translate-y-0 scale-[1.05]' : ''}`}
                  >
                    Custom Range
                  </button>
                )}
              </div>
              <p className="text-text-secondary text-center max-w-2xl">
                Select a report type to view detailed insights into your spending patterns, budget performance, and financial trends. Premium users have access to yearly and custom range reports.
              </p>
              {(user.tier === 'PREMIUM' || user.tier === 'BUSINESS') && (
                <div className="mt-6">
                  <button
                    onClick={() => setCurrentView('comparison')}
                    className="px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-2 border-transparent hover:border-white/50"
                  >
                    Compare Periods
                  </button>
                </div>
              )}
            </div>
            <div className="mb-8">
              {reportType === 'monthly' ? (
                <MonthlyReport user={user} token={token} />
              ) : reportType === 'yearly' ? (
                <YearlyReport user={user} token={token} />
              ) : (
                <CustomDateRangeReport user={user} token={token} />
              )}
            </div>
            {(user.tier === 'PREMIUM' || user.tier === 'BUSINESS') && (
              <div className="max-w-4xl mx-auto p-6 bg-bg-primary/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50">
                <h3 className="text-xl font-bold text-accent mb-4">Premium Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-bg-secondary/50 rounded-xl border border-border/30">
                    <h4 className="font-semibold text-text-primary mb-2">Automated Email Reports</h4>
                    <p className="text-text-secondary text-sm">Schedule weekly/monthly PDF reports to your email.</p>
                    <button className="mt-2 px-4 py-2 bg-accent text-bg-primary rounded-lg hover:bg-accent-hover transition-colors">
                      Set Up Email Reports
                    </button>
                  </div>
                  <div className="p-4 bg-bg-secondary/50 rounded-xl border border-border/30">
                    <h4 className="font-semibold text-text-primary mb-2">Tax Report Generator</h4>
                    <p className="text-text-secondary text-sm">Auto-generate tax-deductible summaries for filing.</p>
                    <button className="mt-2 px-4 py-2 bg-accent text-bg-primary rounded-lg hover:bg-accent-hover transition-colors">
                      Generate Tax Report
                    </button>
                  </div>
                  <div className="p-4 bg-bg-secondary/50 rounded-xl border border-border/30">
                    <h4 className="font-semibold text-text-primary mb-2">Anomaly Detection</h4>
                    <p className="text-text-secondary text-sm">AI-powered alerts for unusual spending patterns.</p>
                    <button className="mt-2 px-4 py-2 bg-accent text-bg-primary rounded-lg hover:bg-accent-hover transition-colors">
                      View Anomalies
                    </button>
                  </div>
                  <div className="p-4 bg-bg-secondary/50 rounded-xl border border-border/30">
                    <h4 className="font-semibold text-text-primary mb-2">Comparative Analysis</h4>
                    <p className="text-text-secondary text-sm">Compare spending across periods with detailed breakdowns.</p>
                    <button className="mt-2 px-4 py-2 bg-accent text-bg-primary rounded-lg hover:bg-accent-hover transition-colors">
                      Compare Periods
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'plans':
        console.log('Rendering plans');
        return <Subscription user={user} token={token} />;
      case 'settings':
        console.log('Rendering settings');
        return <Settings user={user} token={token} onUserUpdate={handleUserUpdate} />;
      case 'feedback':
        console.log('Rendering feedback');
        return <Feedback />;
      case 'comparison':
        console.log('Rendering comparison');
        const monthChange = comparisonData.lastMonth > 0 ? ((comparisonData.currentMonth - comparisonData.lastMonth) / comparisonData.lastMonth * 100).toFixed(1) : '0.0';
        const yearChange = comparisonData.lastYear > 0 ? ((comparisonData.currentYear - comparisonData.lastYear) / comparisonData.lastYear * 100).toFixed(1) : '0.0';
        const monthChangeNum = parseFloat(monthChange);
        const yearChangeNum = parseFloat(yearChange);
        const avgMonthlyCurrent = comparisonData.currentYear / 12;
        const avgMonthlyLast = comparisonData.lastYear / 12;
        return (
          <div className="max-w-4xl mx-auto p-8 bg-bg-primary/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50">
            <h2 className="text-3xl font-bold text-text-primary mb-6 text-center">Period Comparison</h2>
            <p className="text-text-secondary text-center mb-8">Compare your spending across different time periods.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-bg-secondary/50 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                <h3 className="text-xl font-bold text-text-primary mb-4">This Month vs Last Month</h3>
                <p className="text-text-secondary">Total Spent: ${comparisonData.currentMonth.toFixed(2)} vs ${comparisonData.lastMonth.toFixed(2)} ({monthChangeNum > 0 ? '+' : ''}{monthChange}%)</p>
                <p className="text-text-secondary">Change: {comparisonData.currentMonth > comparisonData.lastMonth ? 'Increased' : comparisonData.currentMonth < comparisonData.lastMonth ? 'Decreased' : 'Same'}</p>
              </div>
              <div className="bg-bg-secondary/50 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                <h3 className="text-xl font-bold text-text-primary mb-4">This Year vs Last Year</h3>
                <p className="text-text-secondary">Total Spent: ${comparisonData.currentYear.toFixed(2)} vs ${comparisonData.lastYear.toFixed(2)} ({yearChangeNum > 0 ? '+' : ''}{yearChange}%)</p>
                <p className="text-text-secondary">Avg Monthly: ${avgMonthlyCurrent.toFixed(2)} vs ${avgMonthlyLast.toFixed(2)}</p>
              </div>
            </div>
          </div>
        );
      default:
        console.log('Unknown view:', currentView);
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-gray-800 dark:to-indigo-900 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <header className="mx-auto max-w-4xl bg-bg-primary/80 backdrop-blur-xl rounded-3xl p-8 mb-8 shadow-2xl border border-border/50 hover:shadow-3xl hover:-translate-y-2 transition-all duration-500 text-center">
        <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-accent via-blue-500 to-indigo-600 bg-clip-text text-transparent mb-6 drop-shadow-lg">Personal Finance Tracker</h1>
        {user && (
          <div>
            <p className="text-xl text-text-secondary mb-6">Welcome, {user.name}!</p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 flex-wrap">
              <button onClick={handleLogout} className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-error/50 hover:border-error hover:bg-error hover:text-bg-primary text-error backdrop-blur-sm">Logout</button>
              <DarkModeToggle />
            </div>
          </div>
        )}
        {user && (
          <nav className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 p-4 rounded-2xl bg-bg-secondary/50 backdrop-blur-sm border border-border/30">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-transparent hover:border-accent hover:bg-accent hover:text-bg-primary text-accent backdrop-blur-sm ${currentView === 'dashboard' ? 'bg-accent text-bg-primary border-accent ring-4 ring-accent/30 shadow-xl !translate-y-0 scale-[1.05]' : ''}`}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('reports')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-transparent hover:border-accent hover:bg-accent hover:text-bg-primary text-accent backdrop-blur-sm ${currentView === 'reports' ? 'bg-accent text-bg-primary border-accent ring-4 ring-accent/30 shadow-xl !translate-y-0 scale-[1.05]' : ''}`}
            >
              <BarChart3 size={20} />
              Reports
            </button>
            <button
              onClick={() => setCurrentView('plans')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-transparent hover:border-accent hover:bg-accent hover:text-bg-primary text-accent backdrop-blur-sm ${currentView === 'plans' ? 'bg-accent text-bg-primary border-accent ring-4 ring-accent/30 shadow-xl !translate-y-0 scale-[1.05]' : ''}`}
            >
              <CreditCard size={20} />
              Plans
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-transparent hover:border-accent hover:bg-accent hover:text-bg-primary text-accent backdrop-blur-sm ${currentView === 'settings' ? 'bg-accent text-bg-primary border-accent ring-4 ring-accent/30 shadow-xl !translate-y-0 scale-[1.05]' : ''}`}
            >
              <SettingsIcon size={20} />
              Settings
            </button>
            <button
              onClick={() => setCurrentView('feedback')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-bg-primary border-2 border-transparent hover:border-accent hover:bg-accent hover:text-bg-primary text-accent backdrop-blur-sm ${currentView === 'feedback' ? 'bg-accent text-bg-primary border-accent ring-4 ring-accent/30 shadow-xl !translate-y-0 scale-[1.05]' : ''}`}
            >
              <MessageSquare size={20} />
              Feedback
            </button>
          </nav>
        )}
      </header>
      {renderView()}
    </div>
  );
}

export default App;