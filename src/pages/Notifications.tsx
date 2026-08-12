import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react'
import { getNotifications, markNotificationsRead } from '../lib/social'
import type { Profile, NotificationItem } from '../types'

const ICONS: Record<string, typeof Heart> = { like: Heart, comment: MessageCircle, follow: UserPlus, message: MessageCircle }
const COLORS: Record<string, string> = { like: '#FF6B6B', comment: '#29ABE2', follow: '#4CAF82', message: '#FF85B3' }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function notifText(n: NotificationItem): string {
  const name = n.actor?.full_name || 'Someone'
  switch (n.type) {
    case 'like':    return `${name} liked your moment`
    case 'comment': return `${name} commented on your moment`
    case 'follow':  return `${name} started following you`
    case 'message': return `${name} sent you a message`
    default:        return `${name} interacted with you`
  }
}

interface NotificationsProps {
  profile?: Profile | null
}

export default function Notifications({ profile }: NotificationsProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    const data = await getNotifications(profile.id)
    setItems(data)
    setLoading(false)
    await markNotificationsRead(profile.id)
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  function handleClick(n: NotificationItem) {
    if (n.type === 'follow' && n.actor_id) navigate(`/profile/${n.actor_id}`)
    else if ((n.type === 'like' || n.type === 'comment') && n.entity_id) navigate(`/moments?v=${n.entity_id}`)
    else if (n.type === 'message' && n.actor_id) navigate(`/chat/${n.actor_id}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="notifications" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 20 }}>Notifications 🔔</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontWeight: 700 }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{
            background: 'white', border: '3px solid #1C1C3A', borderRadius: 20,
            padding: '48px 20px', textAlign: 'center', boxShadow: '5px 5px 0 #1C1C3A'
          }}>
            <Bell size={48} color="#ddd" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontWeight: 900, fontSize: 18 }}>No notifications yet</div>
            <div style={{ color: '#aaa', marginTop: 6 }}>Likes, comments, follows, and messages show up here</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(n => {
              const Icon = ICONS[n.type] || Bell
              const color = COLORS[n.type] || '#FF85B3'
              return (
                <button key={n.id} onClick={() => handleClick(n)} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: n.read ? 'white' : '#FFF0F5',
                  border: '3px solid #1C1C3A', borderRadius: 16,
                  padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  boxShadow: '3px 3px 0 #1C1C3A', fontFamily: 'inherit', width: '100%'
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: color,
                    border: '2.5px solid #1C1C3A', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={20} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{notifText(n)}</div>
                    <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 10, height: 10, borderRadius: 50, background: '#FF85B3', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
