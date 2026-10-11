import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import EmailAction, { emailActionFromUrl } from './components/StudentPortal/EmailAction.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* A link from a Firebase email ("verify your email" etc.) gets its own small page */}
      {emailActionFromUrl() ? <EmailAction /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
