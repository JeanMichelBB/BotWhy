// src/App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import About from './components/About/About';
import Trending from './pages/Trending/Trending';
import Settings from './components/Settings/Settings';
import Credits from './pages/Credits/Credits';
import Usage from './pages/Usage/Usage';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import NotFound from './pages/NotFound/NotFound';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';
import { apiUrl } from './api';
import CookieConsent from './components/CookieConsent/CookieConsent';
import AdminLayout from './pages/Admin/AdminLayout';

const App = () => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [idToken, setIdToken] = useState('');
  const [isDecoded, setIsDecoded] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isFreeTier, setIsFreeTier] = useState(false);
  const [freeMessagesRemaining, setFreeMessagesRemaining] = useState(10);
  const [role, setRole] = useState('user');


  const toggleSidebar = () => setSidebarVisible(!isSidebarVisible);



  const handleTokenUpdate = () => {
    const storedToken = localStorage.getItem('authToken');
  
    if (!storedToken || storedToken.split('.').length !== 3) {
      setIsLoggedIn(false);
      setAuthChecked(true);
      return;
    }
  
    try {
      const decodedToken = jwtDecode(storedToken);
      setIdToken(storedToken);
  
      if (!isDecoded) {
        setIsDecoded(decodedToken);
      }
  
      axios.get(`${apiUrl}/user/protected`, {
        headers: { 'accept': 'application/json', 'Authorization': `Bearer ${storedToken}` }
      })
        .then(response => {
          setIsLoggedIn(response.status === 200);
          setUserId(response.data.user_id);
          setIsFreeTier(response.data.is_free_tier ?? false);
          setFreeMessagesRemaining(response.data.free_messages_remaining ?? 10);
          setRole(response.data.role ?? 'user');
          setAuthChecked(true);
        })
        .catch(error => {
          if (error.response) {
            const { status, data } = error.response;
            if (status === 401 && localStorage.getItem('authToken')) {
              sessionStorage.setItem('sessionExpired', 'Session expired. Please log in again.');
              handleLogout();
            } else {
              console.error(`Error ${status}:`, data?.detail || error.message);
              setIsLoggedIn(false);
            }
          } else {
            console.error('Protected route access failed:', error.message);
            setIsLoggedIn(false);
          }
          setAuthChecked(true);
        });
    } catch (error) {
      console.error('Error decoding token:', error.message);
      setIsLoggedIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setIdToken('');
    setIsDecoded(null);
    setUserId(null);
    window.location.reload();
  };

  const ProtectedRoute = ({ element }) => {
    if (!authChecked) return null;
    return isLoggedIn ? element : <Navigate to="/" />;
  };

  const AdminRoute = ({ element }) => {
    if (!authChecked) return null;
    return (isLoggedIn && role === 'admin') ? element : <Navigate to="/" />;
  };

  useEffect(() => {
    handleTokenUpdate();
  }, []);

  return (
    <GoogleOAuthProvider clientId={"1047061356868-t3oi24d1ckit51c7dne41i4fodfu9p1v.apps.googleusercontent.com"}>
      <Router>
        <div className="app-layout">
          <Footer isSidebarVisible={isSidebarVisible} toggleSidebar={toggleSidebar} />
          <div className="main-content">
            <Header onTokenUpdate={handleTokenUpdate} onLogout={handleLogout} />
            <div className="content">
              <main>
                <Routes>
                  <Route path="/" element={<Home user_id={userId} is_free_tier={isFreeTier} free_messages_remaining={freeMessagesRemaining} />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/trending" element={<Trending user_id={userId} />} />
                  <Route path="/settings" element={<ProtectedRoute element={<Settings decodedToken={isDecoded} user_id={userId} onLogout={handleLogout} role={role} />} />} />
                  <Route path="/credits" element={<ProtectedRoute element={<Credits />} />} />
                  <Route path="/usage" element={<ProtectedRoute element={<Usage />} />} />
                  <Route path="/admin/*" element={<AdminRoute element={<AdminLayout />} />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </div>
      </Router>
      <CookieConsent />
    </GoogleOAuthProvider>
  );
};

export default App;