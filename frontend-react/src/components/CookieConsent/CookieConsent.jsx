import React, { useState, useEffect } from 'react';
import './CookieConsent.css';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie consent">
      <div className="cookie-consent__content">
        <div className="cookie-consent__text">
          <strong className="cookie-consent__title">About Cookies</strong>
          <p>
            <strong>BotWhy</strong> is an AI-powered chat application that lets you ask questions
            and get intelligent answers, built with React, FastAPI, and the OpenAI API.
          </p>
          <p>
            This site uses <strong>Google Sign-In</strong>, which sets a cookie
            (<code>single_host_origin</code>) to manage your authentication session.
            No advertising or third-party tracking cookies are used.
          </p>
        </div>
        <div className="cookie-consent__actions">
          <button className="cookie-consent__btn cookie-consent__btn--decline" onClick={handleDecline}>
            Decline
          </button>
          <button className="cookie-consent__btn cookie-consent__btn--accept" onClick={handleAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
