/** True when URL contains a Supabase password-recovery token (hash or query). */
export function isPasswordRecoveryUrl() {
  const hash = window.location.hash
  if (hash.includes('type=recovery')) return true
  const params = new URLSearchParams(window.location.search)
  return params.get('type') === 'recovery'
}

/** Send recovery links to /auth and keep the hash so Supabase can parse tokens. */
export function redirectRecoveryToAuth() {
  if (!isPasswordRecoveryUrl()) return false
  if (window.location.pathname === '/auth') return false
  window.location.replace(`/auth${window.location.hash}`)
  return true
}
