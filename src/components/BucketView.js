import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get, post } from 'aws-amplify/api';
import DeleteConfirmModal from './DeleteConfirmModal';
import DestinationPickerModal from './DestinationPickerModal';
import PromptModal from './PromptModal';

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
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [destinationModalOpen, setDestinationModalOpen] = useState(false);
  const [copyMoveAction, setCopyMoveAction] = useState(null);
  const [toast, setToast] = useState(null);

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

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const goBack = () => {
    if (pathParts.length > 0) {
      // Go to parent folder
      navigateToPath(pathParts.length - 2);
    } else {
      // Go to bucket list
      navigate('/');
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

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  const toggleFileSelection = (fileKey) => {
    setSelectedFiles(prev => 
      prev.includes(fileKey) 
        ? prev.filter(k => k !== fileKey)
        : [...prev, fileKey]
    );
  };

  const selectAllFiles = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => f.key));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.length === 1) {
      // Single file - direct download
      await handleDownload(selectedFiles[0]);
    } else {
      // Multiple files - download as zip
      try {
        const session = await fetchAuthSession();
        const response = await post({
          apiName: 'S3BrowserAPI',
          path: `/buckets/${bucketName}/download-zip`,
          options: {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken}`
            },
            body: {
              keys: selectedFiles
            }
          }
        }).response;
        
        const data = await response.body.json();
        window.open(data.downloadUrl, '_blank');
        showToast(`Downloading ${selectedFiles.length} files as ZIP`);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleBulkDelete = () => {
    setDeleteTarget({ isBulk: true, count: selectedFiles.length });
    setDeleteModalOpen(true);
  };

  const handleCopy = () => {
    setCopyMoveAction('copy');
    setDestinationModalOpen(true);
  };

  const handleMove = () => {
    setCopyMoveAction('move');
    setDestinationModalOpen(true);
  };

  const handleCreateFolder = async (folderName) => {
    try {
      // Create a placeholder file to create the folder
      const session = await fetchAuthSession();
      const folderPath = currentPrefix + folderName + '/.folder';
      
      await post({
        apiName: 'S3BrowserAPI',
        path: `/buckets/${bucketName}/upload`,
        options: {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken}`
          },
          body: {
            fileName: folderPath,
            fileType: 'text/plain',
            fileContent: btoa('') // Empty file
          }
        }
      }).response;
      
      loadBucketContents(currentPrefix);
      showToast(`Folder "${folderName}" created`);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmCopyMove = async (destBucket, destPrefix) => {
    try {
      for (const key of selectedFiles) {
        const session = await fetchAuthSession();
        await post({
          apiName: 'S3BrowserAPI',
          path: `/buckets/${bucketName}/${copyMoveAction}`,
          options: {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken}`
            },
            body: {
              sourceKey: key,
              destBucket: destBucket,
              destPrefix: destPrefix
            }
          }
        }).response;
      }
      
      setSelectedFiles([]);
      loadBucketContents(currentPrefix);
      setDestinationModalOpen(false);
      showToast(`${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} ${copyMoveAction === 'copy' ? 'copied' : 'moved'}`);
    } catch (err) {
      setError(err.message);
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

  const handleDelete = (key, fileName) => {
    setDeleteTarget({ key, fileName: fileName || key.split('/').pop(), isBulk: false });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.isBulk) {
        // Bulk delete
        for (const key of selectedFiles) {
          const session = await fetchAuthSession();
          await post({
            apiName: 'S3BrowserAPI',
            path: `/buckets/${bucketName}/delete`,
            options: {
              headers: {
                Authorization: `Bearer ${session.tokens.idToken}`
              },
              body: { key }
            }
          }).response;
        }
        setSelectedFiles([]);
        showToast(`${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} deleted`);
      } else {
        // Single delete
        const session = await fetchAuthSession();
        await post({
          apiName: 'S3BrowserAPI',
          path: `/buckets/${bucketName}/delete`,
          options: {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken}`
            },
            body: { key: deleteTarget.key }
          }
        }).response;
        showToast(`"${deleteTarget.fileName}" deleted`);
      }
      
      loadBucketContents(currentPrefix);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
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
          <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
            <button onClick={goBack} className="btn-back">
              ← Back
            </button>
            <button onClick={() => navigate('/')} className="btn-back" style={{background: '#8e8e93'}}>
              Return to Home
            </button>
          </div>
          <h2 style={{marginTop: '0.5rem'}}>
            {bucketName}
            {pathParts.length > 0 && (
              <span style={{fontSize: '0.8em', color: '#8e8e93', fontWeight: 'normal'}}>
                {' / '}
                <span 
                  onClick={() => navigateToPath(-1)} 
                  style={{cursor: 'pointer', color: '#007aff'}}
                >
                  root
                </span>
                {pathParts.map((part, index) => (
                  <span key={index}>
                    {' / '}
                    <span 
                      onClick={() => navigateToPath(index)} 
                      style={{cursor: 'pointer', color: '#007aff'}}
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
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <button 
              onClick={() => setPromptModalOpen(true)}
              className="btn-upload"
              style={{background: '#34c759'}}
            >
              Create Folder
            </button>
            <button 
              onClick={() => navigate(`/bucket/${bucketName}/upload${currentPrefix ? `?prefix=${currentPrefix}` : ''}`)}
              className="btn-upload"
            >
              Upload Files
            </button>
          </div>
        )}
      </div>

      <div style={{display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center'}}>
        {selectedFiles.length > 0 && (
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <button
              onClick={handleBulkDownload}
              style={{
                padding: '0.625rem 0.875rem',
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              title="Download selected files"
            >
              ↓ {selectedFiles.length}
            </button>
            <button
              onClick={handleCopy}
              style={{
                padding: '0.625rem 0.875rem',
                backgroundColor: '#34c759',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              title="Copy selected files"
            >
              📋 {selectedFiles.length}
            </button>
            <button
              onClick={handleMove}
              style={{
                padding: '0.625rem 0.875rem',
                backgroundColor: '#ff9500',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              title="Move selected files"
            >
              ➡️ {selectedFiles.length}
            </button>
            {canWrite && (
              <button
                onClick={handleBulkDelete}
                style={{
                  padding: '0.625rem 0.875rem',
                  backgroundColor: '#ff3b30',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                title="Delete selected files"
              >
                🗑️ {selectedFiles.length}
              </button>
            )}
            <button
              onClick={() => setSelectedFiles([])}
              style={{
                padding: '0.625rem 0.875rem',
                backgroundColor: '#8e8e93',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              title="Clear selection"
            >
              Clear
            </button>
          </div>
        )}
        {filteredFiles.length > 0 && (
          <button
            onClick={selectAllFiles}
            style={{
              padding: '0.625rem 0.875rem',
              backgroundColor: '#f2f2f7',
              color: '#007aff',
              border: '1px solid #d1d1d6',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {selectedFiles.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
        <input
          type="text"
          placeholder="Search files and folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '0.625rem 0.875rem',
            border: '1px solid #d1d1d6',
            borderRadius: '10px',
            fontSize: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#007aff'}
          onBlur={(e) => e.target.style.borderColor = '#d1d1d6'}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '0.625rem 0.875rem',
            border: '1px solid #d1d1d6',
            borderRadius: '10px',
            fontSize: '15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
            backgroundColor: 'white',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="size-asc">Size (Smallest)</option>
          <option value="size-desc">Size (Largest)</option>
          <option value="date-asc">Date (Oldest)</option>
          <option value="date-desc">Date (Newest)</option>
        </select>
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

      {searchQuery && (
        <div style={{marginBottom: '1rem', color: '#8e8e93', fontSize: '15px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif'}}>
          Showing {filteredCount} of {totalItems} items
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      
      {viewMode === 'list' ? (
        <ul className="file-list">
          {filteredFolders.map(folder => (
            <li key={folder.name} className="file-item" onClick={() => navigateToFolder(folder.name)} style={{cursor: 'pointer'}}>
              <div>
                <div className="file-name">📁 {folder.name}</div>
                <div className="file-size" style={{color: '#8e8e93'}}>Folder</div>
              </div>
              <span style={{color: '#007aff', fontSize: '20px'}}>›</span>
            </li>
          ))}
          {filteredFiles.map(file => (
            <li key={file.key} className="file-item">
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flex: 1}}>
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.key)}
                  onChange={() => toggleFileSelection(file.key)}
                  style={{width: '18px', height: '18px', cursor: 'pointer'}}
                />
                <div>
                  <div className="file-name">📄 {file.name}</div>
                  <div className="file-size">
                    {(file.size / 1024).toFixed(2)} KB
                    {file.lastModified && (
                      <span style={{marginLeft: '1rem', color: '#8e8e93'}}>
                        • {new Date(file.lastModified).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button 
                  onClick={() => handleDownload(file.key)} 
                  className="btn-download"
                  title="Download"
                >
                  ↓
                </button>
                {canWrite && (
                  <button 
                    onClick={() => handleDelete(file.key, file.name)} 
                    style={{
                      background: '#ff3b30',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: '500',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#d32f2f'}
                    onMouseLeave={(e) => e.target.style.background = '#ff3b30'}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem'
        }}>
          {filteredFolders.map(folder => (
            <div
              key={folder.name}
              onClick={() => navigateToFolder(folder.name)}
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e5ea',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9f9f9';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{fontSize: '48px', marginBottom: '0.5rem'}}>📁</div>
              <div className="grid-card-text">
                {folder.name}
              </div>
            </div>
          ))}
          {filteredFiles.map(file => (
            <div
              key={file.key}
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: selectedFiles.includes(file.key) ? '2px solid #007aff' : '1px solid #e5e5ea',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!selectedFiles.includes(file.key)) {
                  e.currentTarget.style.backgroundColor = '#f9f9f9';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selectedFiles.includes(file.key)) {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                }
              }}
            >
              <input
                type="checkbox"
                checked={selectedFiles.includes(file.key)}
                onChange={() => toggleFileSelection(file.key)}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  left: '0.75rem',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <div style={{fontSize: '48px', marginBottom: '0.5rem'}}>📄</div>
              <div className="grid-card-text">
                {file.name}
              </div>
              <div className="grid-card-size">
                {(file.size / 1024).toFixed(2)} KB
              </div>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button
                  onClick={() => handleDownload(file.key)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: '#007aff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0051d5'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#007aff'}
                  title="Download"
                >
                  ↓
                </button>
                {canWrite && (
                  <button
                    onClick={() => handleDelete(file.key, file.name)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#ff3b30',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#d32f2f'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#ff3b30'}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {filteredCount === 0 && searchQuery && <p style={{color: '#8e8e93', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif'}}>No items match "{searchQuery}"</p>}
      {totalItems === 0 && !searchQuery && <p style={{color: '#8e8e93', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif'}}>No files or folders</p>}
      
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(28, 28, 30, 0.95)',
          color: 'white',
          padding: '0.875rem 1.5rem',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: '500',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          animation: 'slideUp 0.3s ease',
          backdropFilter: 'blur(10px)'
        }}>
          {toast}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        fileName={deleteTarget?.fileName}
        fileCount={deleteTarget?.isBulk ? deleteTarget.count : 1}
      />

      <DestinationPickerModal
        isOpen={destinationModalOpen}
        onClose={() => {
          setDestinationModalOpen(false);
          setCopyMoveAction(null);
        }}
        onConfirm={confirmCopyMove}
        action={copyMoveAction}
        selectedCount={selectedFiles.length}
      />

      <PromptModal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        onConfirm={(folderName) => {
          handleCreateFolder(folderName);
          setPromptModalOpen(false);
        }}
        title="Create Folder"
        message="Enter a name for the new folder"
        placeholder="Folder name"
      />
    </div>
  );
}

export default BucketView;
