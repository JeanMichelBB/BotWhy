// src/components/Header/Header.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ isLoggedIn }) => {
    const [isOverlayVisible, setOverlayVisible] = useState(false);
    const navigate = useNavigate();

    const toggleOverlay = () => {
        setOverlayVisible(!isOverlayVisible);
    };

    const handleSignOut = () => {
        localStorage.removeItem('token'); // Remove the token from local storage
        window.location.href = "/";
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
                            <div className="header__profile-pic-link" onClick={toggleOverlay}>
                                <img src="path/to/profile-pic.jpg" alt="Profile" className="header__profile-pic" />
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="header__link_login">Login</Link>
                                <Link to="/signup" className="header__link">Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
                {isOverlayVisible && (
                    <div className="overlay" onClick={toggleOverlay}>
                        <div className="overlay__content" onClick={(e) => e.stopPropagation()}>
                            <Link to="/settings" className="overlay__link">Settings</Link>
                            <span className="overlay__link" onClick={handleSignOut}>Sign Out</span>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;