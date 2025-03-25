// src/pages/Trending/Trending.jsx

import React, { useState, useEffect } from 'react';
import './Trending.css';
import { apiUrl, apiKey } from '../../api';

const Trending = () => {
    const [expandedConversationId, setExpandedConversationId] = useState(null);
    const [commentsVisible, setCommentsVisible] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [reportOverlayVisible, setReportOverlayVisible] = useState(false);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState({});


    // Fetch trending conversations
    useEffect(() => {
        fetch(`${apiUrl}/chatbox/trending_conversations`, {
            headers: {
                'accept': 'application/json',
                'access-token': apiKey,
            },
        })
            .then(response => response.json())
            .then(data => setConversations(data))
            .catch(error => console.error('Error fetching conversations:', error));
    }, []);

    // Fetch messages for a specific conversation
    const fetchMessages = async (id) => {
        try {
            const response = await fetch(`${apiUrl}/chatbox/trending_conversation/${id}/messages`, {
                headers: {
                    'accept': 'application/json',
                    'access-token': apiKey,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const data = await response.json();
            // Sort messages by timestamp in ascending order (oldest first)
            const sortedMessages = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            setMessages(prevMessages => ({ ...prevMessages, [id]: sortedMessages }));
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const toggleConversation = (id) => {
        if (expandedConversationId === id) {
            setExpandedConversationId(null);
        } else {
            setExpandedConversationId(id);
            if (!messages[id]) {
                fetchMessages(id);
            }
        }
        setCommentsVisible(null);
    };

    const handleLike = (id) => {
        const likeButton = document.getElementById(`like-button-${id}`);
        likeButton.style.opacity = likeButton.style.opacity === '0.5' ? '1' : '0.5';
    };

    const toggleComments = (id) => {
        setCommentsVisible(commentsVisible === id ? null : id);
        const commentButton = document.getElementById(`comment-button-${id}`);
        commentButton.style.opacity = commentButton.style.opacity === '0.5' ? '1' : '0.5';
    };

    const handleCommentChange = (event) => {
        setNewComment(event.target.value);
    };

    const handleAddComment = (id) => {
        setNewComment(''); // Clear the input field
    };

    const openReportOverlay = (id) => {
        setSelectedConversationId(id);
        setReportOverlayVisible(true);
    };

    const closeReportOverlay = () => {
        setReportOverlayVisible(false);
        setSelectedConversationId(null);
    };

    const handleReportSubmit = () => {
        closeReportOverlay();
    };

    return (
        <div className="trending">
            <div className="trending-container">
                <div className="trending__content">
                    <h1 className="trending__title">Trending Conversations</h1>
                    <div className="trending__list">
                        {conversations.length === 0 &&
                            <div className="no-conversations">
                                <h2>No Trending Conversations</h2>
                                <p>No trending conversations available at the moment.</p>
                                <p>It looks like the community is quiet right now. But don't worry, you can be the one to get things started!</p>
                                <p>Consider sharing your thoughts or starting a discussion on a topic that interests you. Your conversation could be the next big thing that everyone talks about!</p>

                                <p>Or, if you’re just browsing, check back later. New trending conversations are always just around the corner.</p>
                                <p>Happy chatting!</p>
                            </div>
                        }
                        {conversations.map(conversation => (
                            <div
                                key={conversation.id}
                                className={`conversation ${expandedConversationId === conversation.id ? 'expanded' : ''}`}
                            >
                                <h2 className="conversation__title">
                                    {conversation.title}
                                    <button onClick={() => openReportOverlay(conversation.id)} className="three-dots-button">
                                        <div className="test"></div>
                                    </button>
                                </h2>
                                <p className="conversation__snippet">{conversation.description}</p>
                                <div className="conversation__fullText">
                                    {expandedConversationId === conversation.id && (
                                        <div className="conversation__messages">
                                            {(messages[conversation.id] && Array.isArray(messages[conversation.id])) ? (
                                                messages[conversation.id].map(message => (
                                                    <div
                                                        key={message.id}
                                                        className={`message message--${message.type}`}
                                                    >
                                                        {message.type === 'user' ? 'User' : 'Machine'}: {message.content}
                                                    </div>
                                                ))
                                            ) : (
                                                <p>Loading messages...</p>
                                            )}
                                            <div className="conversation__likes">
                                                <button
                                                    id={`like-button-${conversation.id}`}
                                                    onClick={() => handleLike(conversation.id)}
                                                    className="like-button"
                                                >
                                                    👍 {conversation.likes.length} Likes
                                                </button>
                                                <button
                                                    id={`comment-button-${conversation.id}`}
                                                    onClick={() => toggleComments(conversation.id)}
                                                    className="comment-toggle-button"
                                                >
                                                    Comments
                                                </button>
                                            </div>
                                            {commentsVisible === conversation.id && (
                                                <div className="conversation__comments">
                                                    <input
                                                        type="text"
                                                        value={newComment}
                                                        onChange={handleCommentChange}
                                                        placeholder="Add a comment..."
                                                        className="comment-input"
                                                    />
                                                    <button
                                                        onClick={() => handleAddComment(conversation.id)}
                                                        className="add-comment-button"
                                                    >
                                                        Add Comment
                                                    </button>
                                                    {conversation.comments.length > 0 ? (
                                                        conversation.comments.map((comment, index) => (
                                                            <div key={index} className="comment">
                                                                <strong>{comment.user}</strong>: {comment.text}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p>No comments yet.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => toggleConversation(conversation.id)}
                                    className="conversation__toggleButton"
                                >
                                    {expandedConversationId === conversation.id ? 'Show less' : 'Read more'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Report Overlay */}
            {reportOverlayVisible && (
                <div className="report-overlay">
                    <div className="report-overlay-content">
                        <h2>Report Conversation</h2>
                        <p>Are you sure you want to report this conversation?</p>
                        <div className="report-overlay-buttons">
                            <button onClick={handleReportSubmit} className="report-submit-button">Report</button>
                            <button onClick={closeReportOverlay} className="report-cancel-button">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Trending;