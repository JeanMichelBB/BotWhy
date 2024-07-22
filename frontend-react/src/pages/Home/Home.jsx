// src/pages/Home/Home.jsx
import React from 'react';
import './Home.css';

const Home = () => {
    return (
        <div className="home">
            <div className="home-container">
                <div className="home__content">
                    <div className="chatbox">
                        <div className="chatbox__messages">
                            {/* Sample messages */}
                            <div className="message message--machine">Hello, how can I help you today?</div>
                            <div className="message message--user">I'm looking for some information.</div>
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
}

export default Home;