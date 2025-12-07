import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (user) {
      fetchBudgets();
      fetchExpenses();
      if (user.tier === 'PREMIUM' || user.tier === 'BUSINESS') {
        fetchAlerts();
      }
    }
  }, [user]);

  const fetchBudgets = async () => {
    const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/budgets?userId=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setBudgets(data);
  };

  const fetchExpenses = async () => {
    const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/expenses?userId=${user.id}`, {
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
                <span style={{ color: isOver ? 'var(--error)' : 'var(--success)' }}>
                  ${spent.toFixed(2)} / ${budget.amount.toFixed(2)}
                </span>
              </div>
              <BudgetProgress spent={spent} budget={budget.amount} />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BudgetList;