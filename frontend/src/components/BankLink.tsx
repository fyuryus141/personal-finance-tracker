import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';

const BankLink: React.FC = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('FREE');

  useEffect(() => {
    const fetchTier = async () => {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/1`);
      const data = await response.json();
      setTier(data.tier);
    };
    fetchTier();
  }, []);

  useEffect(() => {
    if (tier === 'PREMIUM' || tier === 'BUSINESS') {
      const fetchLinkToken = async () => {
        const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/plaid/link-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 1 }),
        });
        const data = await response.json();
        setLinkToken(data.link_token);
      };
      fetchLinkToken();
    }
  }, [tier]);

  const onSuccess = async (public_token: string) => {
    await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/plaid/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token, userId: 1 }),
    });
    alert('Bank account linked successfully!');
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  if (tier === 'FREE') {
    return (
      <div style={{ margin: '16px 0', padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', position: 'relative' }}>
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
            <p>Upgrade to link bank accounts</p>
          </div>
        </div>
        <h3 style={{ color: '#009688' }}>Link Bank Account (Premium Feature)</h3>
        <button
          disabled
          style={{
            backgroundColor: '#E0E0E0',
            color: '#757575',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'not-allowed',
          }}
        >
          Link Bank Account
        </button>
      </div>
    );
  }

  return (
    <div style={{ margin: '16px 0', padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
      <h3 style={{ color: '#009688' }}>Link Bank Account (Premium Feature)</h3>
      <button
        onClick={() => open()}
        disabled={!ready}
        style={{
          backgroundColor: '#009688',
          color: '#FFFFFF',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Link Bank Account
      </button>
    </div>
  );
};

export default BankLink;