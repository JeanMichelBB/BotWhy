// src/components/Header/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = ({ isLoggedIn, user }) => {
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8000/auth/google";
  };

  const handleLogout = () => {
    window.location.href = "http://localhost:8000/auth/logout";
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
            {isLoggedIn ? (
              <>
                <img src={user.picture} alt="Profile" className="header__profile-pic" />
                <button onClick={handleLogout} className="header__link_login">Logout</button>
              </>
            ) : (
              <button onClick={handleGoogleLogin} className="header__google-login-button">
                Login with Google
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;