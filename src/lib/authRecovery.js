const RESET_KEY = 'peopleapp_password_reset_pending'
const RESET_TTL_MS = 60 * 60 * 1000 // 1 hour

/** Call when user submits "Forgot password" — survives in-app browsers that strip URL hash. */
export function markPasswordResetPending() {
  sessionStorage.setItem(RESET_KEY, String(Date.now()))
}

export function clearPasswordResetPending() {
  sessionStorage.removeItem(RESET_KEY)
}

export function isPasswordResetPending() {
  const ts = sessionStorage.getItem(RESET_KEY)
  if (!ts) return false
  if (Date.now() - Number(ts) > RESET_TTL_MS) {
    clearPasswordResetPending()
    return false
  }
  return true
}

/** True when URL contains a Supabase auth callback for password recovery. */
export function isPasswordRecoveryUrl() {
  const hash = window.location.hash
  if (hash.includes('type=recovery')) return true

  const params = new URLSearchParams(window.location.search)
  if (params.get('type') === 'recovery') return true

  // PKCE / implicit auth callback on /auth after email link
  if (window.location.pathname === '/auth' || window.location.pathname === '/') {
    if (params.has('code') && isPasswordResetPending()) return true
    if (hash.includes('access_token') && hash.includes('type=recovery')) return true
  }

  return false
}

export function shouldShowPasswordRecovery(session, event) {
  if (event === 'PASSWORD_RECOVERY') return true
  if (isPasswordRecoveryUrl()) return true
  if (session && isPasswordResetPending()) return true
  return false
}

/** Send auth callbacks to /auth and preserve query + hash (required for PKCE code). */
export function redirectRecoveryToAuth() {
  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash
  const isAuthCallback =
    isPasswordRecoveryUrl() ||
    params.has('code') ||
    hash.includes('access_token') ||
    (isPasswordResetPending() && (params.has('code') || hash.length > 1))

  if (!isAuthCallback) return false
  if (window.location.pathname === '/auth') return false

  window.location.replace(`/auth${window.location.search}${window.location.hash}`)
  return true
}
