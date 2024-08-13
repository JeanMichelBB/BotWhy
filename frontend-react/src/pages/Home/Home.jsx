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
    const [newMessage, setNewMessage] = useState('');

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
                    await fetchMessages(conversationData.id);
                }
            } catch (error) {
                console.error('Failed to fetch conversation or messages:', error);
            }
        };

        fetchConversation();
    }, [user_id]);

    const fetchMessages = async (conversationId) => {
        try {
            const messagesResponse = await axios.get(`http://localhost:8000/chatbox/conversation/${conversationId}/messages`, {
                headers: {
                    'accept': 'application/json',
                    'access-token': 'mysecretkey' // Replace with your actual token
                }
            });

            // Sort messages by timestamp in ascending order (oldest first)
            const sortedMessages = messagesResponse.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setMessages(sortedMessages);
            console.log('Messages:', sortedMessages);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const createTrendingConversation = async () => {
        if (checkedItems.length === 0) {
            console.error('No messages selected to create a trending conversation.');
            return;
        }
    
        // Get the selected message IDs based on checkedItems
        const selectedMessageIds = checkedItems.map(index => messages[index].id);
    
        try {
            // Send the POST request to create a trending conversation
            const response = await axios.post(
                `http://localhost:8000/chatbox/user/${user_id}/trending_conversation`,
                selectedMessageIds, // Send message IDs in the request body
                {
                    headers: {
                        'accept': 'application/json',
                        'access-token': 'mysecretkey', // Replace with your actual token
                        'Content-Type': 'application/json'
                    },
                    params: { // Pass title and description as query parameters
                        title: title,
                        description: description
                    }
                }
            );
    
            // Handle the response as needed
            console.log('Trending Conversation created successfully:', response.data);
    
        } catch (error) {
            console.error('Failed to create trending conversation:', error);
        }
    
        // Clear the selection and inputs after creation
        setCheckedItems([]);
        setTitle('');
        setDescription('');
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !conversation?.id) return;

        try {
            const response = await axios.post(
                `http://localhost:8000/chatbox/conversation/${conversation.id}/message?message=${encodeURIComponent(newMessage)}`,
                {},
                {
                    headers: {
                        'accept': 'application/json',
                        'access-token': 'mysecretkey' // Replace with your actual token
                    }
                }
            );
            console.log('Server response:', response.data);

            // Clear the input and fetch the updated messages
            setNewMessage('');
            await fetchMessages(conversation.id); // Fetch messages again to update the list
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleCheckboxChange = (messageIndex) => {
        if (checkedItems.includes(messageIndex)) {
            // Uncheck the checkbox and remove the item from checkedItems
            const newCheckedItems = checkedItems.filter(item => item !== messageIndex);

            // Check if the remaining items are still consecutive
            const areConsecutive = newCheckedItems.every((item, index) => {
                if (index === 0) return true; // Skip the first item
                return item === newCheckedItems[index - 1] + 1;
            });

            if (areConsecutive) {
                setCheckedItems(newCheckedItems);
            } else {
                // If not consecutive, disable the checkbox
                const newMessages = messages.map((msg, idx) => {
                    if (idx === messageIndex) {
                        return { ...msg, disabled: true };
                    }
                    return msg;
                });
                setMessages(newMessages);
            }
        } else {
            // Check if the new checkbox selection is consecutive (either above or below the existing range)
            if (checkedItems.length === 0 ||
                messageIndex === checkedItems[checkedItems.length - 1] + 1 ||
                messageIndex === checkedItems[0] - 1) {
                // Add the item to checkedItems if it's consecutive
                setCheckedItems([...checkedItems, messageIndex].sort((a, b) => a - b));
            } else {
                // Disable the checkbox if not consecutive
                const newMessages = messages.map((msg, idx) => {
                    if (idx === messageIndex) {
                        return { ...msg, disabled: true };
                    }
                    return msg;
                });
                setMessages(newMessages);
            }
        }
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
                                        required
                                    />
                                    <button className="chatbox__create" onClick={createTrendingConversation}>Trending</button>
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
                                    required
                                />
                            )}
                        </div>
                        <div className="chatbox__messages">
                            {messages.map((message, index) => (
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
                                            checked={checkedItems.includes(index)}
                                            onChange={() => handleCheckboxChange(index)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="chatbox__input">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault(); // Prevent default form submission behavior if inside a form
                                        sendMessage();
                                    }
                                }}
                            />
                            <button onClick={sendMessage}>Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;