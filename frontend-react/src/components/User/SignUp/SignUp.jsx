// sr/components/Users/SignUp/SignUp.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignUp.css';
const SignUp = () => {


    return (
        <div className="signup">
            <div className="container">
                <h1 className="signup__title">Sign Up</h1>
                <form className="signup__form">
                    <div className="signup__form-group">
                        <label htmlFor="name" className="signup__form-label">Name</label>
                        <input
                            type="text"
                            id="name"
                            className="signup__form-input"
                        />
                    </div>
                    <div className="signup__form-group">
                        <label htmlFor="email" className="signup__form-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="signup__form-input"
                        />
                    </div>
                    <div className="signup__form-group">
                        <label htmlFor="password" className="signup__form-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="signup__form-input"
                        />
                    </div>
                    <button type="submit" className="signup__form-button">Sign Up</button>
                </form>
                    <a href="/login" className="signup__link">Login</a>
            </div>
        </div>
    );
}

export default SignUp;
