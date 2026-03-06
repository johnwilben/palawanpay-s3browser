import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get } from 'aws-amplify/api';

function RecentActivities({ bucketName }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadRecentActivities = async () => {
    if (!bucketName) return;
    
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const response = await get({
        apiName: 'S3BrowserAPI',
        path: `/buckets/${bucketName}/activities`,
        options: {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken}`
          }
        }
      }).response;
      
      const data = await response.body.json();
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bucketName) {
      loadRecentActivities();
    }
  }, [isOpen, bucketName]);

  const getEventIcon = (eventType) => {
    const icons = {
      'UPLOAD': '⬆️',
      'DELETE': '🗑️',
      'DOWNLOAD': '⬇️',
      'COPY': '📋',
      'MOVE': '➡️',
      'CREATE_FOLDER': '📁',
      'DOWNLOAD_ZIP': '📦'
    };
    return icons[eventType] || '📄';
  };

  const formatTime = (timestamp) => {
    // Timestamps are already in Philippine Time from Lambda
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    // Format date
    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 1000 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          backgroundColor: '#007aff',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '24px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 122, 255, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 122, 255, 0.3)';
        }}
        title="Recent Activities"
      >
        📊
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'transparent',
              zIndex: 999
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              bottom: '9rem',
              left: '2rem',
              width: '400px',
              maxHeight: '500px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid #e5e5ea',
              zIndex: 1000,
              overflow: 'hidden',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
            }}
            className="recent-activities-panel"
          >
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e5ea',
              fontWeight: '600',
              fontSize: '15px',
              color: '#1c1c1e'
            }}>
              Recent Activities - {bucketName}
            </div>

            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {loading ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#8e8e93'
                }}>
                  Loading...
                </div>
              ) : activities.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#8e8e93'
                }}>
                  No recent activities
                </div>
              ) : (
                activities.map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: index < activities.length - 1 ? '1px solid #f2f2f7' : 'none'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}>
                      <div style={{ fontSize: '20px' }}>
                        {getEventIcon(activity.event_type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1c1c1e',
                          marginBottom: '0.25rem'
                        }}>
                          {activity.event_type.replace('_', ' ')}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: '#8e8e93',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '0.25rem'
                        }}>
                          {activity.key || 'Multiple files'}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#8e8e93'
                        }}>
                          {activity.user_email} • {formatTime(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RecentActivities;
