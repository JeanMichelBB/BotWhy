// src/components/Footer/Footer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = ({ isSidebarVisible, toggleSidebar }) => {
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const footerRef = useRef(null);

    // Function to check screen size
    const checkScreenSize = () => {
        const isSmall = window.matchMedia("(max-width: 768px)").matches;
        setIsSmallScreen(isSmall);
    };

    // Function to handle clicks outside the footer
    const handleClickOutside = (event) => {
        if (isSidebarVisible && footerRef.current && !footerRef.current.contains(event.target) && isSmallScreen) {
            toggleSidebar(false); // Hide sidebar if clicked outside, screen is small, and sidebar is visible
        }
    };

    // Handle component mount and screen resize
    useEffect(() => {
        checkScreenSize();

        // Hide sidebar initially if the screen is small
        if (window.matchMedia("(max-width: 768px)").matches) {
            toggleSidebar(false);
        }

        window.addEventListener('resize', checkScreenSize);
        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('resize', checkScreenSize);
            document.removeEventListener('click', handleClickOutside);
        };
    }, []); // Empty dependency array to ensure this only runs once on mount

    // Handle link click
    const handleLinkClick = () => {
        if (isSmallScreen) {
            toggleSidebar(false); // Hide sidebar if screen is small
        }
    };

    return (
        <aside ref={footerRef} className={`footer ${isSidebarVisible ? 'visible' : 'hidden'}`}>
            <div className="footer__logo">
                <button className="footer__button" onClick={toggleSidebar}>☰</button>
            </div>
            <div className={`footer__links ${isSidebarVisible ? 'visible' : 'hidden'}`}>
                <Link to="/" className="footer__link" onClick={handleLinkClick}>BotWhy</Link>
                <Link to="/trending" className="footer__link" onClick={handleLinkClick}>Trending</Link>
                <div className="footer__about">
                    <Link to="/about" className="footer__link" onClick={handleLinkClick}>About</Link>
                </div>
            </div>
        </aside>
    );
};

export default Footer;