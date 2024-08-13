// src/components/Header/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const Header = ({ onTokenUpdate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      onTokenUpdate(token);
      setIsAuthenticated(true);
    }
  }, [onTokenUpdate]);

  const handleLoginSuccess = async (credentialResponse) => {
    console.log('Login Success', credentialResponse);
    const idToken = credentialResponse.credential;
    localStorage.setItem('authToken', idToken);
    onTokenUpdate(idToken);

    try {
      const response = await axios.post('http://localhost:8000/user/login', {}, {
        params: { token: idToken },
        headers: { 'accept': 'application/json', 'access-token': 'mysecretkey' }
      });

      if (response.status === 200) {
        setIsAuthenticated(true);
        console.log('User ID:', response.data.user_id);
        window.location.reload();
      }
    } catch (error) {
      console.error('Login failed:', error.response ? error.response.data : error.message);
    }
  };

  const handleLoginError = () => {
    console.log('Login Failed');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    onTokenUpdate(null);
    window.location.reload();
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header__content">
          <div className="header__logo">
            <Link to="/" className="header__logo-link">
              <span>ChatBox</span>
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
                <button onClick={handleLogout} className="header__logout-button">Logout</button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;