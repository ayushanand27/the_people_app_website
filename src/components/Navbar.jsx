import { useNavigate } from 'react-router-dom'
import { Home, Compass, Users, MessageCircle, Calendar, User } from 'lucide-react'

export default function Navbar({ active, profile }) {
  const navigate = useNavigate()

  const tabs = [
    { id: 'dashboard', icon: Home,          label: 'Home',     path: '/dashboard' },
    { id: 'discover',  icon: Compass,       label: 'Discover', path: '/discover'  },
    { id: 'groups',    icon: Users,         label: 'Groups',   path: '/groups'    },
    { id: 'chat',      icon: MessageCircle, label: 'Chat',     path: '/chat'      },
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
            width: 38, height: 38,
            background: '#FF85B3',
            borderRadius: 12,
            border: '3px solid #1C1C3A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 18,
            boxShadow: '3px 3px 0 #1C1C3A'
          }}>P</div>
          <span style={{ fontWeight: 900, fontSize: 18, color: '#1C1C3A' }}>
            The People App
          </span>
        </div>
        <button
          onClick={() => navigate(`/profile/${profile?.id}`)}
          style={{
            width: 40, height: 40,
            background: '#FF85B3',
            borderRadius: 12,
            border: '3px solid #1C1C3A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 18,
            boxShadow: '3px 3px 0 #1C1C3A',
            cursor: 'pointer'
          }}
        >
          {profile?.full_name?.[0] || '?'}
        </button>
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'white',
        borderTop: '3px solid #1C1C3A',
        padding: '8px 12px 10px',
        display: 'flex', justifyContent: 'space-around'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                padding: '8px 14px',
                borderRadius: 16,
                border: isActive ? '3px solid #1C1C3A' : '3px solid transparent',
                background: isActive ? '#FF85B3' : 'transparent',
                color: isActive ? 'white' : '#9CA3AF',
                fontWeight: 700, fontSize: 11,
                boxShadow: isActive ? '3px 3px 0 #1C1C3A' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={22} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
