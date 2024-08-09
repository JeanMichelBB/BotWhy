// src/pages/Home/Home.jsx
import React, { useState } from 'react';
import './Home.css';

const Home = () => {
    const [editMode, setEditMode] = useState(false);
    const [checkedItems, setCheckedItems] = useState([]);

    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    const handleCheckboxChange = (id) => {
        if (checkedItems.includes(id)) {
            // Uncheck the box
            setCheckedItems(checkedItems.filter(item => item !== id));
        } else {
            // Allow checking only if it's the next or previous consecutive checkbox
            if (
                checkedItems.length === 0 ||
                checkedItems.includes(id - 1) || // Check if it's the next one down
                checkedItems.includes(id + 1)    // Check if it's the next one up
            ) {
                setCheckedItems([...checkedItems, id].sort((a, b) => a - b)); // Sort to maintain order
            }
        }
    };

    const isDisabled = (id) => {
        if (checkedItems.length === 0) return false; // No checkboxes selected
        const minChecked = Math.min(...checkedItems);
        const maxChecked = Math.max(...checkedItems);
        return (
            !checkedItems.includes(id) && // Only disable if it's not already checked
            !(id === maxChecked + 1 || id === minChecked - 1)
        );
    };

    const conversations = [
        { id: 1, type: 'machine', text: 'Hello, how can I help you today?' },
        { id: 2, type: 'user', text: 'I\'m looking for some information.' },
        { id: 3, type: 'machine', text: 'Sure, what kind of information are you looking for?' },
        { id: 4, type: 'user', text: 'Can you tell me more about your services?' },
        { id: 5, type: 'machine', text: 'We offer a wide range of services, including web development, mobile app development, and more.' },
        { id: 6, type: 'user', text: 'That sounds great! How can I get started?' },
        { id: 7, type: 'machine', text: 'You can get started by contacting our sales team at...' },
    ];

    return (
        <div className="home">
            <div className="home-container">
                <div className="home__content">
                    <div className="chatbox">
                        <div className="chatbox__header">
                            {editMode && <input className='title-input' type="text" placeholder="Enter title" />}
                            
                            {editMode && <button className="chatbox__create">Create</button>}
                            <button className="chatbox__Edit" onClick={toggleEditMode}>

                                {editMode ? 'Cancel Edit' : 'Edit'}
                            </button>
                        </div>
                        <div className="chatbox__title">
                        {editMode && <input className='snippet-input' type="text" placeholder="Enter short description" />}
                        </div>
                        <div className="chatbox__messages">
                            {conversations.map((conversation) => (
                                <div
                                    key={conversation.id}
                                    className={`message-container ${conversation.type === 'user' ? 'message-container--user' : ''}`}
                                >
                                    <div className={`message message--${conversation.type}`}>
                                        {conversation.text}
                                    </div>
                                    {editMode && (
                                        <input
                                            type="checkbox"
                                            className="message-checkbox"
                                            checked={checkedItems.includes(conversation.id)}
                                            onChange={() => handleCheckboxChange(conversation.id)}
                                            disabled={isDisabled(conversation.id)}
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