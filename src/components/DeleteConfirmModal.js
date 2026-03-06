import React, { useState } from 'react';

function DeleteConfirmModal({ isOpen, onClose, onConfirm, fileName, fileCount }) {
  const [inputValue, setInputValue] = useState('');
  
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (inputValue === 'delete') {
      onConfirm();
      setInputValue('');
    }
  };

  const isSingleFile = fileCount === 1;
  const fileWord = fileCount === 1 ? 'file' : 'files';

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
        className="delete-modal"
      >
        <h3 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '17px',
          fontWeight: '600',
          color: '#1c1c1e',
          textAlign: 'center'
        }}>
          {isSingleFile ? `Delete "${fileName}"?` : `Delete ${fileCount} ${fileWord}?`}
        </h3>
        
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '13px',
          color: '#3c3c43',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          {isSingleFile 
            ? 'This action cannot be undone.'
            : `This will permanently delete the selected ${fileWord}. This action cannot be undone.`
          }
        </p>

        <p style={{
          margin: '0 0 0.5rem 0',
          fontSize: '13px',
          color: '#3c3c43',
          fontWeight: '500'
        }}>
          Type "delete" to confirm:
        </p>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="delete"
          autoFocus
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d1d6',
            borderRadius: '10px',
            fontSize: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            outline: 'none',
            marginBottom: '1.5rem'
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && inputValue === 'delete') {
              handleConfirm();
            }
          }}
        />

        <div style={{display: 'flex', gap: '0.75rem'}}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#f2f2f7',
              color: '#007aff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '17px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={inputValue !== 'delete'}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: inputValue === 'delete' ? '#ff3b30' : '#d1d1d6',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '17px',
              fontWeight: '600',
              cursor: inputValue === 'delete' ? 'pointer' : 'not-allowed',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
