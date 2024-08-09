// src/components/About/About.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './About.css';

const About = () => {
    const [subscribed, setSubscribed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (subscribed) {
            navigate('/chat');
        }
    }, [subscribed, navigate]);

    return (
        <div className="about">
            <div className="container">
                <div className="about__content">
                    <h1 className="about__title">About</h1>
                    <p className="about__description">
                        Provide a brief description of your application here.
                    </p>
                    
                </div>
            </div>
        </div>
    );
}

export default About;