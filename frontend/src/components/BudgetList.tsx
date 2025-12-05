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

interface BudgetListProps {
  user: any;
  token: string | null;
}

const BudgetList: React.FC<BudgetListProps> = ({ user, token }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (user) {
      fetchBudgets();
      fetchExpenses();
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