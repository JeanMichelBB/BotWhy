// src/components/VoiceModeButton/VoiceModeButton.jsx
import React, { useRef } from 'react';
import './VoiceModeButton.css';

const LONG_PRESS_MS = 600;

const VoiceModeButton = ({ isListening, voiceRepliesEnabled, onTap, onExit }) => {
    const pressTimer = useRef(null);
    const longPressed = useRef(false);

    const handlePointerDown = () => {
        longPressed.current = false;
        pressTimer.current = setTimeout(() => {
            longPressed.current = true;
            onExit();
        }, LONG_PRESS_MS);
    };

    const handlePointerUp = () => {
        clearTimeout(pressTimer.current);
    };

    const handlePointerLeave = () => {
        clearTimeout(pressTimer.current);
        longPressed.current = false;
    };

    const handleClick = () => {
        if (!longPressed.current) {
            onTap();
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape' && (isListening || voiceRepliesEnabled)) {
            onExit();
        }
    };

    const stateClass = isListening
        ? 'voice-mode-button--listening'
        : voiceRepliesEnabled
            ? 'voice-mode-button--on'
            : 'voice-mode-button--off';

    const label = isListening
        ? 'Listening... tap to stop'
        : voiceRepliesEnabled
            ? 'Voice mode on, tap to speak, press Escape to turn off'
            : 'Start voice mode';

    const icon = isListening ? '🎤' : voiceRepliesEnabled ? '🔊' : '🎤';

    return (
        <button
            type="button"
            className={`voice-mode-button ${stateClass}`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-label={label}
            title={label}
        >
            <span aria-hidden="true">{icon}</span>
        </button>
    );
};

export default VoiceModeButton;
