// src/components/ConfirmationOverlay/ConfirmationOverlay.jsx
import React from 'react';
import './ConfirmationOverlay.css';

const ConfirmationOverlay = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="confirmation-overlay">
            <div className="confirmation-box">
                <p>{message}</p>
                <div className="confirmation-buttons">
                    <button onClick={onConfirm} className="confirm-button">Confirm</button>
                    <button onClick={onCancel} className="cancel-button">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationOverlay;