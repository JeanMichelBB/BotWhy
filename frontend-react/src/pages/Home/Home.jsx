// src/pages/Home/Home.jsx
import React, { useState, useEffect } from 'react';
import './Home.css';
import axios from 'axios';
import { validateMessage, validateTrendingConversation } from '../../utils/validation';

const Home = ({ user_id }) => {
    const [editMode, setEditMode] = useState(false);
    const [checkedItems, setCheckedItems] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [style, setStyle] = useState('');
    const apiUrl = import.meta.env.VITE_API_URL;
    const apiKey = import.meta.env.VITE_API_KEY;


    useEffect(() => {
        const fetchConversation = async () => {
            if (user_id) {
            try {
                const response = await axios.get(`${apiUrl}/chatbox/user/${user_id}/conversation`, {
                    headers: {
                        'accept': 'application/json',
                        'access-token': apiKey
                    }
                });
                const conversationData = response.data;
                setConversation(conversationData);

                // Fetch messages for the conversation
                if (conversationData && conversationData.id) {
                    await fetchMessages(conversationData.id);
                }
            } catch (error) {
                console.error('Failed to fetch conversation or messages:', error);
            }
        }
        };

        fetchConversation();
    }, [user_id]);

    const fetchMessages = async (conversationId) => {
        try {
            const messagesResponse = await axios.get(`${apiUrl}/chatbox/conversation/${conversationId}/messages`, {
                headers: {
                    'accept': 'application/json',
                    'access-token': apiKey
                }
            });
    
            // Sort messages by timestamp in ascending order (oldest first)
            const sortedMessages = messagesResponse.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
            setMessages(sortedMessages);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                setAlertMessage('Start a conversation to try the chatbox');
                setStyle({ backgroundColor: 'rgb(130 130 130)' });
                setShowAlert(true);
            } else {
                console.error('Failed to fetch messages:', error);
            }
        }
    };

    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const createTrendingConversation = async () => {
        if (!user_id) {
            setAlertMessage('Login to try the chatbox');
            setStyle({ backgroundColor: 'rgb(130 130 130)' });
            setShowAlert(true);
            return;
        }

        const errorMessage = validateTrendingConversation(title, description);
        if (errorMessage) {
            console.error(errorMessage);
            setAlertMessage(errorMessage); // Set the error message from validation
            setStyle({ backgroundColor: '#ff4d4d' }); // Red for error
            setShowAlert(true);
            return;
        }

        // Get the selected message IDs based on checkedItems
        const selectedMessageIds = checkedItems.map(index => messages[index].id);

        try {
            // Send the POST request to create a trending conversation
            const response = await axios.post(
                `${apiUrl}/chatbox/user/${user_id}/trending_conversation`,
                selectedMessageIds, // Send message IDs in the request body
                {
                    headers: {
                        'accept': 'application/json',
                        'access-token': apiKey,
                        'Content-Type': 'application/json'
                    },
                    params: { // Pass title and description as query parameters
                        title: title,
                        description: description
                    }
                }
            );

            // Handle the response as needed
            setAlertMessage('Trending Conversation created successfully');
            setStyle({ backgroundColor: '#38c038' });
            setShowAlert(true);

        } catch (error) {
            if (error.response && error.response.status === 400 && error.response.data.detail === 'Trending conversation limit reached') {
                // Handle the specific case where the trending conversation limit is reached
                setAlertMessage('You have reached the maximum number of trending conversations.');
                setStyle({ backgroundColor: '#ff4d4d' }); // Red for error
            } else {
                // Handle other errors
                console.error('Failed to create trending conversation:', error);
                setAlertMessage('Failed to create trending conversation');
                setStyle({ backgroundColor: '#ff4d4d' });
            }
            setShowAlert(true);
        }

        // Clear the selection and inputs after creation
        setCheckedItems([]);
        setTitle('');
        setDescription('');
    };

    const sendMessage = async () => {
        if (!user_id) {
            setAlertMessage('Login to try the chatbox');
            setStyle({ backgroundColor: 'rgb(130 130 130)' });
            setShowAlert(true);
            return;
        }

        const errorMessage = validateMessage(newMessage);
        if (errorMessage) {
            console.error(errorMessage);
            setAlertMessage(errorMessage);
            setStyle({ backgroundColor: '#ff4c4c' }); // Red for error
            setShowAlert(true);
            return;
        }

        try {
            // Send the user's message to the conversation
            const messageResponse = await axios.post(
                `${apiUrl}/chatbox/conversation/${conversation.id}/message?message=${encodeURIComponent(newMessage)}`,
                {},
                {
                    headers: {
                        'accept': 'application/json',
                        'access-token': apiKey
                    }
                }
            );

            // Clear the input field
            setNewMessage('');

            // Fetch messages again to update the list with the user's message
            await fetchMessages(conversation.id);

            // Fetch the bot's response after the user's message has been sent
            const openAIResponse = await axios.post(
                `${apiUrl}/openai/answer`,
                {}, // No request body needed, just URL parameters
                {
                    params: {
                        question: newMessage,  // Use newMessage as the question
                        user_id: conversation.user_id
                    },
                    headers: {
                        'accept': 'application/json',
                        'access-token': apiKey
                    }
                }
            );

            // Fetch messages again to update the list with the bot's response
            await fetchMessages(conversation.id);

        } catch (error) {
            console.error('Failed to send message or fetch OpenAI response:', error);

            // Check for specific error response
            if (error.response) {
                if (error.response.status === 400 && error.response.data.detail === 'Message limit reached') {
                    setAlertMessage('You have reached the message limit.');
                    setStyle({ backgroundColor: '#ff4c4c' }); // Red for error
                } else {
                    setAlertMessage('An error occurred while sending your message.');
                    setStyle({ backgroundColor: '#ff4c4c' }); // Red for error
                }
            } else {
                setAlertMessage('Network error. Please try again later.');
                setStyle({ backgroundColor: '#ff4c4c' }); // Red for error
            }

            setShowAlert(true);
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

    const closeAlert = () => {
        setShowAlert(false);
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
                                    className={`message-container ${message.type === 'user' ? 'message-container--user' : 'message-container--machine'}`}
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
                        {showAlert && (
                            <div className="chatbox__alert" style={style}>
                                {alertMessage}
                                <button className="chatbox__alert-close" onClick={closeAlert}>X</button>
                            </div>
                        )}
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