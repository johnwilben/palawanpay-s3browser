import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get } from 'aws-amplify/api';

const PREVIEW_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'],
  video: ['mp4', 'webm', 'ogg', 'mov'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
  pdf: ['pdf'],
  text: ['txt', 'csv', 'json', 'xml', 'yaml', 'yml', 'md', 'log', 'ini', 'conf', 'sh', 'py', 'js', 'html', 'css', 'sql', 'env']
};

function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  for (const [type, exts] of Object.entries(PREVIEW_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return 'unknown';
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function FilePreviewModal({ file, bucketName, onClose, onDownload }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMetadata, setShowMetadata] = useState(false);

  const fileType = getFileType(file.name);

  const fetchPreviewUrl = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await fetchAuthSession();
      const response = await get({
        apiName: 'S3BrowserAPI',
        path: `/buckets/${bucketName}/download`,
        options: {
          queryParams: { key: file.key || file.name },
          headers: { Authorization: `Bearer ${session.tokens.idToken}` }
        }
      }).response;
      const data = await response.body.json();
      setPreviewUrl(data.downloadUrl);

      // For text files, fetch content
      if (fileType === 'text' && file.size < 1048576) { // < 1MB
        try {
          const textRes = await fetch(data.downloadUrl);
          const text = await textRes.text();
          setTextContent(text);
        } catch { setTextContent('Unable to load file content'); }
      }
    } catch (e) {
      setError('Unable to generate preview URL');
    } finally {
      setLoading(false);
    }
  }, [bucketName, file, fileType]);

  useEffect(() => {
    fetchPreviewUrl();
  }, [fetchPreviewUrl]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const renderPreview = () => {
    if (loading) return <div style={styles.loader}>Loading preview...</div>;
    if (error) return <div style={styles.noPreview}>{error}</div>;

    switch (fileType) {
      case 'image':
        return <img src={previewUrl} alt={file.name} style={styles.image} />;
      case 'video':
        return <video src={previewUrl} controls style={styles.media} />;
      case 'audio':
        return (
          <div style={styles.audioWrap}>
            <div style={styles.audioIcon}>🎵</div>
            <audio src={previewUrl} controls style={styles.audio} />
          </div>
        );
      case 'pdf':
        return <iframe src={previewUrl} title={file.name} style={styles.pdf} />;
      case 'text':
        return (
          <pre style={styles.textContent}>
            {textContent || 'Loading...'}
          </pre>
        );
      default:
        return (
          <div style={styles.noPreview}>
            <div style={styles.noPreviewIcon}>📄</div>
            <p>Preview not available for this file type</p>
            <p style={styles.noPreviewHint}>.{file.name.split('.').pop()} files cannot be previewed</p>
          </div>
        );
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.fileName}>{file.name.split('/').pop()}</span>
            <span style={styles.fileSize}>{formatBytes(file.size)}</span>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.metaBtn} onClick={() => setShowMetadata(!showMetadata)}>
              {showMetadata ? 'Hide Info' : 'ℹ️ Info'}
            </button>
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Metadata Panel */}
        {showMetadata && (
          <div style={styles.metadataPanel}>
            <div style={styles.metaGrid}>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>File Name</span>
                <span style={styles.metaValue}>{file.name.split('/').pop()}</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Full Path</span>
                <span style={styles.metaValue}>{file.key || file.name}</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Size</span>
                <span style={styles.metaValue}>{formatBytes(file.size)}</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Last Modified</span>
                <span style={styles.metaValue}>{formatDate(file.lastModified)}</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Type</span>
                <span style={styles.metaValue}>{fileType.toUpperCase()} (.{file.name.split('.').pop()})</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Bucket</span>
                <span style={styles.metaValue}>{bucketName}</span>
              </div>
              {file.storageClass && (
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Storage Class</span>
                  <span style={styles.metaValue}>{file.storageClass}</span>
                </div>
              )}
              {file.etag && (
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>ETag</span>
                  <span style={styles.metaValue}>{file.etag}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Content */}
        <div style={styles.previewArea}>
          {renderPreview()}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.downloadBtn} onClick={() => onDownload(file)}>
            ⬇️ Download
          </button>
          {previewUrl && (
            <button style={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(previewUrl); }}>
              🔗 Copy Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 20
  },
  modal: {
    background: '#1c1c1e', borderRadius: 16, width: '90vw', maxWidth: 1000,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px', borderBottom: '1px solid #2c2c2e', flexShrink: 0
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  fileName: { fontSize: 15, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize: { fontSize: 12, color: '#8e8e93', flexShrink: 0 },
  closeBtn: { background: '#3a3a3c', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  metaBtn: { background: '#2c2c2e', border: '1px solid #3a3a3c', color: '#fff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 },
  metadataPanel: {
    padding: '12px 20px', borderBottom: '1px solid #2c2c2e', background: '#141414', flexShrink: 0
  },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 },
  metaItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  metaLabel: { fontSize: 11, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 13, color: '#e5e5e7', wordBreak: 'break-all' },
  previewArea: {
    flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 20, minHeight: 300
  },
  image: { maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 },
  media: { maxWidth: '100%', maxHeight: '60vh', borderRadius: 8 },
  pdf: { width: '100%', height: '60vh', border: 'none', borderRadius: 8 },
  textContent: {
    width: '100%', maxHeight: '60vh', overflow: 'auto', padding: 16,
    background: '#0a0a0a', borderRadius: 8, color: '#e5e5e7',
    fontSize: 13, fontFamily: 'SF Mono, Menlo, monospace', whiteSpace: 'pre-wrap',
    wordBreak: 'break-word', margin: 0, border: '1px solid #2c2c2e'
  },
  audioWrap: { textAlign: 'center' },
  audioIcon: { fontSize: 64, marginBottom: 20 },
  audio: { width: '100%', maxWidth: 400 },
  noPreview: { textAlign: 'center', color: '#8e8e93', padding: 40 },
  noPreviewIcon: { fontSize: 64, marginBottom: 16 },
  noPreviewHint: { fontSize: 12, color: '#48484a', marginTop: 8 },
  loader: { color: '#8e8e93', fontSize: 14 },
  footer: {
    display: 'flex', gap: 8, padding: '14px 20px',
    borderTop: '1px solid #2c2c2e', flexShrink: 0
  },
  downloadBtn: { padding: '8px 20px', background: '#007aff', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  copyBtn: { padding: '8px 20px', background: 'transparent', color: '#007aff', border: '1px solid #007aff', borderRadius: 8, cursor: 'pointer', fontSize: 14 }
};

export default FilePreviewModal;
