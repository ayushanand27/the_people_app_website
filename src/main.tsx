import './lib/authBootstrap'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initSentry, Sentry } from './lib/sentry'
import { initAnalytics } from './lib/analytics'
import ErrorFallback from './components/ErrorFallback'

initSentry()
initAnalytics()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
