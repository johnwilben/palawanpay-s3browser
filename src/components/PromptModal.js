import React, { useState, useEffect } from 'react';

function PromptModal({ isOpen, onClose, onConfirm, title, message, placeholder }) {
  const [inputValue, setInputValue] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleConfirm();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(10px)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '400px',
          padding: '1.5rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
        className="prompt-modal"
      >
        <h3 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '17px',
          fontWeight: '600',
          color: '#1c1c1e',
          textAlign: 'center'
        }}>
          {title}
        </h3>
        
        {message && (
          <p style={{
            margin: '0 0 1.5rem 0',
            fontSize: '13px',
            color: '#3c3c43',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            {message}
          </p>
        )}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          autoFocus
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '15px',
            border: '1px solid #d1d1d6',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            boxSizing: 'border-box'
          }}
        />

        <div style={{display: 'flex', gap: '0.75rem'}}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontSize: '15px',
              fontWeight: '500',
              backgroundColor: '#f2f2f7',
              color: '#007aff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e5ea'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#f2f2f7'}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!inputValue.trim()}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontSize: '15px',
              fontWeight: '600',
              backgroundColor: inputValue.trim() ? '#007aff' : '#d1d1d6',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (inputValue.trim()) {
                e.target.style.backgroundColor = '#0051d5';
              }
            }}
            onMouseLeave={(e) => {
              if (inputValue.trim()) {
                e.target.style.backgroundColor = '#007aff';
              }
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromptModal;
