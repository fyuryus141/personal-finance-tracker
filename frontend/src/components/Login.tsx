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

  const backgroundImages = [
    '/20606.jpg',
    '/43398.jpg',
    '/elevated-view-coffee-cup-business-budget-plan-eyeglasses-blue-backdrop.jpg',
    '/flat-lay-work-desk-with-agenda-notebook.jpg',
    '/high-view-piggy-bank-notepads.jpg',
    '/OQECWT0.jpg'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 15000); // Change image every 15 seconds

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const body = isRegister ? { email, password, name } : { email, password };
    const url = `${process.env.REACT_APP_API_BASE}${endpoint}`;
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
        alert('Error: ' + errorData.error);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Network error: ' + (error as Error).message);
    }
  };

  return (
    <div
      className="login-container"
      style={{
        backgroundImage: `url(${backgroundImages[backgroundImageIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="login-subtitle">
            {isRegister ? 'Sign up to get started' : 'Sign in to your account'}
          </p>
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
        </form>
        <button className="toggle-link" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>
    </div>
  );
};

export default Login;