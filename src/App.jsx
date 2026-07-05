import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { identifyUser } from './lib/analytics'

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
  const [session,  setSession]  = useState(null)
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
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

  if (loading) return <PageLoader />

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={
            !session ? <Auth /> :
            !profile?.onboarding_complete ? <Navigate to="/onboarding" /> :
            <Navigate to="/dashboard" />
          } />
          <Route path="/auth"        element={!session ? <Auth /> : <Navigate to="/dashboard" />} />
          <Route path="/onboarding"  element={session ? <Onboarding profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" />} />
          <Route path="/dashboard"   element={session ? <Dashboard profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/discover"    element={session ? <Discover  profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/groups"      element={session ? <Groups    profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/chat"        element={session ? <Chat      profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/chat/:id"    element={session ? <Chat      profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/events"      element={session ? <Events    profile={profile} /> : <Navigate to="/auth" />} />
          <Route path="/moments"     element={session ? <Moments   profile={profile} /> : <Navigate to="/auth" />} />
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
    </BrowserRouter>
  )
}
