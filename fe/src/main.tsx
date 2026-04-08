import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if ('serviceWorker' in navigator) {
  void (async () => {
    try {
      const { getSerwist } = await import('virtual:serwist')
      const s = await getSerwist()
      void s?.register()
    } catch {
      /* ignore */
    }
  })()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
