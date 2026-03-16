import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

import Auth        from './pages/Auth'
import Onboarding  from './pages/Onboarding'
import Dashboard   from './pages/Dashboard'
import Discover    from './pages/Discover'
import Groups      from './pages/Groups'
import Chat        from './pages/Chat'
import Events      from './pages/Events'
import Profile     from './pages/Profile'
import Settings    from './pages/Settings'
import Admin       from './pages/Admin'

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
    setProfile(data)
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50">
      <div className="text-2xl font-bold text-pink-500 animate-pulse">
        Loading... ✨
      </div>
    </div>
  )

  return (
    <BrowserRouter>
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
        <Route path="/profile/:id" element={session ? <Profile   profile={profile} /> : <Navigate to="/auth" />} />
        <Route path="/settings"    element={session ? <Settings  profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" />} />
        <Route path="/admin"        element={session ? <Admin profile={profile} /> : <Navigate to="/auth" />} />
      </Routes>
    </BrowserRouter>
  )
}
