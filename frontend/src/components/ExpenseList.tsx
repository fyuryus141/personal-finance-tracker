import React, { useEffect, useState } from 'react';
import { Receipt, Edit } from 'lucide-react';

interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  category: {
    name: string;
  };
  tags?: string[];
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
  const [filter, setFilter] = useState('');

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

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(filter.toLowerCase()) ||
    (expense.tags && expense.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase())))
  );

  const handleEditTags = async (expenseId: number, currentTags: string[]) => {
    const newTagsStr = prompt('Enter new tags (comma separated):', currentTags.join(', '));
    if (newTagsStr !== null) {
      const newTags = newTagsStr.split(',').map(tag => tag.trim()).filter(tag => tag);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE}/expenses/${expenseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ tags: newTags }),
        });
        if (response.ok) {
          fetchExpenses(); // Refresh list
        } else {
          alert('Failed to update tags');
        }
      } catch (error) {
        console.error('Error updating tags:', error);
        alert('Error updating tags');
      }
    }
  };

  return (
    <div className="expense-list">
      <h2 className="component-title">
        <Receipt size={24} />
        Expenses
      </h2>
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search expenses or tags..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)', transition: 'border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease' }}
        />
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {filteredExpenses.map((expense) => {
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
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {user.tier === 'BUSINESS' && (
                    <button
                      onClick={() => handleEditTags(expense.id, expense.tags || [])}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px', color: 'var(--text-primary)' }}
                      title="Edit tags"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                  <span className="expense-amount">-${expense.amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="expense-details">
                {expense.category.name} - {new Date(expense.date).toLocaleDateString()}
                {user.tier === 'BUSINESS' && expense.tags && expense.tags.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    Tags: {expense.tags.join(', ')}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ExpenseList;