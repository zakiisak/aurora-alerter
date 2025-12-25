import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AlertList from './components/AlertList';
import { API_BASE_URL } from './utils/api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('aurora_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aurora_user');
  };

  const handleAutoLogin = async (email) => {
    try {
      // Try to login with the email from the URL
      const loginUrl = `${API_BASE_URL || ''}/api/auth/login`;
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        handleLogin(data.user);
        return;
      }

      // If login fails, try to register (idempotent - won't create duplicate)
      const registerUrl = `${API_BASE_URL || ''}/api/auth/register`;
      const registerResponse = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const registerData = await registerResponse.json();
      if (registerResponse.ok && registerData.user) {
        handleLogin(registerData.user);
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      // If auto-login fails, just show the login form
    }
  };

  useEffect(() => {
    // Check for email parameter in URL (from email link)
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    
    if (emailParam) {
      // Auto-login with email from URL parameter
      handleAutoLogin(emailParam);
      // Clean up URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check if user is stored in localStorage
      const storedUser = localStorage.getItem('aurora_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('aurora_user');
        }
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <AlertList user={user} onLogout={handleLogout} />;
}

export default App;

