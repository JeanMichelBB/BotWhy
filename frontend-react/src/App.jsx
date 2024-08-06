// src/App.jsx

import React, { useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import About from './components/About/About';
import Trending from './pages/Trending/Trending';
import Settings from './components/Settings/Settings';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import { GoogleOAuthProvider } from '@react-oauth/google';

const App = () => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [googleToken, setGoogleToken] = useState(null); // State to store Google token

  const toggleSidebar = () => {
    setSidebarVisible(!isSidebarVisible);
  };

  const handleTokenUpdate = (token) => {
    console.log('Google Token:', token); // Log the token
    setGoogleToken(token);
  };

  const ProtectedRoute = ({ element }) => {
    if (isLoggedIn) {
      return element;
    }
    return <Navigate to="/" />;
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <div className="app-layout">
          <Footer isSidebarVisible={isSidebarVisible} toggleSidebar={toggleSidebar} />
          <div className="main-content">
            <Header setIsLoggedIn={setIsLoggedIn} onTokenUpdate={handleTokenUpdate} />
            <div className="content">
              <main>
                <Routes>
                  <Route path="/" element={<Trending />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/chat" element={<Home />} />
                  <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
                </Routes>
              </main>
            </div>
          </div>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;