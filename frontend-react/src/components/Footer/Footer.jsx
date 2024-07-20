// src/components/Footer/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = ({ isSidebarVisible, toggleSidebar }) => {
    return (
        <aside className={`footer ${isSidebarVisible ? 'visible' : 'hidden'}`}>
            <div className="footer__logo">
                <button className="footer__button" onClick={toggleSidebar}>☰</button>
            </div>
            <div className={`footer__links ${isSidebarVisible ? 'visible' : 'hidden'}`}>
                <Link to="/" className="footer__link">ChatBox</Link>
                <Link to="/Trending" className="footer__link">Trending</Link>
                <div className="footer__subscription">
                <Link to="/subscription" className="footer__link">Subscription</Link>
                </div>
            </div>
        </aside>
    );
}

export default Footer;