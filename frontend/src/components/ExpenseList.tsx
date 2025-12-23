import React, { useEffect, useState } from 'react';
import { Receipt, Edit, X, Save } from 'lucide-react';

interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  categoryId: number;
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchCategories();
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

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditAmount(expense.amount.toString());
    setEditDescription(expense.description);
    setEditDate(expense.date.split('T')[0]);
    setEditCategoryId(expense.categoryId?.toString() || '');
    setEditTags(expense.tags || []);
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          description: editDescription,
          date: new Date(editDate),
          categoryId: parseInt(editCategoryId),
          tags: editTags,
        }),
      });
      if (response.ok) {
        setEditingExpense(null);
        fetchExpenses(); // Refresh list
      } else {
        alert('Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense');
    }
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
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
                  <button
                    onClick={() => handleEditExpense(expense)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px', color: 'var(--text-primary)' }}
                    title="Edit expense"
                  >
                    <Edit size={16} />
                  </button>
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

      {editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Edit Expense</h3>
            <div className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="input-group">
                <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
              {user.tier === 'BUSINESS' && (
                <div className="input-group">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={editTags.join(', ')}
                    onChange={(e) => setEditTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
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

export default ExpenseList;