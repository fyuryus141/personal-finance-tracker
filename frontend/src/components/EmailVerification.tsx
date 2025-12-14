import React, { useEffect, useState } from 'react';

const EmailVerification: React.FC = () => {
  const [message, setMessage] = useState<string>('Verifying...');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/auth/verify?token=${token}`)
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            setMessage('Email verified successfully! You can now log in.');
          } else {
            setMessage('Verification failed: ' + data.error);
          }
        })
        .catch(error => {
          setMessage('Verification failed: ' + error.message);
        });
    } else {
      setMessage('No verification token provided.');
    }
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Email Verification</h2>
      <p>{message}</p>
    </div>
  );
};

export default EmailVerification;