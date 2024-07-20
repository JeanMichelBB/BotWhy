// src/components/Subscription/Subscription.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Subscription.css';

const Subscription = () => {
    const [subscribed, setSubscribed] = useState(false);
    const navigate = useNavigate();
    
    useEffect(() => {
        if (subscribed) {
        navigate('/chat');
        }
    }, [subscribed, navigate]);
    
    return (
        <div className="subscription">
        <div className="container">
            <div className="subscription__content">
            <h1 className="subscription__title">Subscribe to our service</h1>
            <p className="subscription__description">
                Subscribe to our service to get access to all the features we offer.
            </p>
            <button
                className="subscription__button"
                onClick={() => setSubscribed(true)}
            >
                Subscribe
            </button>
            </div>
        </div>
        </div>
    );
    }

export default Subscription;