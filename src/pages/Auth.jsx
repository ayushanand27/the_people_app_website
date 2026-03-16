import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [isLogin,  setIsLogin]  = useState(true)
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState('')

  async function handleEmail(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Check your email to confirm!')
    }
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  const inputStyle = {
    width: '100%', border: '3px solid #1C1C3A',
    borderRadius: 50, padding: '14px 20px',
    fontSize: 15, fontWeight: 600,
    background: '#FFF0F5', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FFF0F5',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80,
            background: '#FF85B3',
            border: '4px solid #1C1C3A',
            borderRadius: 24,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 36,
            boxShadow: '6px 6px 0 #1C1C3A',
            margin: '0 auto 16px'
          }}>P</div>
          <div style={{ fontWeight: 900, fontSize: 32, color: '#1C1C3A' }}>
            The People App
          </div>
          <div style={{ color: '#888', marginTop: 6, fontSize: 16, fontWeight: 600 }}>
            Stop scrolling. Start belonging. ✨
          </div>
        </div>

        {/* CARD */}
        <div style={{
          background: 'white',
          border: '4px solid #1C1C3A',
          borderRadius: 28, padding: 32,
          boxShadow: '8px 8px 0 #1C1C3A'
        }}>
          <div style={{ fontWeight: 900, fontSize: 22, textAlign: 'center', marginBottom: 24 }}>
            {isLogin ? 'Welcome back 👋' : 'Join the community 🚀'}
          </div>

          {/* GOOGLE */}
          <button onClick={handleGoogle} style={{
            width: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 50, padding: '14px 20px',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: '4px 4px 0 #1C1C3A',
            marginBottom: 20, fontFamily: 'inherit',
            transition: 'all 0.2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0 #1C1C3A' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 #1C1C3A' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* DIVIDER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 2, background: '#eee' }} />
            <span style={{ color: '#aaa', fontWeight: 700, fontSize: 14 }}>or</span>
            <div style={{ flex: 1, height: 2, background: '#eee' }} />
          </div>

          {/* EMAIL FORM */}
          <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" placeholder="Email address 📧"
              value={email} onChange={e => setEmail(e.target.value)}
              required style={inputStyle}
            />
            <input
              type="password" placeholder="Password 🔒"
              value={password} onChange={e => setPassword(e.target.value)}
              required style={inputStyle}
            />

            {message && (
              <div style={{
                background: '#FFF9C4', border: '3px solid #F1C40F',
                borderRadius: 16, padding: '12px 16px',
                fontWeight: 700, fontSize: 14, color: '#7A6000'
              }}>{message}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', background: '#FF85B3', color: 'white',
              border: '3px solid #1C1C3A', borderRadius: 50,
              padding: '16px 20px', fontWeight: 900, fontSize: 17,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '5px 5px 0 #1C1C3A',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s', marginTop: 4
            }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #1C1C3A' } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #1C1C3A' }}
            >
              {loading ? 'Loading...' : isLogin ? 'Login →' : 'Create Account →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888', fontWeight: 600 }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} style={{
              color: '#FF85B3', fontWeight: 900, background: 'none',
              border: 'none', cursor: 'pointer', fontSize: 14,
              fontFamily: 'inherit'
            }}>
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </div>
        </div>

        {/* BOTTOM TEXT */}
        <div style={{ textAlign: 'center', marginTop: 20, color: '#aaa', fontSize: 13, fontWeight: 600 }}>
          🔒 Your data is safe. No spam ever.
        </div>
      </div>
    </div>
  )
}
