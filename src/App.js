import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { signInWithRedirect } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import BucketList from './components/BucketList';
import BucketView from './components/BucketView';
import UploadPage from './components/UploadPage';
import HelpButton from './components/HelpButton';

const components = {
  SignIn: {
    Header() {
      return (
        <div className="custom-login">
          <div className="login-container">
            <img 
              src="/PalawanPay logo - Yellow - horizontal stack.png" 
              alt="PalawanPay" 
              className="login-logo"
            />
            <h1 className="login-title">S3 Browser</h1>
            <p className="login-subtitle">Secure access to your S3 buckets across multiple accounts</p>
            <button 
              onClick={() => signInWithRedirect({ provider: 'IAMIdentityCenter' })}
              className="login-button"
            >
              <svg className="login-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Sign In
            </button>
            <p className="login-footer">Happy Palawan Day!</p>
          </div>
        </div>
      );
    },
    Footer() {
      return null;
    }
  }
};

function App() {
  return (
    <Authenticator hideSignUp={true} components={components}>
      {({ signOut, user }) => (
        <BrowserRouter>
          <div className="app">
            <header className="app-header">
              <div className="header-content">
                <img src="/PalawanPay logo - Yellow - horizontal stack.png" alt="PalawanPay" style={{height: '40px'}} />
                <h1 style={{marginLeft: '1rem'}}>S3 Browser</h1>
                <div className="user-info">
                  <span>Happy Palawan Day, {user?.attributes?.name || user?.signInDetails?.loginId || user?.username?.replace('IAMIdentityCenter_', '') || user?.attributes?.email}</span>
                  <button onClick={signOut} className="btn-signout">Sign Out</button>
                </div>
              </div>
            </header>
            <main className="app-main">
              <Routes>
                <Route path="/" element={<BucketList user={user} />} />
                <Route path="/bucket/:bucketName" element={<BucketView user={user} />} />
                <Route path="/bucket/:bucketName/upload" element={<UploadPage user={user} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            <HelpButton />
          </div>
        </BrowserRouter>
      )}
    </Authenticator>
  );
}

export default App;
