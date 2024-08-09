// src/pages/Trending/Trending.jsx
import React, { useState } from 'react';
import './Trending.css';

const Trending = () => {
    const [expandedConversationId, setExpandedConversationId] = useState(null);
    const [commentsVisible, setCommentsVisible] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [reportOverlayVisible, setReportOverlayVisible] = useState(false);
    const [selectedConversationId, setSelectedConversationId] = useState(null);

    const conversations = [
        {
            id: 1,
            title: 'Conversation 1',
            snippet: 'This is a short snippet of conversation 1...',
            messages: [
                { id: 1, sender: 'Machine', text: 'Hello, how can I help you today?' },
                { id: 2, sender: 'User', text: 'I\'m looking for some information.' },
                { id: 3, sender: 'Machine', text: 'Sure, what do you need?' },
            ],
            likes: 10,
            comments: [
                { user: 'Alice', text: 'This is so helpful!' },
                { user: 'Bob', text: 'Great conversation.' }
            ],
            reports: [],
        },
        {
            id: 2,
            title: 'Conversation 2',
            snippet: 'This is a short snippet of conversation 2...',
            messages: [
                { id: 1, sender: 'User', text: 'Can you help me with my account?' },
                { id: 2, sender: 'Machine', text: 'Of course! What seems to be the problem?' },
            ],
            likes: 5,
            comments: [
                { user: 'Charlie', text: 'Thanks for the help!' }
            ],
            reports: [],
        },
        {
            id: 3,
            title: 'Conversation 3',
            snippet: 'This is a short snippet of conversation 3...',
            messages: [
                { id: 1, sender: 'Machine', text: 'What can I assist you with today?' },
                { id: 2, sender: 'User', text: 'I have a question about my subscription.' },
            ],
            likes: 8,
            comments: [],
            reports: [],
        },
    ];

    const toggleConversation = (id) => {
        setExpandedConversationId(expandedConversationId === id ? null : id);
        setCommentsVisible(null);
    };

    const handleLike = (id) => {
        console.log(`Liked conversation ${id}`);
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
        console.log(`Added comment to conversation ${id}`);
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
        console.log(`Reported conversation ${selectedConversationId}`);
        closeReportOverlay();
    };

    return (
        <div className="trending">
            <div className="trending-container">
                <div className="trending__content">
                    <h1 className="trending__title">Trending Conversations</h1>
                    <div className="trending__list">
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
                                <p className="conversation__snippet">{conversation.snippet}</p>
                                <div className="conversation__fullText">
                                    {expandedConversationId === conversation.id && (
                                        <div className="conversation__messages">
                                            {conversation.messages.map(message => (
                                                <div
                                                    key={message.id}
                                                    className={`message message--${message.sender.toLowerCase()}`}
                                                >
                                                    {message.sender}: {message.text}
                                                </div>
                                            ))}
                                            <div className="conversation__likes">
                                                <button
                                                    id={`like-button-${conversation.id}`}
                                                    onClick={() => handleLike(conversation.id)}
                                                    className="like-button"
                                                >
                                                    👍 {conversation.likes} Likes
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