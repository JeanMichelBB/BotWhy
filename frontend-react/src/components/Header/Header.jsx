import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = ({ isLoggedIn }) => {
    const [isOverlayVisible, setOverlayVisible] = useState(false);

    const toggleOverlay = () => {
        setOverlayVisible(!isOverlayVisible);
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
                                <Link to="/signup" className="header__link">Sign Up</Link>
                                <Link to="/login" className="header__link">Login</Link>
                            </>
                        )}
                    </div>
                </div>
                {isOverlayVisible && (
                    <div className="overlay" onClick={toggleOverlay}>
                        <div className="overlay__content" onClick={(e) => e.stopPropagation()}>
                            <Link to="/settings" className="overlay__link">Settings</Link>
                            <Link to="/signout" className="overlay__link">Sign Out</Link>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;