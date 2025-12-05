import React, { useState } from 'react';
import CategorySelector from './CategorySelector';

interface SetBudgetFormProps {
  onBudgetAdded: () => void;
  user: any;
  token: string | null;
}

const SetBudgetForm: React.FC<SetBudgetFormProps> = ({ onBudgetAdded, user, token }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [categoryId, setCategoryId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        amount: parseFloat(amount),
        period,
        categoryId: parseInt(categoryId),
        userId: user.id,
      }),
    });
    setName('');
    setAmount('');
    setPeriod('monthly');
    setCategoryId('');
    onBudgetAdded();
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', margin: '16px' }}>
      <h2 style={{ color: '#212121' }}>Set Budget</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#212121' }}>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #757575', borderRadius: '4px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#212121' }}>Amount:</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #757575', borderRadius: '4px', color: '#4CAF50' }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#212121' }}>Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #757575', borderRadius: '4px' }}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#212121' }}>Category:</label>
          <CategorySelector value={categoryId} onChange={setCategoryId} user={user} token={token} />
        </div>
        <button type="submit" style={{ backgroundColor: '#009688', color: '#FFFFFF', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>
          Set Budget
        </button>
      </form>
    </div>
  );
};

export default SetBudgetForm;