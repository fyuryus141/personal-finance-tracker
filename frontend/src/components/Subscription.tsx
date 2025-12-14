import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

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

  const API_BASE = process.env.REACT_APP_API_BASE || 'https://financial-tracker-ai-insight-a194fc716874.herokuapp.com';

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/subscriptions?userId=${user.id}`, {
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
      const response = await fetch(`${API_BASE}/payments?userId=${user.id}`, {
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

  const handleUpgrade = async (tierName: string) => {
    console.log('handleUpgrade called with tierName:', tierName);
    console.log('API_BASE:', API_BASE);
    console.log('Token present:', !!token);
    console.log('User id:', user.id);
    try {
      console.log('Sending fetch to:', `${API_BASE}/api/subscription/upgrade`);
      const response = await fetch(`${API_BASE}/api/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: tierName }),
      });
      console.log('Fetch response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Response not ok, error text:', errorText);
        throw new Error(`Failed to initiate upgrade: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Response data:', data);
      const { kofiUrl } = data;
      console.log('Opening kofiUrl:', kofiUrl);
      window.open(kofiUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to start upgrade process. Please try again.');
    }
  };

  const cancelSubscription = async (id: number) => {
    try {
      await fetch(`${API_BASE}/subscriptions/${id}/cancel`, {
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

  const getTiers = () => [
    {
      name: 'Free',
      backendTier: 'FREE',
      price: '0',
      features: [
        'Core features',
        'Basic AI',
        'Monthly reports',
      ],
      buttonText: currentTier === 'FREE' ? 'Current Plan' : 'Downgrade',
      gradientFrom: 'blue',
      gradientTo: 'blue',
      colorClass: 'blue-400',
    },
    {
      name: 'Premium',
      backendTier: 'PREMIUM',
      price: '5',
      features: [
        'Core features',
        'Basic AI',
        'Monthly reports',
        'PDF Export',
        'Custom Reports',
        'Advanced AI',
        'Small Teams (up to 3)',
      ],
      buttonText: currentTier === 'PREMIUM' ? 'Current Plan' : 'Upgrade to Premium',
      gradientFrom: 'emerald',
      gradientTo: 'emerald',
      colorClass: 'emerald-500',
    },
    {
      name: 'Business',
      backendTier: 'BUSINESS',
      price: '10',
      features: [
        'Core features',
        'Basic AI',
        'Monthly reports',
        'PDF Export',
        'Custom Reports',
        'Advanced AI',
        'Small Teams (up to 3)',
        'Unlimited Teams (Groups)',
        'Invoicing',
        'Tax Reports',
      ],
      buttonText: currentTier === 'BUSINESS' ? 'Current Plan' : 'Upgrade to Business',
      gradientFrom: 'orange',
      gradientTo: 'orange',
      colorClass: 'orange-500',
    },
  ];

  const tiers = getTiers();

  const isCurrentTier = (backendTier: string) => currentTier === backendTier;

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg-primary to-bg-secondary py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-4xl md:text-5xl font-black text-text-primary text-center mb-20 bg-gradient-to-r from-accent via-text-primary to-accent bg-clip-text">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {tiers.map((tier) => (
            <div 
              key={tier.name} 
              className={`group relative bg-bg-primary border-4 border-${tier.colorClass}/20 rounded-3xl p-8 lg:p-10 shadow-2xl hover:shadow-3xl hover:-translate-y-3 transition-all duration-500 overflow-hidden ${isCurrentTier(tier.backendTier) ? 'ring-4 ring-emerald-500/50 shadow-emerald-500/25 scale-105' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-accent/5 group-hover:to-accent/20 transition-all duration-500 pointer-events-none" />
              <div className="relative">
                <h3 className="text-2xl lg:text-3xl font-black text-text-primary mb-4 text-center">{tier.name}</h3>
                <p className="text-5xl lg:text-6xl font-black text-text-primary text-center mb-8 bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text leading-tight">
                  ${tier.price}<span className="text-2xl lg:text-3xl">/month</span>
                </p>
                <ul className="space-y-3 mb-12">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-text-secondary group-hover:text-text-primary transition-all duration-300">
                      <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {tier.backendTier === 'FREE' ? (
                  <button 
                    disabled
                    className="w-full py-4 px-8 rounded-2xl font-bold text-lg bg-gray-400 text-white/80 cursor-not-allowed shadow-lg opacity-75"
                  >
                    {tier.buttonText}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpgrade(tier.backendTier === 'PREMIUM' ? 'PREMIUM' : 'BUSINESS')}
                    disabled={isCurrentTier(tier.backendTier)}
                    className={`w-full py-4 px-8 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 text-bg-primary ${isCurrentTier(tier.backendTier) ? 'bg-gray-400 hover:shadow-lg hover:-translate-y-0 cursor-default opacity-75' : `bg-gradient-to-r from-${tier.gradientFrom}-500 to-${tier.gradientTo}-500 hover:from-${tier.gradientFrom}-600 hover:to-${tier.gradientTo}-600`}`}
                  >
                    {tier.buttonText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {subscriptions.length > 0 && (
          <section>
            <h3 className="text-3xl font-black text-text-primary mb-8 text-center">Subscription History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="group bg-bg-primary border border-border rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <h4 className="font-bold text-xl text-text-primary mb-2">{sub.tier}</h4>
                  <p className="text-text-secondary mb-1">Status: <span className={`font-semibold px-2 py-1 rounded-full text-sm ${sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : sub.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{sub.status}</span></p>
                  <p className="text-text-secondary mb-4">Started: {new Date(sub.startDate).toLocaleDateString()}</p>
                  {sub.endDate && <p className="text-text-secondary mb-6">Ends: {new Date(sub.endDate).toLocaleDateString()}</p>}
                  {sub.status === 'ACTIVE' && (
                    <button 
                      onClick={() => cancelSubscription(sub.id)}
                      className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-sm"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {payments.length > 0 && (
          <section className="mt-16">
            <h3 className="text-3xl font-black text-text-primary mb-8 text-center">Payment History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-bg-primary border border-border rounded-2xl p-6 shadow-lg">
                  <p className="text-2xl font-black text-text-primary">${payment.amount} {payment.currency}</p>
                  <p className="text-text-secondary mb-1">Status: <span className={`font-semibold px-2 py-1 rounded-full text-sm ${payment.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>{payment.status}</span></p>
                  <p className="text-text-secondary text-sm">{new Date(payment.timestamp).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Subscription;
