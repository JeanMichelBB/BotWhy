// src/pages/Home/Home.jsx

import React, { useState } from 'react';
import './Home.css';

const Home = () => {
    const [editMode, setEditMode] = useState(false);

    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const conversations = [
        { id: 1, type: 'machine', text: 'Hello, how can I help you today?' },
        { id: 2, type: 'user', text: 'I\'m looking for some information.' },
        { id: 3, type: 'machine', text: 'Sure, what kind of information are you looking for?' },
        { id: 4, type: 'user', text: 'Can you tell me more about your services?' },
        { id: 5, type: 'machine', text: 'We offer a wide range of services, including web development, mobile app development, and more.' },
        { id: 6, type: 'user', text: 'That sounds great! How can I get started?' },
        { id: 7, type: 'machine', text: 'You can get started by contacting our sales team at...' },
    ];

    return (
        <div className="home">
            <div className="home-container">
                <div className="home__content">
                    <div className="chatbox">
                        <div className="chatbox__header">
                        {editMode && <button className="chatbox__create">Create</button>}
                            <button className="chatbox__Edit" onClick={toggleEditMode}>
                                {editMode ? 'Cancel Edit' : 'Edit'}
                            </button>
                        </div>
                        <div className="chatbox__messages">
                            {conversations.map((conversation) => (
                                <div
                                    key={conversation.id}
                                    className={`message-container ${conversation.type === 'user' ? 'message-container--user' : ''}`}
                                >
                                    <div className={`message message--${conversation.type}`}>
                                        {conversation.text}
                                    </div>
                                    {editMode && <input type="checkbox" className="message-checkbox" />}
                                </div>
                            ))}
                        </div>
                        <div className="chatbox__input">
                            <input type="text" placeholder="Type a message..." />
                            <button>Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;