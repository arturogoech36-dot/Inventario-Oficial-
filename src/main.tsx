import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { cleanupBloatedLocalStorage } from './utils/attachmentStorage';
import { ErrorBoundary } from './components/ErrorBoundary';

// Clean bloated keys before React initialization
try {
  cleanupBloatedLocalStorage();
} catch (e) {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
