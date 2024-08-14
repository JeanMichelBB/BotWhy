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
                        Welcome to our innovative chat application, where the focus is on delivering entertainment rather than utility. Built with the latest technologies, our app combines the power of <strong>FastAPI</strong>, <strong>React Vite</strong>, <strong>MySQL</strong>, <strong>Google Authentication</strong>, and <strong>OpenAI</strong> to create a unique and engaging experience.
                    </p>
                    <p className="about__description">
                        <strong>Key Features:</strong>
                    </p>
                    <ul className="about__features">
                        <li><strong>Useless Chat Responses:</strong> Powered by OpenAI, our chatbot provides humorous, sarcastic, and intentionally unhelpful responses, designed to amuse and entertain rather than inform. This quirky approach ensures that every interaction is light-hearted and fun.</li>
                        <li><strong>Trending Conversations:</strong> Keep track of what's buzzing! Our application allows users to view and interact with trending conversations, showcasing popular chat topics and exchanges. See what's trending and join the conversation in a playful environment.</li>
                        <li><strong>Seamless Authentication:</strong> With Google Authentication integrated, logging in is quick and secure. Enjoy a streamlined user experience without the hassle of remembering multiple passwords.</li>
                        <li><strong>Robust Backend:</strong> Leveraging FastAPI for fast and efficient API development, our application ensures quick responses and smooth operation. The backend is built on MySQL, offering reliable data management and storage.</li>
                        <li><strong>Modern Frontend:</strong> Developed with React Vite, our frontend delivers a responsive and dynamic user interface. Experience a sleek and user-friendly design optimized for performance and ease of use.</li>
                    </ul>
                    <p className="about__description">
                        Join us to explore a chat experience that's as entertaining as it is unique. Whether you're here to enjoy witty banter or see the latest trending topics, our app offers a refreshing twist on traditional chat applications.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default About;