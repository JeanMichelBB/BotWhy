// src/components/Header/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import { GoogleLogin } from '@react-oauth/google';

const Header = ({ onTokenUpdate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      onTokenUpdate(token);
      setIsAuthenticated(true);
    }
  }, [onTokenUpdate]);

  const handleLoginSuccess = (credentialResponse) => {
    console.log('Login Success:', credentialResponse);
    localStorage.setItem('authToken', credentialResponse.credential);
    onTokenUpdate(credentialResponse.credential);
    setIsAuthenticated(true);
  };

  const handleLoginError = () => {
    console.log('Login Failed');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    onTokenUpdate(null);
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
                clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                text="Sign in with Google"
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
                // ux_mode="redirect"
                useOneTap
                auto_select
                containerProps={{ allow: "identity-credentials-get" }}
                use_fedcm_for_prompt
              />
            ) : (
              <button onClick={handleLogout}>Logout</button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;