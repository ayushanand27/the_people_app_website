import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { clearPasswordResetPending, isPasswordResetPending } from '../lib/authRecovery'

const inputStyle = {
  width: '100%', border: '3px solid #1C1C3A',
  borderRadius: 50, padding: '14px 20px',
  fontSize: 15, fontWeight: 600,
  background: '#FFF0F5', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function ResetPassword() {
  const [phase, setPhase] = useState('loading')
  const [message, setMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => {}
    let sawRecovery = false

    const showForm = () => {
      if (!cancelled) setPhase('form')
    }
    const showError = (msg) => {
      if (!cancelled) {
        setMessage(msg)
        setPhase('error')
      }
    }

    async function init() {
      const params = new URLSearchParams(window.location.search)
      const hash = window.location.hash
      const code = params.get('code')
      const tokenHash = params.get('token_hash')
      const type = params.get('type')

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') sawRecovery = true
      })
      unsubscribe = () => subscription.unsubscribe()

      if (code) {
        await supabase.auth.signOut({ scope: 'local' })
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        window.history.replaceState({}, '', '/reset-password')
        if (error) return showError(error.message)

        await new Promise(r => setTimeout(r, 50))
        if (sawRecovery || isPasswordResetPending()) return showForm()
        return window.location.replace('/')
      }

      if (tokenHash && type === 'recovery') {
        await supabase.auth.signOut({ scope: 'local' })
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        window.history.replaceState({}, '', '/reset-password')
        if (error) return showError(error.message)
        return showForm()
      }

      if (hash.includes('access_token')) {
        await supabase.auth.signOut({ scope: 'local' })
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          window.history.replaceState({}, '', '/reset-password')
          if (error) return showError(error.message)
          return showForm()
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session && (sawRecovery || isPasswordResetPending())) return showForm()

      showError('Invalid or expired reset link. Request a new one from the login page.')
    }

    init()
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    setSubmitting(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setMessage(error.message)
      setSubmitting(false)
      return
    }

    clearPasswordResetPending()
    await supabase.auth.signOut({ scope: 'local' })
    setPhase('success')
    setMessage('Password updated! Log in with your new password.')
    setSubmitting(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FFF0F5',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, background: '#FF85B3',
            border: '4px solid #1C1C3A', borderRadius: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 36,
            boxShadow: '6px 6px 0 #1C1C3A', margin: '0 auto 16px',
          }}>P</div>
          <div style={{ fontWeight: 900, fontSize: 32, color: '#1C1C3A' }}>The People App</div>
        </div>

        <div style={{
          background: 'white', border: '4px solid #1C1C3A',
          borderRadius: 28, padding: 32, boxShadow: '8px 8px 0 #1C1C3A',
        }}>
          <div style={{ fontWeight: 900, fontSize: 22, textAlign: 'center', marginBottom: 24 }}>
            {phase === 'success' ? 'All done! ✅' : 'Set new password 🔒'}
          </div>

          {phase === 'loading' && (
            <p style={{ textAlign: 'center', color: '#666', fontWeight: 600 }}>
              Verifying your reset link...
            </p>
          )}

          {phase === 'form' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                placeholder="New password 🔒"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
              />
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                placeholder="Confirm password 🔒"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
              />
              <button type="submit" disabled={submitting} style={{
                width: '100%', background: '#4CAF82', color: 'white',
                border: '3px solid #1C1C3A', borderRadius: 50,
                padding: '16px 20px', fontWeight: 900, fontSize: 17,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '5px 5px 0 #1C1C3A', opacity: submitting ? 0.6 : 1,
              }}>
                {submitting ? 'Saving...' : 'Update password →'}
              </button>
            </form>
          )}

          {phase === 'error' && (
            <p style={{ color: '#666', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>
              {message}
            </p>
          )}

          {phase === 'success' && (
            <p style={{ color: '#666', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>
              {message}
            </p>
          )}

          {message && phase === 'form' && (
            <div style={{
              background: '#FFF9C4', border: '3px solid #F1C40F',
              borderRadius: 16, padding: '12px 16px', marginTop: 16,
              fontWeight: 700, fontSize: 14, color: '#7A6000',
            }}>{message}</div>
          )}

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888', fontWeight: 600 }}>
            <Link to="/auth" style={{ color: '#FF85B3', fontWeight: 900, textDecoration: 'none' }}>
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
