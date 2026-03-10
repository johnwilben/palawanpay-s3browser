import React, { useState, useEffect } from 'react';
import './DisclaimerModal.css';

const DisclaimerModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('s3browser-disclaimer-accepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem('s3browser-disclaimer-accepted', 'true');
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-modal">
        <div className="disclaimer-icon">⚠️</div>
        <h2>Important Notice</h2>
        <p className="disclaimer-message">
          This application is designed for non-sensitive files only. 
          Please do not upload or store confidential, personal, or 
          sensitive information.
        </p>
        <p className="disclaimer-submessage">
          Use with caution and ensure compliance with your organization's 
          data handling policies.
        </p>
        
        <label className="disclaimer-checkbox">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <span>Don't show this again</span>
        </label>

        <button className="disclaimer-confirm-btn" onClick={handleConfirm}>
          I Confirm
        </button>
      </div>
    </div>
  );
};

export default DisclaimerModal;
