import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Home, Compass, Users, MessageCircle, Calendar, User, Play, Bell } from 'lucide-react'
import { getUnreadNotificationCount } from '../lib/social'
import { getBrowseCity, setBrowseCity } from '../lib/cities'
import CitySelect from './CitySelect'

export default function Navbar({ active, profile }) {
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [notifCount, setNotifCount] = useState(0)
  const [browseCity, setBrowseCityState] = useState(() => getBrowseCity(profile?.city))

  useEffect(() => {
    if (!profile) return
    fetchUnread()
    fetchNotifCount()
    const cleanup = subscribeUnread()
    const ch = supabase.channel('notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => { if (payload.new.user_id === profile.id) setNotifCount(c => c + 1) })
      .subscribe()
    return () => { cleanup?.(); supabase.removeChannel(ch) }
  }, [profile])

  useEffect(() => {
    setBrowseCityState(getBrowseCity(profile?.city))
    function onCityChange(e) {
      setBrowseCityState(e.detail || getBrowseCity(profile?.city))
    }
    window.addEventListener('browse-city-changed', onCityChange)
    return () => window.removeEventListener('browse-city-changed', onCityChange)
  }, [profile?.city])

  function switchCity(city) {
    setBrowseCity(city)
    setBrowseCityState(city)
  }

  async function fetchNotifCount() {
    setNotifCount(await getUnreadNotificationCount(profile.id))
  }

  async function fetchUnread() {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', profile.id)
      .eq('read', false)
    setUnread(count || 0)
  }

  function subscribeUnread() {
    const ch = supabase.channel('unread')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages'
      }, payload => {
        if (payload.new.receiver_id === profile.id) {
          setUnread(prev => prev + 1)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }

  const tabs = [
    { id: 'dashboard', icon: Home,          label: 'Home',     path: '/dashboard' },
    { id: 'discover',  icon: Compass,       label: 'Discover', path: '/discover'  },
    { id: 'moments',   icon: Play,          label: 'Moments',  path: '/moments'   },
    { id: 'groups',    icon: Users,         label: 'Groups',   path: '/groups'    },
    { id: 'chat',      icon: MessageCircle, label: 'Chat',     path: '/chat',  badge: unread },
    { id: 'events',    icon: Calendar,      label: 'Events',   path: '/events'    },
    { id: 'profile',   icon: User,          label: 'Me',       path: `/profile/${profile?.id}` },
  ]

  return (
    <>
      {/* TOP NAV */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,240,245,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '3px solid #1C1C3A',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, background: '#FF85B3',
            borderRadius: 12, border: '3px solid #1C1C3A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 18,
            boxShadow: '3px 3px 0 #1C1C3A'
          }}>P</div>
          <span style={{ fontWeight: 900, fontSize: 18, color: '#1C1C3A' }}>
            The People App
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CitySelect
            compact
            label="City"
            value={browseCity}
            onChange={switchCity}
          />
          <button
            onClick={() => navigate('/notifications')}
            style={{
              width: 40, height: 40, background: notifCount > 0 ? '#FF85B3' : 'white',
              borderRadius: 12, border: '3px solid #1C1C3A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: notifCount > 0 ? 'white' : '#1C1C3A',
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer', position: 'relative'
            }}
          >
            <Bell size={20} />
            {notifCount > 0 && (
              <div style={{
                position: 'absolute', top: -6, right: -6,
                background: '#FF6B6B', color: 'white', border: '2px solid white',
                borderRadius: 50, minWidth: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 900, padding: '0 4px'
              }}>{notifCount > 99 ? '99+' : notifCount}</div>
            )}
          </button>
          <button
            onClick={() => navigate(`/profile/${profile?.id}`)}
            style={{
              width: 40, height: 40, background: '#FF85B3',
              borderRadius: 12, border: '3px solid #1C1C3A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 18,
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer'
            }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 9 }} />
            ) : (
              profile?.full_name?.[0] || '?'
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'white', borderTop: '3px solid #1C1C3A',
        padding: '8px 12px 10px',
        display: 'flex', justifyContent: 'space-around'
      }}>
        {tabs.map(tab => {
          const Icon     = tab.icon
          const isActive = active === tab.id
          const badge    = tab.badge || 0
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'chat') setUnread(0)
                navigate(tab.path)
              }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                padding: '8px 14px', borderRadius: 16,
                border: isActive ? '3px solid #1C1C3A' : '3px solid transparent',
                background: isActive ? '#FF85B3' : 'transparent',
                color: isActive ? 'white' : '#9CA3AF',
                fontWeight: 700, fontSize: 11,
                boxShadow: isActive ? '3px 3px 0 #1C1C3A' : 'none',
                cursor: 'pointer', transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={22} />
                {badge > 0 && (
                  <div style={{
                    position: 'absolute', top: -6, right: -8,
                    background: '#FF6B6B', color: 'white',
                    border: '2px solid white',
                    borderRadius: 50, minWidth: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 900,
                    padding: '0 4px'
                  }}>
                    {badge > 99 ? '99+' : badge}
                  </div>
                )}
              </div>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
