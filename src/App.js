import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import BucketList from './components/BucketList';
import BucketView from './components/BucketView';

function App() {
  return (
    <Authenticator loginMechanisms={['email']} socialProviders={['entra']}>
      {({ signOut, user }) => (
        <BrowserRouter>
          <div className="app">
            <header className="app-header">
              <div className="header-content">
                <h1>PalawanPay S3 Browser</h1>
                <div className="user-info">
                  <span>{user?.signInDetails?.loginId || user?.username}</span>
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
