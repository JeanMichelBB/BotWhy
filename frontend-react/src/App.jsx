// src/App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import About from './components/About/About';
import Trending from './pages/Trending/Trending';
import Settings from './components/Settings/Settings';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import NotFound from './pages/NotFound/NotFound';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';

const App = () => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [idToken, setIdToken] = useState('');
  const [isDecoded, setIsDecoded] = useState(null);
  const [userId, setUserId] = useState(null);

  const toggleSidebar = () => setSidebarVisible(!isSidebarVisible);



  const handleTokenUpdate = () => {
    const storedToken = localStorage.getItem('authToken');
  
    if (!storedToken || storedToken.split('.').length !== 3) {
      setIsLoggedIn(false);
      console.log('Invalid or missing token, user is not logged in.');
      return;
    }
  
    try {
      const decodedToken = jwtDecode(storedToken);
      setIdToken(storedToken);
  
      if (!isDecoded) {
        setIsDecoded(decodedToken);
      }
  
      axios.get('http://localhost:8000/user/protected', {
        params: { token: storedToken },
        headers: { 'accept': 'application/json', 'access-token': 'mysecretkey' }
      })
        .then(response => {
          setIsLoggedIn(response.status === 200);
          console.log(response.status === 200 ? 'Protected route access granted' : 'Protected route access denied');
          console.log('User ID:', response.data.user_id);
          setUserId(response.data.user_id);
        })
        .catch(error => {
          if (error.response) {
            const { status, data } = error.response;
            
            if (error === 404) {
              console.error('404 Error:', data.detail); // Specifically logging the 404 error detail
              handleLogout();
            } else {
              console.error(`Error ${status}:`, data.detail || error.message); // Log the error status and detail
            }
          } else {
            console.error('Protected route access failed:', error.message); // Generic error handling
          }
  
          setIsLoggedIn(false);
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
    return isLoggedIn ? element : <Navigate to="/" />;
  };

  useEffect(() => {
    handleTokenUpdate();
  }, []);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <div className="app-layout">
          <Footer isSidebarVisible={isSidebarVisible} toggleSidebar={toggleSidebar} />
          <div className="main-content">
            <Header onTokenUpdate={handleTokenUpdate} onLogout={handleLogout} />
            <div className="content">
              <main>
                <Routes>
                  <Route path="/" element={<Home user_id={userId} />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/trending" element={<Trending  />} />
                  <Route path="/settings" element={<ProtectedRoute element={<Settings decodedToken={isDecoded} user_id={userId} onLogout={handleLogout} />} />} />
                  <Route path="*" element={<NotFound />} />
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