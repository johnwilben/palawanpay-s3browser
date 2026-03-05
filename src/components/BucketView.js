import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get, post } from 'aws-amplify/api';

function BucketView() {
  const { bucketName } = useParams();
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canWrite, setCanWrite] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [pathParts, setPathParts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  useEffect(() => {
    loadBucketContents(currentPrefix);
  }, [bucketName, currentPrefix]);

  const loadBucketContents = async (prefix = '') => {
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const queryParams = prefix ? { prefix } : {};
      const response = await get({
        apiName: 'S3BrowserAPI',
        path: `/buckets/${bucketName}/objects`,
        options: {
          queryParams,
          headers: {
            Authorization: `Bearer ${session.tokens.idToken}`
          }
        }
      }).response;
      
      const data = await response.body.json();
      setFolders(data.folders || []);
      setFiles(data.files || []);
      setCanWrite(data.canWrite || false);
      
      // Update breadcrumb path
      if (prefix) {
        setPathParts(prefix.split('/').filter(p => p));
      } else {
        setPathParts([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderName) => {
    const newPrefix = currentPrefix + folderName + '/';
    setCurrentPrefix(newPrefix);
  };

  const navigateToPath = (index) => {
    if (index === -1) {
      setCurrentPrefix('');
    } else {
      const newPrefix = pathParts.slice(0, index + 1).join('/') + '/';
      setCurrentPrefix(newPrefix);
    }
  };

  const filterAndSortItems = () => {
    // Filter folders
    let filteredFolders = folders.filter(folder =>
      folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter files
    let filteredFiles = files.filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort folders (always by name)
    filteredFolders.sort((a, b) => a.name.localeCompare(b.name));

    // Sort files
    switch (sortBy) {
      case 'name-asc':
        filteredFiles.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filteredFiles.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'size-asc':
        filteredFiles.sort((a, b) => a.size - b.size);
        break;
      case 'size-desc':
        filteredFiles.sort((a, b) => b.size - a.size);
        break;
      case 'date-asc':
        filteredFiles.sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified));
        break;
      case 'date-desc':
        filteredFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        break;
      default:
        break;
    }

    return { filteredFolders, filteredFiles };
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1];
        const fileName = currentPrefix + file.name;  // Include current path
        
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
        
        loadBucketContents(currentPrefix);
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

  const { filteredFolders, filteredFiles } = filterAndSortItems();
  const totalItems = folders.length + files.length;
  const filteredCount = filteredFolders.length + filteredFiles.length;

  return (
    <div className="bucket-view">
      <div className="bucket-header">
        <div>
          <button onClick={() => navigate('/')} className="btn-back">← Back</button>
          <h2 style={{marginTop: '1rem'}}>
            {bucketName}
            {pathParts.length > 0 && (
              <span style={{fontSize: '0.8em', color: '#666', fontWeight: 'normal'}}>
                {' / '}
                <span 
                  onClick={() => navigateToPath(-1)} 
                  style={{cursor: 'pointer', color: '#0066cc'}}
                >
                  root
                </span>
                {pathParts.map((part, index) => (
                  <span key={index}>
                    {' / '}
                    <span 
                      onClick={() => navigateToPath(index)} 
                      style={{cursor: 'pointer', color: '#0066cc'}}
                    >
                      {part}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </h2>
        </div>
        {canWrite && (
          <label className="btn-upload">
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" onChange={handleUpload} disabled={uploading} style={{display: 'none'}} />
          </label>
        )}
      </div>

      <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center'}}>
        <input
          type="text"
          placeholder="Search files and folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'white'
          }}
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="size-asc">Size (Smallest)</option>
          <option value="size-desc">Size (Largest)</option>
          <option value="date-asc">Date (Oldest)</option>
          <option value="date-desc">Date (Newest)</option>
        </select>
      </div>

      {searchQuery && (
        <div style={{marginBottom: '1rem', color: '#666', fontSize: '14px'}}>
          Showing {filteredCount} of {totalItems} items
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      
      <ul className="file-list">
        {filteredFolders.map(folder => (
          <li key={folder.name} className="file-item" onClick={() => navigateToFolder(folder.name)} style={{cursor: 'pointer'}}>
            <div>
              <div className="file-name">📁 {folder.name}</div>
              <div className="file-size" style={{color: '#666'}}>Folder</div>
            </div>
            <span style={{color: '#0066cc'}}>→</span>
          </li>
        ))}
        {filteredFiles.map(file => (
          <li key={file.key} className="file-item">
            <div>
              <div className="file-name">📄 {file.name}</div>
              <div className="file-size">
                {(file.size / 1024).toFixed(2)} KB
                {file.lastModified && (
                  <span style={{marginLeft: '1rem', color: '#666'}}>
                    • {new Date(file.lastModified).toLocaleString()}
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
      {filteredCount === 0 && searchQuery && <p>No items match "{searchQuery}"</p>}
      {totalItems === 0 && !searchQuery && <p>No files or folders</p>}
    </div>
  );
}

export default BucketView;
