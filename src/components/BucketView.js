import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get, post } from 'aws-amplify/api';

function BucketView() {
  const { bucketName } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canWrite, setCanWrite] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBucketContents();
  }, [bucketName]);

  const loadBucketContents = async () => {
    try {
      const session = await fetchAuthSession();
      const response = await get({
        apiName: 'S3BrowserAPI',
        path: `/buckets/${bucketName}/objects`,
        options: {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken}`
          }
        }
      }).response;
      
      const data = await response.body.json();
      setFiles(data.objects || []);
      setCanWrite(data.canWrite || false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1];
        
        const session = await fetchAuthSession();
        await post({
          apiName: 'S3BrowserAPI',
          path: `/buckets/${bucketName}/upload`,
          options: {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken}`
            },
            body: {
              fileName: file.name,
              fileType: file.type,
              fileContent: base64
            }
          }
        }).response;
        
        loadBucketContents();
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const handleDownload = async (key) => {
    try {
      const session = await fetchAuthSession();
      const response = await get({
        apiName: 'S3BrowserAPI',
        path: `/buckets/${bucketName}/download`,
        options: {
          queryParams: { key },
          headers: {
            Authorization: `Bearer ${session.tokens.idToken}`
          }
        }
      }).response;
      
      const data = await response.body.json();
      window.open(data.downloadUrl, '_blank');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="bucket-view">
      <div className="bucket-header">
        <div>
          <button onClick={() => navigate('/')} className="btn-back">← Back</button>
          <h2 style={{marginTop: '1rem'}}>{bucketName}</h2>
        </div>
        {canWrite && (
          <label className="btn-upload">
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" onChange={handleUpload} disabled={uploading} style={{display: 'none'}} />
          </label>
        )}
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <ul className="file-list">
        {files.map(file => (
          <li key={file.key} className="file-item">
            <div>
              <div className="file-name">{file.key}</div>
              <div className="file-size">
                {(file.size / 1024).toFixed(2)} KB
                {file.lastModified && (
                  <span style={{marginLeft: '1rem', color: '#666'}}>
                    • Uploaded: {new Date(file.lastModified).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => handleDownload(file.key)} className="btn-download">
              Download
            </button>
          </li>
        ))}
      </ul>
      {files.length === 0 && <p>No files in this bucket</p>}
    </div>
  );
}

export default BucketView;
