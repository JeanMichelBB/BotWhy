// src/components/Users/Settings/Settings.jsx
import React from 'react';
import './Settings.css';

const Settings = ({ decodedToken }) => {
    // Simulating user data for demonstration. Replace with your actual user data.
    const user = decodedToken || {
        name: decodedToken.name || 'John Doe',
        email: decodedToken.email || 'example@example.com'
    };

    const deleteAllChats = () => {
        // Logic to delete all chats
        console.log('All chats have been deleted.');
    };

    const deleteAccount = () => {
        // Logic to delete account
        console.log('Account has been deleted.');
    }

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
                    <button className="settings__delete-account-button" onClick={deleteAccount}>
                        Delete account
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Settings;