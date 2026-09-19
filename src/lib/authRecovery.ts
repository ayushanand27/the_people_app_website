const RESET_KEY = 'peopleapp_password_reset_pending'
const GOOGLE_OAUTH_KEY = 'peopleapp_google_oauth_pending'
const RESET_TTL_MS = 60 * 60 * 1000 // 1 hour

function storageGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

function storageSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value)
  } catch { /* private mode / blocked storage */ }
}

function storageRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key)
  } catch { /* ignore */ }
}

/** localStorage survives Gmail in-app browser better than sessionStorage */
export function markPasswordResetPending(): void {
  storageSet(localStorage, RESET_KEY, String(Date.now()))
}

export function clearPasswordResetPending(): void {
  storageRemove(localStorage, RESET_KEY)
}

export function isPasswordResetPending(): boolean {
  const ts = storageGet(localStorage, RESET_KEY)
  if (!ts) return false
  if (Date.now() - Number(ts) > RESET_TTL_MS) {
    clearPasswordResetPending()
    return false
  }
  return true
}

export function markGoogleOAuthPending(): void {
  storageSet(sessionStorage, GOOGLE_OAUTH_KEY, '1')
}

export function clearGoogleOAuthPending(): void {
  storageRemove(sessionStorage, GOOGLE_OAUTH_KEY)
}

export function isGoogleOAuthPending(): boolean {
  return storageGet(sessionStorage, GOOGLE_OAUTH_KEY) === '1'
}

function hasAuthCallbackInUrl(): boolean {
  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash
  return (
    params.has('code') ||
    params.has('token_hash') ||
    params.get('type') === 'recovery' ||
    hash.includes('access_token') ||
    hash.includes('type=recovery')
  )
}

/** Must run synchronously before Supabase client parses the URL (see authBootstrap.ts). */
export function redirectRecoveryToResetPage(): boolean {
  if (window.location.pathname === '/reset-password') return false

  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash
  const hasCode = params.has('code')
  const isGoogleReturn = hasCode && isGoogleOAuthPending()

  if (isGoogleReturn) return false

  const shouldRedirect =
    params.get('type') === 'recovery' ||
    params.has('token_hash') ||
    hash.includes('type=recovery') ||
    hasCode ||
    hash.includes('access_token')

  if (!shouldRedirect) return false

  window.location.replace(`/reset-password${window.location.search}${hash}`)
  return true
}

export function shouldBlockAppForPasswordReset(session?: unknown): boolean {
  if (!isPasswordResetPending()) return false
  if (hasAuthCallbackInUrl()) return true
  return Boolean(session)
}
