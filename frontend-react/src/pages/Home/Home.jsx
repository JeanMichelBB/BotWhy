// src/pages/Home/Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Home.css';
import axios from 'axios';
import { validateMessage, validateTrendingConversation } from '../../utils/validation';
import { apiUrl } from '../../api';
import InsufficientCreditsModal from '../../components/InsufficientCreditsModal/InsufficientCreditsModal';
import { useCredits } from '../../hooks/useCredits';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import VoiceModeButton from '../../components/VoiceModeButton/VoiceModeButton';

const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('authToken')}` });

const MODELS = [
    { id: 'openai/gpt-4o-mini',                  label: 'gpt-4o-mini',        tier: 1, price: '$0.15 / 1M' },
    { id: 'openai/gpt-4o',                       label: 'gpt-4o',             tier: 2, price: '$2.50 / 1M' },
    { id: 'anthropic/claude-3-haiku',            label: 'claude-3-haiku',     tier: 1, price: '$0.25 / 1M' },
    { id: 'anthropic/claude-sonnet-4.5',         label: 'claude-sonnet-4.5',  tier: 2, price: '$3.00 / 1M' },
    { id: 'anthropic/claude-opus-4.5',           label: 'claude-opus-4.5',    tier: 3, price: '$15.00 / 1M' },
    { id: 'google/gemini-2.5-flash',             label: 'gemini-2.5-flash',   tier: 1, price: '$0.15 / 1M' },
    { id: 'google/gemini-2.5-pro',               label: 'gemini-2.5-pro',     tier: 2, price: '$1.25 / 1M' },
    { id: 'meta-llama/llama-3.3-70b-instruct',   label: 'llama-3.3-70b',      tier: 1, price: '$0.59 / 1M' },
];

const Home = ({ user_id, is_free_tier = false, free_messages_remaining = 10 }) => {
    const [messagesLeft, setMessagesLeft] = useState(free_messages_remaining);
    useEffect(() => { setMessagesLeft(free_messages_remaining); }, [free_messages_remaining]);
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
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const savedModel = !is_free_tier && localStorage.getItem('selectedModel');
    const [currentModel, setCurrentModel] = useState(savedModel || 'openai/gpt-4o-mini');
    const [modelTier, setModelTier] = useState(
        MODELS.find(m => m.id === (savedModel || 'openai/gpt-4o-mini'))?.tier || 1
    );
    const [showModelPicker, setShowModelPicker] = useState(false);
    const modelPickerRef = useRef(null);
    const { balanceDisplay } = useCredits();
    const voiceReplies = useSpeechSynthesis();
    const speechRecognition = useSpeechRecognition({
        onResult: (transcript) => {
            setNewMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        },
        onError: (error) => {
            if (error === 'not-allowed') {
                setAlertMessage('Microphone access denied. Check your browser\'s site permissions.');
                setStyle({ backgroundColor: 'rgb(130 130 130)' });
                setShowAlert(true);
            }
        },
    });

    const handleVoiceModeTap = () => {
        if (speechRecognition.isListening) {
            speechRecognition.stop();
            return;
        }
        if (!voiceReplies.enabled) {
            voiceReplies.setEnabled(true);
        }
        speechRecognition.start();
    };

    const handleVoiceModeExit = () => {
        speechRecognition.stop();
        voiceReplies.setEnabled(false);
        voiceReplies.stop();
    };

    useEffect(() => {
        if (!showModelPicker) return;
        const handler = (e) => {
            if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
                setShowModelPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showModelPicker]);

    useEffect(() => {
        axios.get(`${apiUrl}/config`).then((res) => {
            const stored = !is_free_tier && localStorage.getItem('selectedModel');
            if (!stored) {
                setCurrentModel(res.data.model || '');
                setModelTier(res.data.model_tier || null);
            }
        });
    }, []);

    const handleSessionExpired = () => {
        sessionStorage.setItem('sessionExpired', 'Session expired. Please log in again.');
        localStorage.removeItem('authToken');
        window.location.reload();
    };

    useEffect(() => {
        const expired = sessionStorage.getItem('sessionExpired');
        if (expired) {
            sessionStorage.removeItem('sessionExpired');
            setAlertMessage(expired);
            setStyle({ backgroundColor: 'rgb(130 130 130)' });
            setShowAlert(true);
        }

        const fetchConversation = async () => {
            if (user_id) {
            try {
                const response = await axios.get(`${apiUrl}/chatbox/user/${user_id}/conversation`, {
                    headers: {
                        'accept': 'application/json',
                        ...getAuthHeader()
                    }
                });
                const conversationData = response.data;
                setConversation(conversationData);

                // Fetch messages for the conversation
                if (conversationData && conversationData.id) {
                    await fetchMessages(conversationData.id);
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    handleSessionExpired();
                } else {
                    console.error('Failed to fetch conversation or messages:', error);
                }
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
                    ...getAuthHeader()
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
                        ...getAuthHeader(),
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
                        ...getAuthHeader()
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
                        question: newMessage,
                        user_id: conversation.user_id,
                        model: currentModel,
                    },
                    headers: {
                        'accept': 'application/json',
                        ...getAuthHeader()
                    }
                }
            );

            // Fetch messages again to update the list with the bot's response
            await fetchMessages(conversation.id);

            voiceReplies.speak(openAIResponse.data.answer);

            if (is_free_tier) {
                setMessagesLeft(prev => Math.max(0, prev - 1));
            }

        } catch (error) {
            console.error('Failed to send message or fetch OpenAI response:', error);

            // Check for specific error response
            if (error.response) {
                if (error.response.status === 402) {
                    setShowCreditsModal(true);
                    return;
                } else if (error.response.status === 400 && error.response.data.detail === 'Message limit reached') {
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
                            {speechRecognition.isSupported && (
                                <VoiceModeButton
                                    isListening={speechRecognition.isListening}
                                    voiceRepliesEnabled={voiceReplies.enabled}
                                    onTap={handleVoiceModeTap}
                                    onExit={handleVoiceModeExit}
                                />
                            )}
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
                            <div className="chatbox__model-controls" ref={modelPickerRef}>
                                <div className={`chatbox__model-picker${showModelPicker ? ' chatbox__model-picker--open' : ''}`}>
                                    <div className="chatbox__model-picker-header">
                                        <span className="chatbox__model-picker-balance">Balance: {balanceDisplay}</span>
                                        <button className="chatbox__model-picker-close" onClick={() => setShowModelPicker(false)}>×</button>
                                    </div>
                                    {!user_id && (
                                        <div className="chatbox__model-picker-free-notice">
                                            <a href="#" onClick={e => { e.preventDefault(); }} className="chatbox__model-picker-free-link">Login</a> to select a model.
                                        </div>
                                    )}
                                    {is_free_tier && user_id && (
                                        <div className="chatbox__model-picker-free-notice">
                                            Free trial · {messagesLeft} message{messagesLeft !== 1 ? 's' : ''} left.{' '}
                                            <a href="/credits" className="chatbox__model-picker-free-link">Buy credits</a> to unlock all models.
                                        </div>
                                    )}
                                    <div className="chatbox__model-picker-list">
                                        {MODELS.map(m => {
                                            const locked = !user_id || (is_free_tier && m.id !== 'openai/gpt-4o-mini');
                                            return (
                                                <button
                                                    key={m.id}
                                                    className={`chatbox__model-option${currentModel === m.id ? ' chatbox__model-option--active' : ''}${locked ? ' chatbox__model-option--locked' : ''}`}
                                                    onClick={() => {
                                                        if (locked) return;
                                                        setCurrentModel(m.id);
                                                        setModelTier(m.tier);
                                                        localStorage.setItem('selectedModel', m.id);
                                                        setShowModelPicker(false);
                                                    }}
                                                    disabled={locked}
                                                >
                                                    <span className="chatbox__model-option-check">{currentModel === m.id ? '✓' : ''}</span>
                                                    <span className="chatbox__model-option-label">
                                                        {m.label}
                                                        {m.id === 'openai/gpt-4o-mini' && is_free_tier && (
                                                            <span className="chatbox__model-option-free-badge">Free</span>
                                                        )}
                                                    </span>
                                                    <span className="chatbox__model-option-meta">
                                                        {locked ? (
                                                            <span className="chatbox__model-option-locked-label">🔒 Upgrade</span>
                                                        ) : (
                                                            <>
                                                                <span className="chatbox__model-tier">
                                                                    {[1,2,3].map(i => (
                                                                        <span key={i} className={`chatbox__model-tier-dot ${i <= m.tier ? 'chatbox__model-tier-dot--on' : ''}`} />
                                                                    ))}
                                                                </span>
                                                                <span className="chatbox__model-option-price">{m.price}</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                {currentModel && (
                                    <span className="chatbox__model-info">
                                        <span className="chatbox__model-label">{currentModel.split('/').pop()}</span>
                                        <span className="chatbox__model-tier">
                                            {[1,2,3].map(i => (
                                                <span key={i} className={`chatbox__model-tier-dot ${modelTier && i <= modelTier ? 'chatbox__model-tier-dot--on' : ''}`} />
                                            ))}
                                        </span>
                                    </span>
                                )}
                                <button
                                    className={`chatbox__model-btn${is_free_tier ? ' chatbox__model-btn--free' : ''}`}
                                    onClick={() => setShowModelPicker(v => !v)}
                                >
                                    {is_free_tier
                                        ? <span className="chatbox__model-btn-count">{messagesLeft}</span>
                                        : <span className="chatbox__model-dot" />
                                    }
                                </button>
                            </div>
                            <button className="chatbox__send-btn" onClick={sendMessage}>
                                <span className="chatbox__send-text">Send</span>
                                <span className="chatbox__send-arrow">&#8629;</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showCreditsModal && (
                <InsufficientCreditsModal onClose={() => setShowCreditsModal(false)} />
            )}
        </div>
    );
};

export default Home;