import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InsufficientCreditsModal.css';

const InsufficientCreditsModal = ({ onClose }) => {
  const navigate = useNavigate();

  const handleBuyCredits = () => {
    onClose();
    navigate('/credits');
  };

  return (
    <div className="insufficient-credits-overlay">
      <div className="insufficient-credits-box">
        <p className="insufficient-credits-title">You've run out of credits</p>
        <p className="insufficient-credits-message">
          Buy credits to keep chatting with BotWhy.
        </p>
        <div className="insufficient-credits-buttons">
          <button onClick={handleBuyCredits} className="insufficient-credits-buy-button">
            Buy Credits
          </button>
          <button onClick={onClose} className="insufficient-credits-cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsufficientCreditsModal;
