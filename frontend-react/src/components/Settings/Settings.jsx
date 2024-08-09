// src/components/Users/Settings/Settings.jsx
import React from 'react';
import './Settings.css';

const Settings = () => {
    // Simulating user data for demonstration. Replace with your actual user data.
    const user = {
        name: 'Jean-Michel',
        email: 'jmx117x@hotmail.com',
    };

    const deleteAllChats = () => {
        // Logic to delete all chats
        console.log('All chats have been deleted.');
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
                </div>
            </div>
        </div>
    );
}

export default Settings;