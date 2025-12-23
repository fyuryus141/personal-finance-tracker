import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Loader, Eye, EyeOff, Shield } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
// @ts-ignore
import ReCAPTCHA from 'react-google-recaptcha';
import './Login.css';

const zxcvbn = require('zxcvbn') as any;

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [backgroundImageIndex, setBackgroundImageIndex] = useState(0);
  const [nextBackgroundImageIndex, setNextBackgroundImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isTrustedDevice, setIsTrustedDevice] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);


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
      setIsTransitioning(true);
      setTimeout(() => {
        setBackgroundImageIndex(nextBackgroundImageIndex);
        setNextBackgroundImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
        setIsTransitioning(false);
      }, 1000); // Transition duration
    }, 15000);

    return () => clearInterval(interval);
  }, [nextBackgroundImageIndex]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }

    const storedFailedAttempts = localStorage.getItem('failedLoginAttempts');
    if (storedFailedAttempts) {
      setFailedAttempts(parseInt(storedFailedAttempts, 10));
    }

    const trustedDevice = localStorage.getItem('trustedDevice') === 'true';
    setIsTrustedDevice(trustedDevice);
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    return '';
  };

  const validateName = (name: string) => {
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters long';
    return '';
  };

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email));
  };

  const handlePasswordBlur = () => {
    setPasswordError(validatePassword(password));
    if (isRegister && password) {
      const result = zxcvbn(password);
      setPasswordStrength(result.score);
    }
  };

  const handleNameBlur = () => {
    setNameError(validateName(name));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email address');
      return;
    }
    const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (response.ok) {
        toast.success('Password reset email sent. Check your inbox.');
        setShowForgotPassword(false);
        setForgotEmail('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to send reset email');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const showCaptcha = isRegister || (!isTrustedDevice && failedAttempts >= 3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const nameErr = isRegister ? validateName(name) : '';

    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setNameError(nameErr);

    if (emailErr || passwordErr || nameErr) {
      return; // Don't submit if validation fails
    }

    setIsLoading(true);
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const body = isRegister ? { email, password, name, captchaToken } : { email, password, captchaToken };
    const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
    const url = API_BASE + endpoint;
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
          toast.success('Registration successful. Check your email to verify.');
          setIsRegister(false);
        } else {
          // Reset failed attempts on successful login
          setFailedAttempts(0);
          localStorage.setItem('failedLoginAttempts', '0');

          if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }

          if (rememberDevice) {
            localStorage.setItem('trustedDevice', 'true');
            setIsTrustedDevice(true);
          }

          toast.success('Login successful!');
          onLogin(data.token, data.user);
        }
      } else {
        const errorData = await response.json();
        console.log('Error data:', errorData);

        // Increment failed attempts for login failures
        if (!isRegister && (errorData.error?.includes('Invalid') || errorData.error?.includes('credentials'))) {
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          localStorage.setItem('failedLoginAttempts', newAttempts.toString());
        }

        setError(errorData.error || 'Unknown error');
        if (errorData.error && errorData.error.includes('verify')) {
          setShowResend(true);
        } else {
          toast.error('Error: ' + errorData.error);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Network error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
        backgroundImage: `url(${backgroundImages[backgroundImageIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
      <div
        className="background-image absolute inset-0"
        style={{
          backgroundImage: `url(${backgroundImages[backgroundImageIndex]})`,
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 1s ease-in-out'
        }}
      ></div>
      <div
        className="background-image absolute inset-0"
        style={{
          backgroundImage: `url(${backgroundImages[nextBackgroundImageIndex]})`,
          opacity: isTransitioning ? 1 : 0,
          transition: 'opacity 1s ease-in-out'
        }}
      ></div>
      <div className="login-card bg-gray-900 border border-gray-700 shadow-2xl rounded-3xl p-4 sm:p-6 md:p-8 max-w-sm sm:max-w-md w-full mx-auto">
        <div className="login-header text-center mb-8">
          <div className="glow-title text-lg sm:text-xl font-black text-white mb-4 sm:mb-6 flex flex-col items-center drop-shadow-lg">
            <div className="flex items-center gap-2">
              Personal Financial Tracker
              <Shield className="text-green-400" size={20} />
              {window.location.protocol === 'https:' && <span className="text-green-400 text-xs">🔒 Secure</span>}
            </div>
            <span className="text-xs font-medium tracking-wider opacity-90 mt-1">AI-Powered Financial Insights</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white mb-2">{isRegister ? 'Create Account' : 'Welcome back'}</p>
          <p className="text-gray-400 text-xs sm:text-sm">{isRegister ? 'Create your account to get started' : 'Sign in to your account'}</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="input-group">
              <label htmlFor="name" className="sr-only">Full Name</label>
              <User className="input-icon" size={20} aria-hidden="true" />
              <input
                id="name"
                className="login-input"
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                required
                disabled={isLoading}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              {nameError && <p id="name-error" className="error-text" role="alert">{nameError}</p>}
            </div>
          )}
          <div className="input-group">
            <label htmlFor="email" className="sr-only">Email Address</label>
            <Mail className="input-icon" size={20} aria-hidden="true" />
            <input
              id="email"
              className="login-input"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              required
              disabled={isLoading}
              aria-describedby={emailError ? "email-error" : undefined}
            />
            {emailError && <p id="email-error" className="error-text" role="alert">{emailError}</p>}
          </div>
          {isRegister && (
            <div className="password-requirements mb-4">
              <p className="text-gray-300 text-sm font-medium mb-2">Password Requirements:</p>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Mix of uppercase and lowercase letters</li>
                <li>• Include numbers and special characters</li>
              </ul>
            </div>
          )}
          <div className="input-group relative">
            <label htmlFor="password" className="sr-only">Password</label>
            <Lock className="input-icon" size={20} aria-hidden="true" />
            <input
              id="password"
              className="login-input pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handlePasswordBlur}
              required
              disabled={isLoading}
              aria-describedby={passwordError ? "password-error" : undefined}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {passwordError && <p id="password-error" className="error-text" role="alert">{passwordError}</p>}
            {isRegister && password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className={`strength-fill strength-${passwordStrength}`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  ></div>
                </div>
                <p className="strength-text">
                  {passwordStrength === 0 && 'Very Weak'}
                  {passwordStrength === 1 && 'Weak'}
                  {passwordStrength === 2 && 'Fair'}
                  {passwordStrength === 3 && 'Good'}
                  {passwordStrength === 4 && 'Strong'}
                </p>
              </div>
            )}
          </div>
          {!isRegister && (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    <label htmlFor="rememberMe" className="text-gray-300 text-sm">
                      Remember me
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="rememberDevice"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    <label htmlFor="rememberDevice" className="text-gray-300 text-sm">
                      Remember this device
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-gray-400 hover:text-gray-200 text-sm underline"
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          )}
          {showCaptcha && (
            <div className="mb-4 flex justify-center">
              <ReCAPTCHA
                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Test key
                onChange={(token: string | null) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
          )}
          <button className="login-button" type="submit" disabled={isLoading || (showCaptcha && !captchaToken)}>
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader className="animate-spin mr-2" size={20} />
                Loading...
              </div>
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>
          {error && (
            <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>
          )}
          {showResend && (
            <button
              type="button"
              disabled={isLoading}
              style={{
                marginTop: '10px',
                backgroundColor: isLoading ? '#4a5568' : '#ff9500',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                width: '100%'
              }}
              onClick={async () => {
                const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
                const resendUrl = API_BASE + '/auth/resend-verification';
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

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 id="forgot-password-title" className="text-white text-lg font-semibold mb-4">Reset Password</h3>
            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <label htmlFor="forgot-email" className="block text-gray-300 text-sm mb-2">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Send Reset Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
};

export default Login;