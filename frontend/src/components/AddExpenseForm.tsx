import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import CategorySelector from './CategorySelector';

interface AddExpenseFormProps {
  onExpenseAdded: () => void;
  amount: string;
  setAmount: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  tags: string[];
  setTags: (value: string[]) => void;
  user: any;
  token: string | null;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ onExpenseAdded, amount, setAmount, description, setDescription, date, setDate, categoryId, setCategoryId, tags, setTags, user, token }) => {

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {
      amount: parseFloat(amount),
      description,
      date,
      categoryId: parseInt(categoryId),
      userId: user.id,
    };
    if (user.tier === 'BUSINESS') {
      body.tags = tags;
    }
    const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
    await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    onExpenseAdded();
  };

  return (
    <div>
      <h2 className="component-title">
        <PlusCircle size={20} />
        Add Expense
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: 'var(--text-primary)' }}>Amount:</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)', transition: 'border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease' }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: 'var(--text-primary)' }}>Description:</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)', transition: 'border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease' }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: 'var(--text-primary)' }}>Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)', transition: 'border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease' }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: 'var(--text-primary)' }}>Category:</label>
          <CategorySelector value={categoryId} onChange={setCategoryId} user={user} token={token} />
        </div>
        {user.tier === 'BUSINESS' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: 'var(--text-primary)' }}>Tags (comma separated):</label>
            <input
              type="text"
              value={tags.join(', ')}
              onChange={(e) => setTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)', transition: 'border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease' }}
              placeholder="e.g., work, travel, food"
            />
          </div>
        )}
        <button type="submit" style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)', padding: '8px 16px', border: 'none', borderRadius: '4px', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
          Add Expense
        </button>
      </form>
    </div>
  );
};

export default AddExpenseForm;