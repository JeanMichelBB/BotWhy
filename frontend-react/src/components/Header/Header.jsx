// src/components/Header/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const Header = ({ onTokenUpdate, onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const apiKey = import.meta.env.VITE_API_KEY;

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      onTokenUpdate(token);
      setIsAuthenticated(true);
    }
  }, [onTokenUpdate]);

  const handleLoginSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    localStorage.setItem('authToken', idToken);
    onTokenUpdate(idToken);
    try {
      const response = await axios.post(`${apiUrl}/user/login`, {}, {
        params: { token: idToken },
        headers: { 'accept': 'application/json', 'access-token': apiKey }
      });

      if (response.status === 200) {
        setIsAuthenticated(true);
        window.location.reload();
      }
    } catch (error) {
      console.error('Login failed:', error.response ? error.response.data : error.message);
    }
  };

  const handleLoginError = () => {
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header__content">
          <div className="header__logo">
            <Link to="/" className="header__logo-link">
              <span>BotWhy</span>
            </Link>
          </div>

          <div className="header__nav">
            {!isAuthenticated ? (
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
                useOneTap
                auto_select
                clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                containerProps={{ allow: "identity-credentials-get" }}
                use_fedcm_for_prompt
              />
            ) : (
              <>
                <Link to="/settings" className="header__settings-link">Settings</Link>
                <button onClick={onLogout} className="header__logout-button">Logout</button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;