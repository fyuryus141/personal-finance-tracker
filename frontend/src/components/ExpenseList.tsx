import React, { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';

interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  category: {
    name: string;
  };
}

interface Anomaly {
  id: number;
  explanation: string;
}

interface ExpenseListProps {
  user: any;
  token: string | null;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ user, token }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/expenses?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setExpenses(data);
      await fetchAnomalies(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    }
  };

  const fetchAnomalies = async (expenseData: Expense[]) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/ai-anomaly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ expenses: expenseData }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAnomalies(data);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      setAnomalies([]);
    }
  };

  return (
    <div className="expense-list">
      <h2 className="component-title">
        <Receipt size={24} />
        Expenses
      </h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {expenses.map((expense) => {
          const anomaly = anomalies.find(a => a.id === expense.id);
          const isAnomalous = !!anomaly;
          return (
            <li
              key={expense.id}
              className={`expense-item ${isAnomalous ? 'anomalous' : ''}`}
              title={isAnomalous ? anomaly.explanation : undefined}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="expense-description">{expense.description}</span>
                <span className="expense-amount">-${expense.amount.toFixed(2)}</span>
              </div>
              <div className="expense-details">
                {expense.category.name} - {new Date(expense.date).toLocaleDateString()}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ExpenseList;