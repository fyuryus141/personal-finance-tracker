import React, { useState, useEffect } from 'react';

interface SubscriptionProps {
  user: any;
  token: string | null;
}
const Subscription: React.FC<SubscriptionProps> = ({ user, token }) => {
  const [currentTier, setCurrentTier] = useState('FREE');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setCurrentTier(user.tier || 'FREE');
      fetchSubscriptions();
      fetchPayments();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/subscriptions?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/payments?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const getTiers = () => [
    {
      name: 'Free',
      price: '0',
      features: [
        'Basic expense tracking',
        'Manual entry',
        'Basic categorization',
        'Monthly summary reports'
      ],
      buttonText: currentTier === 'FREE' ? 'Current Plan' : 'Downgrade',
      link: null,
      color: '#757575'
    },
    {
      name: 'Premium',
      price: '5',
      features: [
        'Unlimited expenses',
        'OCR receipt scanning',
        'AI anomaly detection',
        'Bank API integration',
        'Advanced visualizations',
        'Email reports'
      ],
      buttonText: currentTier === 'PREMIUM' ? 'Current Plan' : 'Subscribe',
      link: 'https://ko-fi.com/paul5150?amount=5',
      color: '#4CAF50'
    },
    {
      name: 'Business',
      price: '10',
      features: [
        'All Premium features',
        'Multi-user support (up to 5 users)',
        'Advanced reporting and analytics',
        'Priority support',
        'Custom categories and tags',
        'Export data in multiple formats'
      ],
      buttonText: currentTier === 'BUSINESS' ? 'Current Plan' : 'Subscribe',
      link: 'https://ko-fi.com/paul5150?amount=10',
      color: '#009688'
    }
  ];

  const tiers = getTiers();

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', margin: '16px 0' }}>
      <h2 style={{ color: '#212121', textAlign: 'center' }}>Choose Your Plan</h2>
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
        {tiers.map((tier) => (
          <div key={tier.name} style={{
            border: `2px solid ${tier.color}`,
            borderRadius: '8px',
            padding: '16px',
            margin: '8px',
            minWidth: '250px',
            textAlign: 'center'
          }}>
            <h3 style={{ color: tier.color }}>{tier.name}</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#212121' }}>
              ${tier.price}<span style={{ fontSize: '16px' }}>/month</span>
            </p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              {tier.features.map((feature, index) => (
                <li key={index} style={{ color: '#757575', margin: '4px 0' }}>
                  ✓ {feature}
                </li>
              ))}
            </ul>
            {tier.link ? (
              <a
                href={tier.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: tier.color,
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  marginTop: '16px'
                }}
              >
                {tier.buttonText}
              </a>
            ) : (
              <button
                disabled
                style={{
                  backgroundColor: '#E0E0E0',
                  color: '#757575',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  marginTop: '16px'
                }}
              >
                {tier.buttonText}
              </button>
            )}
          </div>
        ))}
      </div>

      {subscriptions.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3>Subscription History</h3>
          {subscriptions.map((sub) => (
            <div key={sub.id} style={{ border: '1px solid #ddd', padding: '8px', margin: '8px 0', borderRadius: '4px' }}>
              <p><strong>{sub.tier}</strong> - Status: {sub.status} - Started: {new Date(sub.startDate).toLocaleDateString()}</p>
              {sub.endDate && <p>Ends: {new Date(sub.endDate).toLocaleDateString()}</p>}
              {sub.status === 'ACTIVE' && (
                <button onClick={() => cancelSubscription(sub.id)} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px' }}>
                  Cancel Subscription
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {payments.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3>Payment History</h3>
          {payments.map((payment) => (
            <div key={payment.id} style={{ border: '1px solid #ddd', padding: '8px', margin: '8px 0', borderRadius: '4px' }}>
              <p>${payment.amount} {payment.currency} - {payment.status} - {new Date(payment.timestamp).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const cancelSubscription = async (id: number) => {
    try {
      await fetch(`${process.env.REACT_APP_API_BASE}/subscriptions/${id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      fetchSubscriptions();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };
};

export default Subscription;