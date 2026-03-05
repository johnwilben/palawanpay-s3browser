import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get } from 'aws-amplify/api';

// Cache buckets for 60 seconds
let cachedBuckets = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 60 seconds

function BucketList() {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'grid');
  const navigate = useNavigate();

  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = async () => {
    try {
      // Check cache first
      const now = Date.now();
      if (cachedBuckets && (now - cacheTime) < CACHE_DURATION) {
        setBuckets(cachedBuckets);
        setLoading(false);
        return;
      }

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
      cachedBuckets = data.buckets || [];
      cacheTime = now;
      setBuckets(cachedBuckets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Loading buckets from all accounts...</p>
    </div>
  );
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h2>Your S3 Buckets</h2>
        <div style={{display: 'flex', gap: '0.5rem', padding: '0.25rem', backgroundColor: '#f2f2f7', borderRadius: '10px'}}>
          <button
            onClick={() => toggleViewMode('list')}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: viewMode === 'list' ? 'white' : 'transparent',
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
            title="List view"
          >
            ☰
          </button>
          <button
            onClick={() => toggleViewMode('grid')}
            style={{
              padding: '0.5rem 0.75rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: viewMode === 'grid' ? 'white' : 'transparent',
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
            title="Grid view"
          >
            ⊞
          </button>
        </div>
      </div>
      {viewMode === 'grid' ? (
        <div className="bucket-grid">
          {buckets.map(bucket => (
            <div
              key={bucket.name}
              className="bucket-card"
              onClick={() => navigate(`/bucket/${bucket.name}`)}
            >
              <div className="bucket-name">{bucket.name}</div>
              <div className="bucket-permissions">
                {bucket.canRead && <span className="permission-badge permission-read">Read</span>}
                {bucket.canWrite && <span className="permission-badge permission-write">Write</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="file-list">
          {buckets.map(bucket => (
            <li
              key={bucket.name}
              className="file-item"
              onClick={() => navigate(`/bucket/${bucket.name}`)}
              style={{cursor: 'pointer'}}
            >
              <div>
                <div className="file-name">🪣 {bucket.name}</div>
                <div className="bucket-permissions" style={{marginTop: '0.5rem'}}>
                  {bucket.canRead && <span className="permission-badge permission-read">Read</span>}
                  {bucket.canWrite && <span className="permission-badge permission-write">Write</span>}
                </div>
              </div>
              <span style={{color: '#007aff', fontSize: '20px'}}>›</span>
            </li>
          ))}
        </ul>
      )}
      {buckets.length === 0 && <p>No buckets available</p>}
    </div>
  );
}

export default BucketList;
