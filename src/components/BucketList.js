import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get } from 'aws-amplify/api';

function BucketList() {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = async () => {
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
      setBuckets(data.buckets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading buckets...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div>
      <h2>Your S3 Buckets</h2>
      <div className="bucket-grid">
        {buckets.map(bucket => (
          <div
            key={`${bucket.account}-${bucket.name}`}
            className="bucket-card"
            onClick={() => navigate(`/bucket/${bucket.name}`)}
          >
            <div className="bucket-name">{bucket.name}</div>
            <div className="bucket-account">Account: {bucket.account}</div>
            <div className="bucket-permissions">
              {bucket.canRead && <span className="permission-badge permission-read">Read</span>}
              {bucket.canWrite && <span className="permission-badge permission-write">Write</span>}
            </div>
          </div>
        ))}
      </div>
      {buckets.length === 0 && <p>No buckets available</p>}
    </div>
  );
}

export default BucketList;
