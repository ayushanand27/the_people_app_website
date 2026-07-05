import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { identifyUser } from './lib/analytics'
import { isPasswordRecoveryUrl, redirectRecoveryToAuth } from './lib/authRecovery'

import Auth from './pages/Auth'

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

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50">
      <div className="text-2xl font-bold text-pink-500 animate-pulse">Loading... ✨</div>
    </div>
  )
}

export default function App() {
  const [session,          setSession]          = useState(null)
  const [profile,          setProfile]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordRecoveryUrl)

  useLayoutEffect(() => {
    redirectRecoveryToAuth()
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      const recovering = isPasswordRecoveryUrl()
      setPasswordRecovery(recovering)
      setSession(s)
      if (recovering) {
        setLoading(false)
        return
      }
      if (s) fetchProfile(s.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isPasswordRecoveryUrl())) {
        setPasswordRecovery(true)
        setSession(s)
        setLoading(false)
        return
      }

      setSession(s)
      if (s && !passwordRecovery) fetchProfile(s.user.id)
      else { setProfile(null); setLoading(false) }
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

  function handleRecoveryComplete() {
    setPasswordRecovery(false)
    window.history.replaceState({}, '', '/auth')
  }

  const showAuth = !session || passwordRecovery

  const authElement = (
    <Auth passwordRecovery={passwordRecovery} onRecoveryComplete={handleRecoveryComplete} />
  )

  if (loading) return <PageLoader />

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={
            passwordRecovery ? authElement :
            !session ? <Auth /> :
            !profile?.onboarding_complete ? <Navigate to="/onboarding" /> :
            <Navigate to="/dashboard" />
          } />
          <Route path="/auth" element={
            showAuth ? authElement : <Navigate to="/dashboard" />
          } />
          <Route path="/onboarding"  element={session && !passwordRecovery ? <Onboarding profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" />} />
          <Route path="/dashboard"   element={session && !passwordRecovery ? <Dashboard profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/discover"    element={session && !passwordRecovery ? <Discover  profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/groups"      element={session && !passwordRecovery ? <Groups    profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/chat"        element={session && !passwordRecovery ? <Chat      profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/chat/:id"    element={session && !passwordRecovery ? <Chat      profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/events"      element={session && !passwordRecovery ? <Events    profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/moments"     element={session && !passwordRecovery ? <Moments   profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/profile/:id" element={session && !passwordRecovery ? <Profile   profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/settings"    element={session && !passwordRecovery ? <Settings  profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" />} />
          <Route path="/notifications" element={session && !passwordRecovery ? <Notifications profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={
            session && !passwordRecovery && profile?.is_admin
              ? <Admin profile={profile} />
              : <Navigate to="/dashboard" />
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
