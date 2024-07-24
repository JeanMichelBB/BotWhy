// src/components/Users/Login/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();  // Use useNavigate hook for navigation

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`http://127.0.0.1:8000/user/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'access-token': 'mysecretkey', // Replace with the actual API key or token
                },
                // No body is needed as parameters are in the URL
            });

            if (!response.ok) {
                throw new Error('Invalid email or password');
            }

            const data = await response.json();
            const token = data.access_token;  // Correctly access the token
            console.log('Login successful, token:', token);
            localStorage.setItem('token', token);
            window.location.href = "/";
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
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
                    <button type="submit" className="login-form-button" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                    {error && <p className="login-error">{error}</p>}
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
};

export default Login;