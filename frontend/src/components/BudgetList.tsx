import React, { useEffect, useState } from 'react';
import { Edit, X, Save } from 'lucide-react';
import BudgetProgress from './BudgetProgress';

interface Budget {
  id: number;
  name: string;
  amount: number;
  period: string;
  categoryId: number;
  category: {
    name: string;
  };
}

interface Expense {
  id: number;
  amount: number;
  date: string;
  categoryId: number;
}

interface BudgetAlert {
  budgetId: number;
  category: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  status: string;
  message: string;
  period: string;
}

interface BudgetListProps {
  user: any;
  token: string | null;
}

const BudgetList: React.FC<BudgetListProps> = ({ user, token }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchBudgets();
      fetchExpenses();
      fetchCategories();
      if (user.tier === 'PREMIUM' || user.tier === 'BUSINESS') {
        fetchAlerts();
      }
    }
  }, [user]);

  const fetchBudgets = async () => {
    const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
    const response = await fetch(`${API_BASE}/budgets?userId=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setBudgets(data);
  };

  const fetchExpenses = async () => {
    const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
    const response = await fetch(`${API_BASE}/expenses?userId=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setExpenses(data);
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/budgets/alerts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching budget alerts:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const calculateSpent = (categoryId: number, period: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expense.categoryId === categoryId &&
               expenseDate.getMonth() === currentMonth &&
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setEditName(budget.name);
    setEditAmount(budget.amount.toString());
    setEditPeriod(budget.period);
    setEditCategoryId(budget.categoryId.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingBudget) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/budgets/${editingBudget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          amount: parseFloat(editAmount),
          period: editPeriod,
          categoryId: parseInt(editCategoryId),
        }),
      });
      if (response.ok) {
        setEditingBudget(null);
        fetchBudgets(); // Refresh list
      } else {
        alert('Failed to update budget');
      }
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Error updating budget');
    }
  };

  const handleCancelEdit = () => {
    setEditingBudget(null);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', margin: '16px', color: 'var(--text-primary)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <h2 style={{ color: 'var(--text-primary)' }}>Budgets</h2>

      {/* Budget Alerts Section - PREMIUM Feature */}
      {(user?.tier === 'PREMIUM' || user?.tier === 'BUSINESS') && alerts.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: 'var(--error)', margin: 0 }}>⚠️ Budget Alerts</h3>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showAlerts ? 'Hide' : 'Show'} ({alerts.length})
            </button>
          </div>

          {showAlerts && (
            <div>
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px',
                    margin: '4px 0',
                    borderRadius: '4px',
                    backgroundColor: alert.status === 'exceeded' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                    borderLeft: `4px solid ${alert.status === 'exceeded' ? 'var(--error)' : '#FF9800'}`
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {alert.category}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {alert.message}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {alert.percentage.toFixed(1)}% used • ${alert.spent.toFixed(2)} of ${alert.budgetAmount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Premium Feature Teaser */}
      {user?.tier !== 'PREMIUM' && user?.tier !== 'BUSINESS' && (
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--accent)', borderRadius: '6px', color: 'white' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>🚀 PREMIUM Feature: Budget Alerts</h4>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Get notified when you're approaching or exceeding your budget limits. Upgrade to PREMIUM to unlock budget alerts and advanced financial insights!
          </p>
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {budgets.map((budget) => {
          const spent = calculateSpent(budget.categoryId, budget.period);
          const isOver = spent > budget.amount;
          return (
            <li key={budget.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-primary)' }}>{budget.name} ({budget.category.name})</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => handleEditBudget(budget)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px', color: 'var(--text-primary)' }}
                    title="Edit budget"
                  >
                    <Edit size={16} />
                  </button>
                  <span style={{ color: isOver ? 'var(--error)' : 'var(--success)' }}>
                    ${spent.toFixed(2)} / ${budget.amount.toFixed(2)}
                  </span>
                </div>
              </div>
              <BudgetProgress spent={spent} budget={budget.amount} />
            </li>
          );
        })}
      </ul>

      {editingBudget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Edit Budget</h3>
            <div className="space-y-4">
              <div className="input-group">
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="input-group">
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="input-group">
                <label className="block text-sm font-medium text-gray-300 mb-2">Period</label>
                <select
                  value={editPeriod}
                  onChange={(e) => setEditPeriod(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="input-group">
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSaveEdit}
                className="login-button flex-1"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="login-button bg-red-600 hover:bg-red-700 flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetList;