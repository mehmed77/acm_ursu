import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Pre-initialize Monaco loader so CDN scripts download in background
// immediately on app boot — not on first ProblemDetail navigation.
import { loader } from '@monaco-editor/react';
loader.init().catch(() => {/* silently ignore CDN errors */});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
