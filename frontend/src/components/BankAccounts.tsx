import React, { useState, useEffect } from 'react';

interface BankAccount {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface BankAccountsProps {
  user: any;
  token: string | null;
  onTransactionsImported?: () => void;
}

const BankAccounts: React.FC<BankAccountsProps> = ({ user, token, onTransactionsImported }) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    if (user) {
      const fetchAccounts = async () => {
        const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/bank-accounts?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setAccounts(data);
      };
      fetchAccounts();
    }
  }, [user]);

  const handleImportTransactions = async () => {
    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/plaid/transactions?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Import response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Imported transactions:', data);
        alert('Transactions imported successfully!');
        onTransactionsImported?.();
      } else {
        const error = await response.json();
        console.error('Import failed:', error);
        alert('Failed to import transactions: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Network error during import:', error);
      alert('Network error while importing transactions');
    }
  };

  return (
    <div style={{ margin: '16px 0', padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
      <h3 style={{ color: '#009688' }}>Linked Bank Accounts</h3>
      {accounts.length === 0 ? (
        <p>No bank accounts linked yet.</p>
      ) : (
        <ul>
          {accounts.map(account => (
            <li key={account.id} style={{ margin: '8px 0' }}>
              {account.name} ({account.type}) - Balance: ${account.balance.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={handleImportTransactions}
        style={{
          backgroundColor: '#4CAF50',
          color: '#FFFFFF',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '8px',
        }}
      >
        Import Transactions
      </button>
    </div>
  );
};

export default BankAccounts;