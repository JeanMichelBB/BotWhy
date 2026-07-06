// src/components/VoiceModeButton/VoiceModeButton.jsx
import React from 'react';
import './VoiceModeButton.css';

const VoiceModeButton = ({ isListening, onTap }) => {
    const label = isListening ? 'Listening... tap to stop' : 'Start voice input';

    return (
        <button
            type="button"
            className={`voice-mode-button ${isListening ? 'voice-mode-button--listening' : 'voice-mode-button--off'}`}
            onClick={onTap}
            aria-label={label}
            title={label}
        >
            <i className="ti ti-microphone" aria-hidden="true"></i>
        </button>
    );
};

export default VoiceModeButton;
