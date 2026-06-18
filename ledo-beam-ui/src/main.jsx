/**
 * =============================================================================
 * LEDO-Beam — Entry Point (main.jsx)
 * =============================================================================
 * 
 * Bootstraps the React application. Imports global styles (TailwindCSS v4).
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech)
 * =============================================================================
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
