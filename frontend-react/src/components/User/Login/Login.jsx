// src/components/Users/Login/Login.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Email:', email);
        console.log('Password:', password);
    };

    const handleGoogleLogin = () => {
        console.log('Google login');
        // Add Google login logic here
    };

    const handleMicrosoftLogin = () => {
        console.log('Microsoft login');
        // Add Microsoft login logic here
    };

    const handleAppleLogin = () => {
        console.log('Apple login');
        // Add Apple login logic here
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <h2 className="login-title">Login</h2>
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-form-group">
                        <label htmlFor="email" className="login-form-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="login-form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="login-form-group">
                        <label htmlFor="password" className="login-form-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="login-form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="login-form-button">Login</button>
                </form>
                <p className="login-text">
                    Don't have an account? <Link to="/signup" className="login-link">Sign up</Link>
                </p>
                <span className="login-or">OR</span>
                <div className="login-social">
                    <button className="login-social-button google" onClick={handleGoogleLogin}>
                        Login with Google
                    </button>
                    <button className="login-social-button microsoft" onClick={handleMicrosoftLogin}>
                        Login with Microsoft
                    </button>
                    <button className="login-social-button apple" onClick={handleAppleLogin}>
                        Login with Apple
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;