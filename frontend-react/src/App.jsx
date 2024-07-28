// src/App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import Login from './components/User/Login/Login';
import SignUp from './components/User/SignUp/SignUp';
import About from './components/About/About';
import Trending from './pages/Trending/Trending';
import Settings from './components/User/Settings/Settings';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

const App = () => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/auth/status', {
        credentials: 'include', // include cookies in the request
        headers: {
          'access-token': 'mysecretkey', // Add the custom header here
        },
      });
      const data = await response.json();
      setIsLoggedIn(data.isLoggedIn);
      setUser(data.user);
    } catch (error) {
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible(!isSidebarVisible);
  };

  const ProtectedRoute = ({ element }) => {
    return isLoggedIn ? element : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="app-layout">
        <Footer isSidebarVisible={isSidebarVisible} toggleSidebar={toggleSidebar} />
        <div className="main-content">
          <Header isLoggedIn={isLoggedIn} user={user} />
          <div className="content">
            <main>
              <Routes>
                <Route path="/" element={<Trending />} />
                <Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/about" element={<About />} />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute element={<Home />} />
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute element={<Settings />} />
                  }
                />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;