import './lib/authBootstrap.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSentry, Sentry } from './lib/sentry'
import { initAnalytics } from './lib/analytics'
import ErrorFallback from './components/ErrorFallback.jsx'

initSentry()
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
