import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { signInWithRedirect, fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import BucketList from './components/BucketList';
import BucketView from './components/BucketView';

function App() {
  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        await fetchAuthSession();
      } catch {
        // Not authenticated, redirect to IAM Identity Center
        signInWithRedirect({ provider: 'IAMIdentityCenter' });
      }
    };
    checkAuth();
  }, []);

  return (
    <Authenticator hideSignUp={true}>
      {({ signOut, user }) => (
        <BrowserRouter>
          <div className="app">
            <header className="app-header">
              <div className="header-content">
                <img src="/PalawanPay logo - Yellow - horizontal stack.png" alt="PalawanPay" style={{height: '40px'}} />
                <h1 style={{marginLeft: '1rem'}}>S3 Browser</h1>
                <div className="user-info">
                  <span>Happy Palawan Day, {user?.signInDetails?.loginId || user?.username?.replace('IAMIdentityCenter_', '') || user?.attributes?.email}</span>
                  <button onClick={signOut} className="btn-signout">Sign Out</button>
                </div>
              </div>
            </header>
            <main className="app-main">
              <Routes>
                <Route path="/" element={<BucketList user={user} />} />
                <Route path="/bucket/:bucketName" element={<BucketView user={user} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      )}
    </Authenticator>
  );
}

export default App;
