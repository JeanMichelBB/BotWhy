// src/pages/Home/Home.jsx
import React, { useState, useEffect } from 'react';
import './Home.css';
import axios from 'axios';

const Home = ({ user_id }) => {
    const [editMode, setEditMode] = useState(false);
    const [checkedItems, setCheckedItems] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [conversation, setConversation] = useState(null); 
    const [messages, setMessages] = useState([]); 

    useEffect(() => {
        if (!user_id) {
            console.error('Invalid or missing user_id');
            return;
        }

        const fetchConversation = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/chatbox/user/${user_id}/conversation`, {
                    headers: {
                        'accept': 'application/json',
                        'access-token': 'mysecretkey' // Replace with your actual token
                    }
                });
                const conversationData = response.data;
                setConversation(conversationData);
                console.log('Conversation:', conversationData);

                // Fetch messages for the conversation
                if (conversationData && conversationData.id) {
                    const messagesResponse = await axios.get(`http://localhost:8000/chatbox/conversation/${conversationData.id}/messages`, {
                        headers: {
                            'accept': 'application/json',
                            'access-token': 'mysecretkey' // Replace with your actual token
                        }
                    });
                    setMessages(messagesResponse.data);
                    console.log('Messages:', messagesResponse.data);
                }
            } catch (error) {
                console.error('Failed to fetch conversation or messages:', error);
            }
        };

        fetchConversation();
    }, [user_id]);

    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const handleCheckboxChange = (id) => {
        if (checkedItems.includes(id)) {
            setCheckedItems(checkedItems.filter(item => item !== id));
        } else {
            if (
                checkedItems.length === 0 ||
                checkedItems.includes(id - 1) ||
                checkedItems.includes(id + 1)
            ) {
                setCheckedItems([...checkedItems, id].sort((a, b) => a - b));
            }
        }
    };

    const isDisabled = (id) => {
        if (checkedItems.length === 0) return false;
        const minChecked = Math.min(...checkedItems);
        const maxChecked = Math.max(...checkedItems);
        return (
            !checkedItems.includes(id) &&
            !(id === maxChecked + 1 || id === minChecked - 1)
        );
    };

    const createConversation = async () => {
        // Function to create a new conversation
    };

    return (
        <div className="home">
            <div className="home-container">
                <div className="home__content">
                    <div className="chatbox">
                        <div className="chatbox__header">
                            {editMode && (
                                <>
                                    <input 
                                        className='title-input' 
                                        type="text" 
                                        placeholder="Enter title" 
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                    <button className="chatbox__create" onClick={createConversation}>Create</button>
                                </>
                            )}
                            <button className="chatbox__Edit" onClick={toggleEditMode}>
                                {editMode ? 'Cancel Edit' : 'Edit'}
                            </button>
                        </div>
                        <div className="chatbox__description">
                            {editMode && (
                                <input 
                                    className='snippet-input' 
                                    type="text" 
                                    placeholder="Enter short description" 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            )}
                        </div>
                        <div className="chatbox__messages">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`message-container ${message.type === 'user' ? 'message-container--user' : 'message-container--receiver'}`}
                                >
                                    <div className={`message message--${message.type}`}>
                                        {message.content}
                                    </div>
                                    {editMode && (
                                        <input
                                            type="checkbox"
                                            className="message-checkbox"
                                            checked={checkedItems.includes(message.id)}
                                            onChange={() => handleCheckboxChange(message.id)}
                                            disabled={isDisabled(message.id)}
                                        />
                                    )}
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