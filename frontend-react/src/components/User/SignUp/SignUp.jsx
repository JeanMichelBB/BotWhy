// sr/components/Users/SignUp/SignUp.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignUp.css';

const SignUp = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData({
            ...formData,
            [id]: value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission logic here

        // Redirect to login page after successful sign-up
        navigate('/login');
    };

    return (
        <div className="signup-page">
            <div className="signup-container">
                <h1 className="signup-title">Sign Up</h1>
                <form className="signup-form" onSubmit={handleSubmit}>
                    <div className="signup-form-group">
                        <label htmlFor="username" className="signup-form-label">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="signup-form-input"
                            value={formData.username}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="signup-form-group">
                        <label htmlFor="email" className="signup-form-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="signup-form-input"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="signup-form-group">
                        <label htmlFor="password" className="signup-form-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="signup-form-input"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="signup-form-group">
                        <label htmlFor="confirmPassword" className="signup-form-label">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="signup-form-input"
                        />
                    </div>
                    <button type="submit" className="signup-form-button">Sign Up</button>
                </form>
                <div className="signup-text">
                    Already have an account? <a href="/login" className="signup-link">Login</a>
                </div>
                <div className="signup-or">OR</div>
                <div className="signup-social">
                    <button className="signup-social-button google">Sign Up with Google</button>
                    <button className="signup-social-button microsoft">Sign Up with Microsoft</button>
                    <button className="signup-social-button apple">Sign Up with Apple</button>
                </div>

            </div>
        </div>
    );
};

export default SignUp;