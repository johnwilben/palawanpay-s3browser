import React, { useState } from 'react';
import './HelpButton.css';

function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="help-button" onClick={() => setIsOpen(true)}>
        ?
      </button>

      {isOpen && (
        <div className="help-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-header">
              <h2>Help & Guide</h2>
              <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
            </div>
            
            <div className="help-content">
              <section>
                <h3>📁 Navigating Folders</h3>
                <ul>
                  <li>Click on a folder to open it</li>
                  <li>Use the breadcrumb path at the top to go back</li>
                  <li>Click "root" to return to the bucket's main folder</li>
                </ul>
              </section>

              <section>
                <h3>🔍 Search & Sort</h3>
                <ul>
                  <li>Use the search bar to filter files and folders in the current folder</li>
                  <li>Sort by name, size, or date using the dropdown</li>
                  <li>Search is case-insensitive</li>
                </ul>
              </section>

              <section>
                <h3>📤 Uploading Files</h3>
                <ul>
                  <li>Click "Upload File" button (only visible if you have write access)</li>
                  <li>Files are uploaded to the current folder you're viewing</li>
                  <li>Wait for the upload to complete before navigating away</li>
                </ul>
              </section>

              <section>
                <h3>📥 Downloading Files</h3>
                <ul>
                  <li>Click the "Download" button next to any file</li>
                  <li>File will open in a new tab or download automatically</li>
                </ul>
              </section>

              <section>
                <h3>🔒 Permissions</h3>
                <ul>
                  <li><strong>Read-only:</strong> You can view and download files only</li>
                  <li><strong>Write access:</strong> You can upload, download, and delete files</li>
                  <li>Your access is determined by your IAM Identity Center groups</li>
                  <li>You only see buckets you have permission to access</li>
                </ul>
              </section>

              <section>
                <h3>❓ Troubleshooting</h3>
                <ul>
                  <li><strong>Can't see a bucket?</strong> You may not have access. Contact your administrator.</li>
                  <li><strong>Upload button missing?</strong> You only have read-only access to this bucket.</li>
                  <li><strong>Changes not reflecting?</strong> Try logging out and back in.</li>
                </ul>
              </section>

              <section>
                <h3>📞 Support</h3>
                <p>For access requests or technical issues, contact your IT administrator.</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HelpButton;
