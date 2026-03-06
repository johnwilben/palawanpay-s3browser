import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get } from 'aws-amplify/api';

function DestinationPickerModal({ isOpen, onClose, onConfirm, action, selectedCount }) {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [folders, setFolders] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBuckets, setLoadingBuckets] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBuckets();
    }
  }, [isOpen]);

  const loadBuckets = async () => {
    setLoadingBuckets(true);
    try {
      const session = await fetchAuthSession();
      const response = await get({
        apiName: 'S3BrowserAPI',
        path: '/buckets',
        options: {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken}`
          }
        }
      }).response;
      
      const data = await response.body.json();
      // Only show buckets with write access
      const writableBuckets = (data.buckets || []).filter(b => b.canWrite);
      setBuckets(writableBuckets);
    } catch (err) {
      console.error('Error loading buckets:', err);
    } finally {
      setLoadingBuckets(false);
    }
  };

  const loadFolders = async (bucket, prefix = '') => {
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const queryParams = prefix ? { prefix } : {};
      const response = await get({
        apiName: 'S3BrowserAPI',
        path: `/buckets/${bucket}/objects`,
        options: {
          queryParams,
          headers: {
            Authorization: `Bearer ${session.tokens.idToken}`
          }
        }
      }).response;
      
      const data = await response.body.json();
      setFolders(data.folders || []);
      setCurrentPath(prefix);
    } catch (err) {
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBucketSelect = (bucket) => {
    setSelectedBucket(bucket);
    loadFolders(bucket.name);
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentPath + folderName + '/';
    loadFolders(selectedBucket.name, newPath);
  };

  const handleBack = () => {
    if (currentPath) {
      const parts = currentPath.split('/').filter(p => p);
      parts.pop();
      const newPath = parts.length > 0 ? parts.join('/') + '/' : '';
      loadFolders(selectedBucket.name, newPath);
    } else {
      setSelectedBucket(null);
      setFolders([]);
      setCurrentPath('');
    }
  };

  const handleConfirm = () => {
    if (selectedBucket) {
      onConfirm(selectedBucket.name, currentPath);
      setSelectedBucket(null);
      setFolders([]);
      setCurrentPath('');
    }
  };

  if (!isOpen) return null;

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
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
        className="destination-modal"
      >
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e5ea',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: '600',
            color: '#1c1c1e'
          }}>
            {action === 'copy' ? 'Copy' : 'Move'} {selectedCount} file{selectedCount > 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: '#f2f2f7',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#8e8e93'
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem'
        }}>
          {selectedBucket && (
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#007aff',
                fontSize: '15px',
                cursor: 'pointer',
                marginBottom: '1rem',
                padding: '0.5rem',
                fontWeight: '500'
              }}
            >
              ← Back
            </button>
          )}

          {!selectedBucket ? (
            <div>
              <p style={{fontSize: '13px', color: '#8e8e93', marginBottom: '1rem'}}>
                Select destination bucket:
              </p>
              {loadingBuckets ? (
                <p style={{textAlign: 'center', color: '#8e8e93', padding: '2rem'}}>
                  Loading buckets...
                </p>
              ) : buckets.length === 0 ? (
                <p style={{textAlign: 'center', color: '#8e8e93', padding: '2rem'}}>
                  No writable buckets available
                </p>
              ) : (
                buckets.map(bucket => (
                  <div
                    key={bucket.name}
                    onClick={() => handleBucketSelect(bucket)}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '10px',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      border: '1px solid #e5e5ea'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f2f2f7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                  >
                    <div style={{fontSize: '15px', fontWeight: '500', color: '#1c1c1e'}}>
                      🪣 {bucket.name}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div>
              <p style={{fontSize: '13px', color: '#8e8e93', marginBottom: '1rem'}}>
                Bucket: <strong>{selectedBucket.name}</strong>
                {currentPath && ` / ${currentPath}`}
              </p>
              
              <div
                onClick={() => handleConfirm()}
                style={{
                  padding: '1rem',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  cursor: 'pointer',
                  border: '2px solid #007aff'
                }}
              >
                <div style={{fontSize: '15px', fontWeight: '500', color: '#007aff'}}>
                  📍 {action === 'copy' ? 'Copy' : 'Move'} here
                </div>
              </div>

              {loading ? (
                <p style={{textAlign: 'center', color: '#8e8e93'}}>Loading folders...</p>
              ) : folders.length > 0 ? (
                <>
                  <p style={{fontSize: '13px', color: '#8e8e93', marginBottom: '0.5rem'}}>
                    Or select a folder:
                  </p>
                  {folders.map(folder => (
                    <div
                      key={folder.name}
                      onClick={() => handleFolderClick(folder.name)}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '10px',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        border: '1px solid #e5e5ea'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f2f2f7'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    >
                      <div style={{fontSize: '15px', fontWeight: '500', color: '#1c1c1e'}}>
                        📁 {folder.name}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p style={{fontSize: '13px', color: '#8e8e93', textAlign: 'center', marginTop: '2rem'}}>
                  No folders in this location
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e5e5ea'
        }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#f2f2f7',
              color: '#007aff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '17px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default DestinationPickerModal;
