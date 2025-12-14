import React, { useState, useEffect } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import './Login.css';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [backgroundImageIndex, setBackgroundImageIndex] = useState(0);
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);


  const backgroundImages = [
    '/20606.jpg',
    '/43398.jpg',
    '/elevated-view-coffee-cup-business-budget-plan-eyeglasses-blue-backdrop.jpg',
    '/flat-lay-work-desk-with-agenda-notebook.jpg',
    '/high-view-piggy-bank-notepads.jpg',
    '/OQECWT0.jpg',
    '/20423.jpg',
    '/35767.jpg',
    '/59105.jpg',
    '/finance-investment-banking-cost-concept.jpg',
    '/frame-device-with-long-term-debt-message.jpg',
    '/table-with-finance-work-stuff-laptop-money-tablet-pen-papers.jpg',
    '/top-view-assortment-finance-word-sticky-notes.jpg'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const body = isRegister ? { email, password, name } : { email, password };
    const url = `https://financial-tracker-ai-insight-a194fc716874.herokuapp.com${endpoint}`;
    console.log('Attempting login/register fetch to:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Success data:', data);
        if (isRegister) {
          alert('Registration successful. Check your email to verify.');
          setIsRegister(false);
        } else {
          onLogin(data.token, data.user);
        }
      } else {
        const errorData = await response.json();
        console.log('Error data:', errorData);
        setError(errorData.error || 'Unknown error');
        if (errorData.error && errorData.error.includes('verify')) {
          setShowResend(true);
        } else {
          alert('Error: ' + errorData.error);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Network error: ' + (error as Error).message);
    }
  };

  return (
    <div className="login-container min-h-screen flex items-center justify-center p-4" style={{
        backgroundImage: `url(${backgroundImages[backgroundImageIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
      <div className="login-card bg-gray-900 border border-gray-700 shadow-2xl rounded-3xl p-8 max-w-md w-full mx-auto">
        <div className="login-header text-center mb-8">
          <div className="glow-title text-xl font-black text-white mb-6 flex flex-col items-center drop-shadow-lg">
            Personal Financial Tracker
            <span className="text-xs font-medium tracking-wider opacity-90 mt-1">AI-Powered Financial Insights</span>
          </div>
          <p className="text-2xl font-bold text-white mb-2">{isRegister ? 'Create Account' : 'Welcome back'}</p>
          <p className="text-gray-400 text-sm">{isRegister ? 'Create your account to get started' : 'Sign in to your account'}</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="input-group">
              <User className="input-icon" size={20} />
              <input
                className="login-input"
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="input-group">
            <Mail className="input-icon" size={20} />
            <input
              className="login-input"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="login-button" type="submit">
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
          {error && (
            <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>
          )}
          {showResend && (
            <button
              type="button"
              style={{
                marginTop: '10px',
                backgroundColor: '#ff9500',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                width: '100%'
              }}
              onClick={async () => {
                const resendUrl = `https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/auth/resend-verification`;
                try {
                  const resp = await fetch(resendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                  });
                  if (resp.ok) {
                    const data = await resp.json();
                    alert(data.message || 'Verification email resent');
                  } else {
                    const errData = await resp.json();
                    alert('Resend failed: ' + (errData.error || 'Unknown error'));
                  }
                } catch (e) {
                  alert('Network error during resend');
                }
                setShowResend(false);
                setError('');
              }}
            >
              Resend verification email
            </button>
          )}
        </form>
        <button className="toggle-link" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>
    </div>
);
};

export default Login;