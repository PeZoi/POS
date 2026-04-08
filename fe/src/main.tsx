import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('./pwa')
    .then((m) => m.registerSerwist?.())
    .catch(() => {
      // ignore
    })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
