import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { MessageCircle, Settings } from 'lucide-react'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']

export default function Profile({ profile }) {
  const navigate     = useNavigate()
  const { id }       = useParams()
  const isOwn        = id === profile?.id
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchUser() }, [id])

  async function fetchUser() {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    setUser(data)
    setLoading(false)
  }

  function common() {
    if (!profile?.interests || !user?.interests) return []
    return profile.interests.filter(i => user.interests?.includes(i))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontWeight: 700, color: '#aaa', fontSize: 18 }}>Loading profile...</div>
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontWeight: 700, color: '#aaa' }}>User not found</div>
    </div>
  )

  const c     = common()
  const score = Math.round((c.length / Math.max(profile?.interests?.length || 1, 1)) * 100)

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="profile" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        {/* PROFILE HERO */}
        <div style={{
          background: '#FFB3CC', border: '3px solid #1C1C3A',
          borderRadius: 24, padding: 24,
          boxShadow: '6px 6px 0 #1C1C3A', marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: '#FF6B9D', border: '3px solid #1C1C3A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 36,
              boxShadow: '4px 4px 0 #1C1C3A'
            }}>
              {user.full_name?.[0] || '?'}
            </div>

            {isOwn ? (
              <button onClick={() => navigate('/settings')} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 14,
                border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
                background: 'white', cursor: 'pointer',
                boxShadow: '3px 3px 0 #1C1C3A'
              }}>
                <Settings size={16} /> Edit
              </button>
            ) : (
              <button onClick={() => navigate(`/chat/${user.id}`)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 14,
                border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
                background: '#FF85B3', color: 'white', cursor: 'pointer',
                boxShadow: '3px 3px 0 #1C1C3A'
              }}>
                <MessageCircle size={16} /> Message
              </button>
            )}
          </div>

          <div style={{ fontWeight: 900, fontSize: 24, color: '#1C1C3A' }}>{user.full_name}</div>
          <div style={{ color: '#555', fontWeight: 600, marginTop: 2 }}>@{user.username}</div>
          <div style={{ color: '#555', fontSize: 14, marginTop: 4 }}>📍 {user.city}</div>
          {user.bio && <div style={{ color: '#333', marginTop: 10, lineHeight: 1.6, fontSize: 15 }}>{user.bio}</div>}
          {user.is_premium && (
            <div style={{
              marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#FFD699', border: '2px solid #FF9F1C',
              borderRadius: 50, padding: '4px 14px',
              fontSize: 13, fontWeight: 700, color: '#7A4400'
            }}>⭐ Premium Member</div>
          )}
        </div>

        {/* INTERESTS */}
        <div style={{
          background: 'white', border: '3px solid #1C1C3A',
          borderRadius: 20, padding: 20,
          boxShadow: '5px 5px 0 #1C1C3A', marginBottom: 16
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 14 }}>Interests 🎯</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {user.interests?.map((x, i) => (
              <span key={x} style={{
                background: BG[i % BG.length],
                border: '3px solid #1C1C3A',
                borderRadius: 50, padding: '8px 16px',
                fontSize: 13, fontWeight: 700,
                boxShadow: '2px 2px 0 #1C1C3A'
              }}>{x}</span>
            ))}
          </div>
        </div>

        {/* COMMON INTERESTS */}
        {!isOwn && c.length > 0 && (
          <div style={{
            background: '#B8F0B8', border: '3px solid #4CAF82',
            borderRadius: 20, padding: 20,
            boxShadow: '5px 5px 0 #1C1C3A', marginBottom: 16
          }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 14, color: '#1C6B3A' }}>
              You both love 💚 ({c.length} in common)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {c.map(x => (
                <span key={x} style={{
                  background: 'white', border: '2.5px solid #4CAF82',
                  borderRadius: 50, padding: '8px 16px',
                  fontSize: 13, fontWeight: 700, color: '#1C6B3A'
                }}>{x}</span>
              ))}
            </div>
          </div>
        )}

        {/* MATCH SCORE */}
        {!isOwn && (
          <div style={{
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 20, padding: 20,
            boxShadow: '5px 5px 0 #1C1C3A', marginBottom: 16
          }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Match Score 🎯</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, height: 16, background: '#eee', borderRadius: 50, border: '2px solid #1C1C3A', overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', background: '#FF85B3', borderRadius: 50 }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: 24, color: '#FF85B3' }}>{score}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
