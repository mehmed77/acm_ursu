import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Monaco local bundle setup — CDN o'rniga, CSP unsafe-eval talab qilmaydi
import './monaco-setup.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
