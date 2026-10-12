import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import EmailAction, { emailActionFromUrl } from './components/StudentPortal/EmailAction.jsx';
import './index.css';

// After a new version is published, a page left open may ask for files that no longer exist.
// Reload once to pick up the new version instead of breaking (logins are kept, they are stored).
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('gfy_reloaded_for_update') || 0);
    if (Date.now() - last < 60 * 1000) return; // already tried just now: let the error show
    sessionStorage.setItem('gfy_reloaded_for_update', String(Date.now()));
  } catch (e) { /* storage blocked: still reload */ }
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* A link from a Firebase email ("verify your email" etc.) gets its own small page */}
      {emailActionFromUrl() ? <EmailAction /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
