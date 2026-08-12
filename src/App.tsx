import { lazy, Suspense, useEffect, useState, type ReactElement } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { identifyUser } from './lib/analytics'
import {
  shouldBlockAppForPasswordReset,
  isGoogleOAuthPending,
  clearGoogleOAuthPending,
} from './lib/authRecovery'
import type { Profile } from './types'

import Auth from './pages/Auth'
import Landing from './pages/Landing'
import ResetPassword from './pages/ResetPassword'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

const Onboarding      = lazy(() => import('./pages/Onboarding'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Discover        = lazy(() => import('./pages/Discover'))
const Groups          = lazy(() => import('./pages/Groups'))
const Chat            = lazy(() => import('./pages/Chat'))
const Events          = lazy(() => import('./pages/Events'))
const Moments         = lazy(() => import('./pages/Moments'))
const Profile         = lazy(() => import('./pages/Profile'))
const Settings        = lazy(() => import('./pages/Settings'))
const Admin           = lazy(() => import('./pages/Admin'))
const Notifications   = lazy(() => import('./pages/Notifications'))
const Local           = lazy(() => import('./pages/Local'))
const LocalDetail     = lazy(() => import('./pages/LocalDetail'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50">
      <div className="text-2xl font-bold text-pink-500 animate-pulse">Loading... ✨</div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  )
}

function MainApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [oauthExchanging, setOauthExchanging] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    async function handleOAuthReturn() {
      if (!isGoogleOAuthPending()) return
      const code = new URLSearchParams(window.location.search).get('code')
      if (!code) return

      setOauthExchanging(true)
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      clearGoogleOAuthPending()
      if (!error) {
        window.history.replaceState({}, '', window.location.pathname || '/')
      } else {
        try {
          sessionStorage.setItem(
            'oauth_error',
            error.message || 'Google sign-in failed. Please try again.',
          )
        } catch { /* ignore */ }
        window.history.replaceState({}, '', '/auth')
      }
      setOauthExchanging(false)
    }

    handleOAuthReturn()
  }, [])

  async function fetchProfile(userId: string) {
    setProfileError('')
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      setProfileError(error.message || 'Could not load your profile. Please retry.')
      setLoading(false)
      return
    }

    if (data?.is_banned) {
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setProfile(data)
    if (data?.id) identifyUser(data.id)
    setLoading(false)
  }

  useEffect(() => {
    function handleAuthEvent(_event: AuthChangeEvent, s: Session | null) {
      setSession(s)
      if (s) fetchProfile(s.user.id)
      else {
        setProfile(null)
        setProfileError('')
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      handleAuthEvent(event, s)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading || oauthExchanging) return <PageLoader />

  if (shouldBlockAppForPasswordReset(session)) {
    return <Navigate to="/reset-password" replace />
  }

  if (session && profileError) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FFF0F5',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          maxWidth: 420, background: 'white', border: '3px solid #1C1C3A',
          borderRadius: 20, padding: 24, boxShadow: '6px 6px 0 #1C1C3A', textAlign: 'center',
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Couldn’t load profile</div>
          <div style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>{profileError}</div>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              fetchProfile(session.user.id)
            }}
            style={{
              background: '#FF85B3', color: 'white', border: '3px solid #1C1C3A',
              borderRadius: 50, padding: '12px 24px', fontWeight: 900, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const needsOnboarding = Boolean(session && (!profile || !profile.onboarding_complete))
  const authed = (el: ReactElement) => {
    if (!session) return <Navigate to="/auth" />
    if (needsOnboarding) return <Navigate to="/onboarding" />
    return el
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={
          !session ? <Landing /> :
          needsOnboarding ? <Navigate to="/onboarding" /> :
          <Navigate to="/dashboard" />
        } />
        <Route path="/auth" element={
          !session ? <Auth /> :
          needsOnboarding ? <Navigate to="/onboarding" /> :
          <Navigate to="/dashboard" />
        } />
        <Route path="/onboarding"  element={session ? <Onboarding profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" />} />
        <Route path="/dashboard"   element={authed(<Dashboard profile={profile} />)} />
        <Route path="/discover"    element={authed(<Discover  profile={profile} />)} />
        <Route path="/groups"      element={authed(<Groups    profile={profile} />)} />
        <Route path="/chat"        element={authed(<Chat      profile={profile} />)} />
        <Route path="/chat/:id"    element={authed(<Chat      profile={profile} />)} />
        <Route path="/events"      element={authed(<Events    profile={profile} />)} />
        <Route path="/moments"     element={authed(<Moments   profile={profile} />)} />
        <Route path="/local"      element={authed(<Local     profile={profile} />)} />
        <Route path="/local/:id"  element={authed(<LocalDetail profile={profile} />)} />
        <Route path="/profile/:id" element={authed(<Profile   profile={profile} />)} />
        <Route path="/settings"    element={authed(<Settings  profile={profile} setProfile={setProfile} />)} />
        <Route path="/notifications" element={authed(<Notifications profile={profile} />)} />
        <Route path="/admin" element={
          session && profile?.is_admin && profile?.onboarding_complete
            ? <Admin profile={profile} />
            : <Navigate to={needsOnboarding ? '/onboarding' : '/dashboard'} />
        } />
      </Routes>
    </Suspense>
  )
}
