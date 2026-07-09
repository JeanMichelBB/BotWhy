// src/pages/Trending/Trending.jsx

import React, { useState, useEffect } from 'react';
import './Trending.css';
import { apiUrl } from '../../api';
import { jwtDecode } from 'jwt-decode';

const formatCommentUser = (user) => {
    if (!user) return 'Anonymous';
    if (user.includes('@')) {
        const name = user.split('@')[0].replace(/[._-]/g, ' ');
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return user;
};

const Trending = ({ user_id }) => {
    const [expandedConversationId, setExpandedConversationId] = useState(null);
    const [commentsVisible, setCommentsVisible] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [reportOverlayVisible, setReportOverlayVisible] = useState(false);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState({});
    const [likedConversations, setLikedConversations] = useState({});
    const [conversationComments, setConversationComments] = useState({});
    const [commentLoading, setCommentLoading] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [pendingDeletePostId, setPendingDeletePostId] = useState(null);

    const authToken = localStorage.getItem('authToken');
    const decoded = authToken ? jwtDecode(authToken) : null;
    const currentUserName = decoded?.given_name || decoded?.email || null;
    const currentUserEmail = decoded?.email || null;

    // Fetch trending conversations
    useEffect(() => {
        fetch(`${apiUrl}/chatbox/trending_conversations`)
            .then(response => response.json())
            .then(data => {
                setConversations(data);
                const initialComments = {};
                data.forEach(c => { initialComments[c.id] = c.comments || []; });
                setConversationComments(initialComments);
            })
            .catch(error => console.error('Error fetching conversations:', error));
    }, []);

    // Recompute liked state whenever user_id or conversations change
    useEffect(() => {
        if (!user_id || conversations.length === 0) return;
        const liked = {};
        conversations.forEach(c => {
            if ((c.liked_by || []).includes(user_id)) liked[c.id] = true;
        });
        setLikedConversations(liked);
    }, [user_id, conversations]);

    // Fetch messages for a specific conversation
    const fetchMessages = async (id) => {
        try {
            const response = await fetch(`${apiUrl}/chatbox/trending_conversation/${id}/messages`);
            if (!response.ok) throw new Error('Failed to fetch messages');
            const data = await response.json();
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
            if (!messages[id]) fetchMessages(id);
        }
        setCommentsVisible(null);
    };

    const handleLike = async (id) => {
        if (!authToken) return;

        const liked = likedConversations[id];
        const endpoint = liked ? 'unlike' : 'like';

        try {
            const response = await fetch(`${apiUrl}/chatbox/trending_conversation/${id}/${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (!response.ok) return;
            const data = await response.json();
            setConversations(prev =>
                prev.map(c => {
                    if (c.id !== id) return c;
                    const liked_by = liked
                        ? (c.liked_by || []).filter(uid => uid !== user_id)
                        : [...(c.liked_by || []), user_id];
                    return { ...c, likes: data.total_likes, liked_by };
                })
            );
            setLikedConversations(prev => ({ ...prev, [id]: !liked }));
        } catch (error) {
            console.error('Error liking conversation:', error);
        }
    };

    const toggleComments = (id) => {
        setCommentsVisible(commentsVisible === id ? null : id);
    };

    const handleCommentChange = (event) => {
        setNewComment(event.target.value);
    };

    const handleDeleteComment = async (conversationId, index) => {
        if (!authToken) return;

        try {
            const response = await fetch(
                `${apiUrl}/chatbox/trending_conversation/${conversationId}/comment?index=${index}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authToken}` },
                }
            );
            if (!response.ok) return;
            const data = await response.json();
            setConversationComments(prev => ({ ...prev, [conversationId]: data.comments }));
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const handleAddComment = async (id) => {
        if (!authToken || !newComment.trim()) return;

        setCommentLoading(true);
        try {
            const response = await fetch(
                `${apiUrl}/chatbox/trending_conversation/${id}/comment?text=${encodeURIComponent(newComment.trim())}`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` },
                }
            );
            if (!response.ok) return;
            const data = await response.json();
            setConversationComments(prev => ({ ...prev, [id]: data.comments }));
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setCommentLoading(false);
        }
    };

    const openReportOverlay = (id) => {
        setSelectedConversationId(id);
        setReportOverlayVisible(true);
    };

    const closeReportOverlay = () => {
        setReportOverlayVisible(false);
        setSelectedConversationId(null);
    };

    const handleReportSubmit = async () => {
        if (!authToken || !selectedConversationId) {
            closeReportOverlay();
            return;
        }

        try {
            await fetch(`${apiUrl}/chatbox/trending_conversation/${selectedConversationId}/report`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
        } catch (error) {
            console.error('Error reporting conversation:', error);
        } finally {
            closeReportOverlay();
        }
    };

    const handleDeletePost = async (id) => {
        if (!authToken) return;

        try {
            const response = await fetch(`${apiUrl}/chatbox/trending_conversation/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (!response.ok) return;
            setConversations(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting trending conversation:', error);
        } finally {
            setPendingDeletePostId(null);
        }
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
                                <p>Or, if you're just browsing, check back later. New trending conversations are always just around the corner.</p>
                                <p>Happy chatting!</p>
                            </div>
                        }
                        {conversations.map(conversation => {
                            const comments = conversationComments[conversation.id] || [];
                            const liked = likedConversations[conversation.id] || false;

                            const isExpanded = expandedConversationId === conversation.id;

                            return (
                                <div
                                    key={conversation.id}
                                    className={`conversation ${isExpanded ? 'expanded' : ''}`}
                                    onClick={!isExpanded ? () => toggleConversation(conversation.id) : undefined}
                                    style={!isExpanded ? { cursor: 'pointer' } : undefined}
                                >
                                    {isExpanded && (
                                        <button
                                            className="conversation__close"
                                            onClick={() => toggleConversation(conversation.id)}
                                        >
                                            ×
                                        </button>
                                    )}
                                    <h2 className="conversation__title">
                                        {conversation.title}
                                        {conversation.user_id === user_id && (
                                            pendingDeletePostId === conversation.id ? (
                                                <span className="conversation__delete-confirm" onClick={(e) => e.stopPropagation()}>
                                                    <button className="conversation__delete-confirm-yes" onClick={() => handleDeletePost(conversation.id)}>Confirm</button>
                                                    <button className="conversation__delete-confirm-no" onClick={() => setPendingDeletePostId(null)}>Cancel</button>
                                                </span>
                                            ) : (
                                                <button
                                                    className="conversation__delete-post"
                                                    onClick={(e) => { e.stopPropagation(); setPendingDeletePostId(conversation.id); }}
                                                    title="Delete this post"
                                                >
                                                    Delete
                                                </button>
                                            )
                                        )}
                                    </h2>
                                    <p className="conversation__snippet">{conversation.description}</p>
                                    <div className="conversation__fullText" onClick={(e) => e.stopPropagation()}>
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
                                                        onClick={() => handleLike(conversation.id)}
                                                        className={`like-button ${liked ? 'like-button--active' : ''}`}
                                                        disabled={!authToken}
                                                        title={!authToken ? 'Sign in to like' : ''}
                                                    >
                                                        {liked ? `👎 ${conversation.likes ?? 0} Unlike` : `👍 ${conversation.likes ?? 0} ${conversation.likes === 1 ? 'Like' : 'Likes'}`}
                                                    </button>
                                                    <button
                                                        onClick={() => toggleComments(conversation.id)}
                                                        className={`comment-toggle-button ${commentsVisible === conversation.id ? 'comment-toggle-button--active' : ''}`}
                                                    >
                                                        Comments ({comments.length})
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openReportOverlay(conversation.id); }}
                                                        className="three-dots-button conversation__report-button"
                                                        aria-label="Report this post"
                                                        title="Report this post"
                                                    >
                                                        <i className="ti ti-flag" aria-hidden="true"></i>
                                                    </button>
                                                </div>
                                                {commentsVisible === conversation.id && (
                                                    <div className="conversation__comments-wrapper">
                                                        <div className="conversation__comments">
                                                        {comments.length > 0 ? (
                                                            comments.map((comment, index) => (
                                                                <div key={index} className="comment">
                                                                    <div className="comment__header">
                                                                        <strong className="comment__user">{formatCommentUser(comment.user)}</strong>
                                                                        {(comment.user === currentUserName || comment.user === currentUserEmail) && (
                                                                            pendingDelete?.conversationId === conversation.id && pendingDelete?.index === index ? (
                                                                                <div className="comment__confirm">
                                                                                    <button className="comment__confirm-yes" onClick={() => { handleDeleteComment(conversation.id, index); setPendingDelete(null); }}>Confirm</button>
                                                                                    <button className="comment__confirm-no" onClick={() => setPendingDelete(null)}>Cancel</button>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    className="comment__delete"
                                                                                    onClick={() => setPendingDelete({ conversationId: conversation.id, index })}
                                                                                    title="Delete comment"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                    <span className="comment__text">{comment.text}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="comments__empty">No comments yet.</p>
                                                        )}
                                                        </div>
                                                        {authToken && (
                                                            <div className="comment-form">
                                                                <input
                                                                    type="text"
                                                                    value={newComment}
                                                                    onChange={handleCommentChange}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(conversation.id)}
                                                                    placeholder="Add a comment..."
                                                                    className="comment-input"
                                                                />
                                                                <button
                                                                    onClick={() => handleAddComment(conversation.id)}
                                                                    className="add-comment-button"
                                                                    disabled={commentLoading || !newComment.trim()}
                                                                >
                                                                    {commentLoading ? '...' : 'Add'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
