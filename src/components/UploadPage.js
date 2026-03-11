import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { post } from 'aws-amplify/api';

function UploadPage() {
  const { bucketName } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState('');

  useEffect(() => {
    // Get prefix from URL params if navigating from a folder
    const params = new URLSearchParams(window.location.search);
    setCurrentPrefix(params.get('prefix') || '');
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    setUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));
        
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = (event) => resolve(event.target.result.split(',')[1]);
          reader.readAsDataURL(file);
        });
        
        const fileName = currentPrefix + file.name;
        const session = await fetchAuthSession();
        
        await post({
          apiName: 'S3BrowserAPI',
          path: `/buckets/${bucketName}/upload`,
          options: {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken}`
            },
            body: {
              fileName: fileName,
              fileType: file.type,
              fileContent: base64
            }
          }
        }).response;
        
        setUploadProgress(prev => ({ ...prev, [i]: 'success' }));
      } catch (err) {
        setUploadProgress(prev => ({ ...prev, [i]: 'error' }));
      }
    }
    
    setUploading(false);
  };

  const allUploaded = Object.keys(uploadProgress).length === files.length && 
                      Object.values(uploadProgress).every(status => status === 'success');

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
    }}>
      <div style={{marginBottom: '2rem'}}>
        <button 
          onClick={() => navigate(`/bucket/${bucketName}${currentPrefix ? `?prefix=${currentPrefix}` : ''}`)}
          style={{
            background: '#007aff',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '500'
          }}
        >
          ← Back to {bucketName}
        </button>
      </div>

      <h2 style={{marginBottom: '1.5rem', color: '#1c1c1e'}} className="upload-title">Upload Files</h2>
      
      <div
        className="upload-dropzone"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '3px dashed #007aff' : '2px dashed #d1d1d6',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: dragActive ? '#f0f8ff' : '#f9f9f9',
          marginBottom: '2rem',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{fontSize: '48px', marginBottom: '1rem'}}>📁</div>
        <p className="upload-text-primary" style={{fontSize: '17px', color: '#1c1c1e', marginBottom: '0.5rem', fontWeight: '500'}}>
          Drag and drop files here
        </p>
        <p className="upload-text-secondary" style={{fontSize: '15px', color: '#8e8e93', marginBottom: '1.5rem'}}>
          or
        </p>
        <label style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#007aff',
          color: 'white',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: '500'
        }}>
          Choose Files
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{display: 'none'}}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '14px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #e5e5ea'
        }}>
          <h3 style={{fontSize: '17px', marginBottom: '1rem', color: '#1c1c1e'}}>
            Files to Upload ({files.length})
          </h3>
          <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
            {files.map((file, index) => (
              <li key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                borderBottom: index < files.length - 1 ? '1px solid #f2f2f7' : 'none'
              }}>
                <div>
                  <div style={{fontSize: '15px', color: '#1c1c1e', fontWeight: '500'}}>
                    {file.name}
                  </div>
                  <div style={{fontSize: '13px', color: '#8e8e93'}}>
                    {(file.size / 1024).toFixed(2)} KB
                    {uploadProgress[index] && (
                      <span style={{marginLeft: '1rem'}}>
                        {uploadProgress[index] === 'uploading' && '⏳ Uploading...'}
                        {uploadProgress[index] === 'success' && '✅ Uploaded'}
                        {uploadProgress[index] === 'error' && '❌ Failed'}
                      </span>
                    )}
                  </div>
                </div>
                {!uploadProgress[index] && (
                  <button
                    onClick={() => removeFile(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff3b30',
                      cursor: 'pointer',
                      fontSize: '20px'
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <div style={{display: 'flex', gap: '1rem'}}>
          <button
            onClick={uploadFiles}
            disabled={uploading || allUploaded}
            style={{
              flex: 1,
              padding: '0.875rem',
              backgroundColor: uploading || allUploaded ? '#8e8e93' : '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: uploading || allUploaded ? 'not-allowed' : 'pointer',
              fontSize: '17px',
              fontWeight: '600'
            }}
          >
            {uploading ? 'Uploading...' : allUploaded ? 'All Files Uploaded' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
          </button>
          {allUploaded && (
            <button
              onClick={() => navigate(`/bucket/${bucketName}${currentPrefix ? `?prefix=${currentPrefix}` : ''}`)}
              style={{
                flex: 1,
                padding: '0.875rem',
                backgroundColor: '#34c759',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '17px',
                fontWeight: '600'
              }}
            >
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadPage;
