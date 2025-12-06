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
import BankLink from './components/BankLink';
import BankAccounts from './components/BankAccounts';
import Subscription from './components/Subscription';
import Login from './components/Login';
import Feedback from './components/Feedback';
import DarkModeToggle from './components/DarkModeToggle';
import Settings from './components/Settings';
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
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    console.log('Checking authentication status:');
    console.log('Token present:', !!storedToken);
    console.log('User present:', !!storedUser);
    if (storedToken && storedUser) {
      console.log('User is logged in:', JSON.parse(storedUser).name);
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else {
      console.log('User is not logged in');
    }
  }, []);

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

  const handleExpenseAdded = () => {
    setRefreshKey(prev => prev + 1);
    // Reset form
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
  };

  const handleBudgetAdded = () => {
    setBudgetRefreshKey(prev => prev + 1);
  };

  const renderView = () => {
    console.log('renderView called, user:', !!user, 'currentView:', currentView);
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
            <div className="main-content">
              <div className="component-card"><BankLink /></div>
              <div className="component-card"><BankAccounts user={user} token={token} onTransactionsImported={handleExpenseAdded} /></div>
              <div className="component-card"><SetBudgetForm onBudgetAdded={handleBudgetAdded} user={user} token={token} /></div>
              <div className="component-card"><BudgetList key={budgetRefreshKey} user={user} token={token} /></div>
              <div className="component-card"><ReceiptScanner
                setAmount={setAmount}
                setDescription={setDescription}
                setDate={setDate}
              /></div>
              <div className="component-card"><AddExpenseForm
                onExpenseAdded={handleExpenseAdded}
                amount={amount}
                setAmount={setAmount}
                description={description}
                setDescription={setDescription}
                date={date}
                setDate={setDate}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                user={user}
                token={token}
              /></div>
              <div className="component-card"><ExpenseList key={refreshKey} user={user} token={token} /></div>
              <div className="component-card"><AIInsights user={user} token={token} /></div>
              <div className="component-card"><SpendingCharts user={user} token={token} /></div>
            </div>
          );
        } catch (error) {
          console.error('Error rendering dashboard:', error);
          return <div>Error loading dashboard</div>;
        }
      case 'reports':
        console.log('Rendering reports');
        return <MonthlyReport user={user} token={token} />;
      case 'plans':
        console.log('Rendering plans');
        return <Subscription user={user} token={token} />;
      case 'settings':
        console.log('Rendering settings');
        return <Settings user={user} token={token} onUserUpdate={setUser} />;
      case 'feedback':
        console.log('Rendering feedback');
        return <Feedback />;
      default:
        console.log('Unknown view:', currentView);
        return null;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Personal Finance Tracker</h1>
        {user && (
          <div>
            <p className="user-welcome">Welcome, {user.name}!</p>
            <div className="logout-section">
              <button onClick={handleLogout} className="nav-button">Logout</button>
              <DarkModeToggle />
            </div>
          </div>
        )}
        {user && (
          <nav className="app-nav">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('reports')}
              className={`nav-button ${currentView === 'reports' ? 'active' : ''}`}
            >
              <BarChart3 size={20} />
              Monthly Reports
            </button>
            <button
              onClick={() => setCurrentView('plans')}
              className={`nav-button ${currentView === 'plans' ? 'active' : ''}`}
            >
              <CreditCard size={20} />
              Plans
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`nav-button ${currentView === 'settings' ? 'active' : ''}`}
            >
              <SettingsIcon size={20} />
              Settings
            </button>
            <button
              onClick={() => setCurrentView('feedback')}
              className={`nav-button ${currentView === 'feedback' ? 'active' : ''}`}
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