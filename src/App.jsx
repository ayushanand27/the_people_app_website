import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { identifyUser } from './lib/analytics'
import {
  shouldBlockAppForPasswordReset,
  isGoogleOAuthPending,
  clearGoogleOAuthPending,
} from './lib/authRecovery'

import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'

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
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  )
}

function MainApp() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [oauthExchanging, setOauthExchanging] = useState(false)

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
      }
      setOauthExchanging(false)
    }

    handleOAuthReturn()
  }, [])

  useEffect(() => {
    function handleAuthEvent(_event, s) {
      setSession(s)
      if (s) fetchProfile(s.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      handleAuthEvent(event, s)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

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

  if (loading || oauthExchanging) return <PageLoader />

  if (shouldBlockAppForPasswordReset(session)) {
    return <Navigate to="/reset-password" replace />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={
          !session ? <Auth /> :
          !profile?.onboarding_complete ? <Navigate to="/onboarding" /> :
          <Navigate to="/dashboard" />
        } />
        <Route path="/auth" element={
          !session ? <Auth /> : <Navigate to="/dashboard" />
        } />
        <Route path="/onboarding"  element={session ? <Onboarding profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" />} />
        <Route path="/dashboard"   element={session ? <Dashboard profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/discover"    element={session ? <Discover  profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/groups"      element={session ? <Groups    profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/chat"        element={session ? <Chat      profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/chat/:id"    element={session ? <Chat      profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/events"      element={session ? <Events    profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/moments"     element={session ? <Moments   profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/local"      element={session ? <Local     profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/local/:id"  element={session ? <LocalDetail profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/profile/:id" element={session ? <Profile   profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/settings"    element={session ? <Settings  profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" />} />
        <Route path="/notifications" element={session ? <Notifications profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/admin" element={
          session && profile?.is_admin
            ? <Admin profile={profile} />
            : <Navigate to="/dashboard" />
        } />
      </Routes>
    </Suspense>
  )
}
