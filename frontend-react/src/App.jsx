// src/App.jsx
import React, { useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home/Home';
import Login from './components/User/Login/Login';
import SignUp from './components/User/SignUp/SignUp';
import Subscription from './components/Subscription/Subscription';
import Trending from './pages/Trending/Trending';
import Settings from './components/User/Settings/Settings';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

const App = () => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Simulate login state

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
          <Header isLoggedIn={isLoggedIn} />
          <div className="content">
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/trending" element={<Trending />} />
                <Route 
                  path="/subscription" 
                  element={
                    <ProtectedRoute element={<Subscription />} />
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