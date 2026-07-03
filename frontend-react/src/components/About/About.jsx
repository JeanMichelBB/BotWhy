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
                    <h1 className="about__title">About BotWhy</h1>
                    <p className="about__description">
                        BotWhy is a chat app powered by real AI models — but don't expect helpful answers. The bot is sarcastic, witty, and intentionally useless. That's the point.
                    </p>

                    <p className="about__description"><strong>Free Trial</strong></p>
                    <ul className="about__features">
                        <li>New users get <strong>10 free messages</strong> with no credit card required.</li>
                        <li>Free trial is limited to <strong>gpt-4o-mini</strong>.</li>
                        <li>Once your 10 messages are used, you need to buy credits to continue.</li>
                    </ul>

                    <p className="about__description"><strong>Credits & Pricing</strong></p>
                    <ul className="about__features">
                        <li>Credits are purchased once — <strong>no subscription, no recurring charges</strong>.</li>
                        <li>You are charged only for what you use. Each AI response deducts a small amount based on the model and message length.</li>
                        <li>Cheaper models (like gpt-4o-mini) cost fractions of a cent per message. Premium models cost more.</li>
                        <li>Your balance is displayed in real time. You can check your usage history in <strong>Settings → Credits</strong>.</li>
                    </ul>

                    <p className="about__description"><strong>AI Models</strong></p>
                    <ul className="about__features">
                        <li>Paid users can choose from multiple models: GPT-4o, Claude, Gemini, Llama, and more.</li>
                        <li>Each model has a different cost per message, shown in the model picker.</li>
                        <li>Your last selected model is remembered across sessions.</li>
                    </ul>

                    <p className="about__description"><strong>Other Features</strong></p>
                    <ul className="about__features">
                        <li><strong>Trending Conversations:</strong> Browse and share funny exchanges with the community.</li>
                        <li><strong>Google Login:</strong> Sign in securely with your Google account — no passwords to remember.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default About;