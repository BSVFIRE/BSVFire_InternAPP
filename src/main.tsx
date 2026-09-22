import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ryddLagringVedBehov } from './lib/offline'

// Full localStorage gjør at Supabase ikke får lagret sesjonen, og brukeren fremstår som utlogget
ryddLagringVedBehov()

// Etter en deploy kan en åpen fane ha gammel index.html som peker på chunk-filer som ikke finnes lenger
// (Netlify svarer da med index.html → «not a valid JavaScript MIME type»). Last siden på nytt én gang.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'fc_chunk_reload'
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
