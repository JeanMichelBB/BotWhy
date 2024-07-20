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

    return (
        <div className="login">
            <div className="container">
                <h2 className="login__title">Login</h2>
                <form className="login__form" onSubmit={handleSubmit}>
                    <div className="login__form-group">
                        <label htmlFor="email" className="login__form-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="login__form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="login__form-group">
                        <label htmlFor="password" className="login__form-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="login__form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="login__form-button">Login</button>
                </form>
                <p className="login__text">
                    Don't have an account? <Link to="/signup" className="login__link">Sign up</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;