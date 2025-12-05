import React, { useEffect, useState } from 'react';

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

interface AIInsightsProps {
  user: any;
  token: string | null;
}

const AIInsights: React.FC<AIInsightsProps> = ({ user, token }) => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tier, setTier] = useState<string>('FREE');

  useEffect(() => {
    if (user) {
      const fetchTier = async () => {
        const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setTier(data.tier);
      };
      fetchTier();
    }
  }, [user]);

  useEffect(() => {
    if (tier === 'PREMIUM' || tier === 'BUSINESS') {
      fetchExpenses();
    }
  }, [tier]);

  const fetchExpenses = async () => {
    const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/expenses?userId=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setExpenses(data);
    await fetchAnomalies(data);
  };

  const fetchAnomalies = async (expenseData: Expense[]) => {
    const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/ai-anomaly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expenses: expenseData }),
    });
    const data = await response.json();
    setAnomalies(data);
  };

  const getExpenseById = (id: number) => expenses.find(e => e.id === id);

  if (tier === 'FREE') {
    return (
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', margin: '16px', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
            <h4>Premium Feature</h4>
            <p>Upgrade for AI anomaly detection</p>
          </div>
        </div>
        <h2 style={{ color: '#F44336' }}>AI Anomaly Alerts</h2>
        <p style={{ color: '#757575' }}>No anomalies detected.</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', margin: '16px' }}>
      <h2 style={{ color: '#F44336' }}>AI Anomaly Alerts</h2>
      {anomalies.length === 0 ? (
        <p style={{ color: '#757575' }}>No anomalies detected.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {anomalies.map((anomaly) => {
            const expense = getExpenseById(anomaly.id);
            return (
              <li key={anomaly.id} style={{ padding: '8px 0', borderBottom: '1px solid #F5F5F5', backgroundColor: '#FFEBEE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#212121' }}>{expense?.description}</span>
                  <span style={{ color: '#F44336' }}>-${expense?.amount.toFixed(2)}</span>
                </div>
                <div style={{ color: '#F44336', fontSize: '14px', fontWeight: 'bold' }}>
                  {anomaly.explanation}
                </div>
                <div style={{ color: '#757575', fontSize: '12px' }}>
                  {expense?.category.name} - {expense ? new Date(expense.date).toLocaleDateString() : ''}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AIInsights;