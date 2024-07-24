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
                <Link to="/" className="footer__link">Trending</Link>
                <Link to="/chat" className="footer__link">ChatBox</Link>
                <div className="footer__about">
                <Link to="/about" className="footer__link">About</Link>
                </div>
            </div>
        </aside>
    );
}

export default Footer;