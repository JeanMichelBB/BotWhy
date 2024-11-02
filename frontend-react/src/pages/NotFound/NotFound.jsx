import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css'; // Create and style this CSS file as needed

const NotFound = () => {
  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="not-found__link">Go to Home</Link>
      <p style={{ color: 'red' }}>this is a text</p>
      <p style={{ color: 'red' }}>this is a text</p>
    </div>
  );
};

export default NotFound;