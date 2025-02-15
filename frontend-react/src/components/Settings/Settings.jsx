// src/components/Users/Settings/Settings.jsx
import React, { useState } from 'react';
import './Settings.css';
import ConfirmationOverlay from '../ConfirmationOverlay/ConfirmationOverlay';
import { apiUrl, apiKey } from './api';

const Settings = ({ decodedToken, user_id, onLogout }) => {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [onConfirmAction, setOnConfirmAction] = useState(() => () => {});


    const user = decodedToken || {
        name: decodedToken.name || 'John Doe',
        email: decodedToken.email || 'example@example.com'
    };

    const deleteAllChats = () => {
        setConfirmationMessage('Are you sure you want to delete all chats?');
        setOnConfirmAction(() => async () => {
            try {
                const response = await fetch(`${apiUrl}/user/user/${user_id}/messages`, {
                    method: 'DELETE',
                    headers: {
                        'accept': 'application/json',
                        'access-token': apiKey,
                    },
                });
                if (response.ok) {
                } else {
                    console.error('Failed to delete chats.');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setShowConfirmation(false);
            }
        });
        setShowConfirmation(true);
    };

    const deleteAccount = () => {
        setConfirmationMessage('Are you sure you want to delete your account? This action cannot be undone.');
        setOnConfirmAction(() => async () => {
            try {
                const response = await fetch(`${apiUrl}/user/user/${user_id}`, {
                    method: 'DELETE',
                    headers: {
                        'accept': 'application/json',
                        'access-token': apiKey,
                    },
                });
                if (response.ok) {
                    console.log('Account has been deleted.');
                } else {
                    console.error('Failed to delete account.');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setShowConfirmation(false);
                onLogout();
            }
        });
        setShowConfirmation(true);
    };

    const deleteAllTrendingConversation = () => {
        setConfirmationMessage('Are you sure you want to delete all trending conversations?');
        setOnConfirmAction(() => async () => {
            try {
                const response = await fetch(`${apiUrl}/user/user/${user_id}/trending_conversations`, {
                    method: 'DELETE',
                    headers: {
                        'accept': 'application/json',
                        'access-token': apiKey,
                    },
                });
                if (response.ok) {
                    console.log('All trending conversations have been deleted.');
                } else {
                    console.error('Failed to delete trending conversations.');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setShowConfirmation(false);
            }
        });
        setShowConfirmation(true);
    };

    const handleCancel = () => {
        setShowConfirmation(false);
    };

    return (
        <div className="settings">
            <div className="container">
                <h1 className="settings__title">Settings</h1>
                <div className="settings__content">
                    <div className="settings__user-info">
                        <p><strong>Name:</strong> {user.name}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                    </div>
                    <button className="settings__delete-button" onClick={deleteAllChats}>
                        Delete all chats
                    </button>
                    <button className="settings__delete-account-button" onClick={deleteAllTrendingConversation}>
                        Delete all trending conversation
                    </button>
                    <button className="settings__delete-account-button" onClick={deleteAccount} >
                        Delete account
                    </button>
                </div>
            </div>
            {showConfirmation && (
                <ConfirmationOverlay
                    message={confirmationMessage}
                    onConfirm={onConfirmAction}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
};

export default Settings;