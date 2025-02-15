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
  const googleClientId = "1047061356868-t3oi24d1ckit51c7dne41i4fodfu9p1v.apps.googleusercontent.com";

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
                clientId={googleClientId}
                containerProps={{ allow: "identity-credentials-get" }}
                use_fedcm_for_prompt
                cookiePolicy={'single_host_origin'}
                buttonText=""
                mode="redirect"
                redirectUri={window.location.origin}
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