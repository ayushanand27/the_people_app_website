import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { MessageCircle, Settings, UserPlus, UserCheck } from 'lucide-react'
import { isFollowing, followUser, unfollowUser, getBlockedIds } from '../lib/social'
import { track } from '../lib/analytics'
import InlineError from '../components/InlineError'
import { reportSupabaseError } from '../lib/supabaseError'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']

export default function Profile({ profile }) {
  const navigate     = useNavigate()
  const { id }       = useParams()
  const isOwn        = id === profile?.id
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    if (profile?.id && id && id !== profile.id) {
      const blockedIds = await getBlockedIds(profile.id)
      if (blockedIds.includes(id)) {
        setUser(null)
        setLoadError('This profile isn’t available.')
        setLoading(false)
        return
      }
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (error) {
      setLoadError(reportSupabaseError(error, 'Profile') || 'This profile isn’t available.')
      setUser(null)
      setLoading(false)
      return
    }
    setUser(data)
    setLoading(false)
    if (profile?.id && id && id !== profile.id) {
      setFollowing(await isFollowing(profile.id, id))
    }
  }, [id, profile?.id])

  useEffect(() => { if (id) fetchUser() }, [id, fetchUser])

  async function toggleFollow() {
    if (followBusy || !user) return
    setFollowBusy(true)
    const next = !following
    setFollowing(next)
    setUser(u => ({ ...u, follower_count: Math.max((u.follower_count || 0) + (next ? 1 : -1), 0) }))
    const ok = next
      ? await followUser(profile.id, user.id)
      : await unfollowUser(profile.id, user.id)
    if (ok && next) track('follow', { user_id: profile.id, target_user_id: user.id })
    if (!ok) {
      setFollowing(!next)
      setUser(u => ({ ...u, follower_count: Math.max((u.follower_count || 0) + (next ? -1 : 1), 0) }))
    }
    setFollowBusy(false)
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
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="profile" profile={profile} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <InlineError message={loadError || 'User not found'} onRetry={fetchUser} />
      </div>
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

            {/* AVATAR — shows photo if available */}
            <div style={{
              width: 88, height: 88, borderRadius: 22,
              border: '3px solid #1C1C3A',
              background: '#FF6B9D', overflow: 'hidden',
              boxShadow: '4px 4px 0 #1C1C3A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'white', fontWeight: 900, fontSize: 36 }}>
                  {user.full_name?.[0] || '?'}
                </span>
              )}
            </div>

            {/* ACTION BUTTON */}
            {isOwn ? (
              <button onClick={() => navigate('/settings')} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 14,
                border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
                background: 'white', cursor: 'pointer',
                boxShadow: '3px 3px 0 #1C1C3A', fontFamily: 'inherit'
              }}>
                <Settings size={16} /> Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={toggleFollow} disabled={followBusy} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 14,
                  border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
                  background: following ? 'white' : '#4CAF82', color: following ? '#1C1C3A' : 'white',
                  cursor: 'pointer', boxShadow: '3px 3px 0 #1C1C3A', fontFamily: 'inherit'
                }}>
                  {following ? <><UserCheck size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
                </button>
                <button onClick={() => navigate(`/chat/${user.id}`)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 14,
                  border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
                  background: '#FF85B3', color: 'white', cursor: 'pointer',
                  boxShadow: '3px 3px 0 #1C1C3A', fontFamily: 'inherit'
                }}>
                  <MessageCircle size={16} /> Message
                </button>
              </div>
            )}
          </div>

          <div style={{ fontWeight: 900, fontSize: 24 }}>{user.full_name}</div>
          <div style={{ color: '#555', fontWeight: 600, marginTop: 2 }}>@{user.username}</div>
          <div style={{ color: '#555', fontSize: 14, marginTop: 4 }}>📍 {user.city}</div>

          {/* FOLLOWER / FOLLOWING COUNTS */}
          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            <div><span style={{ fontWeight: 900, fontSize: 18 }}>{user.follower_count || 0}</span>
              <span style={{ color: '#555', fontSize: 13, marginLeft: 5 }}>Followers</span></div>
            <div><span style={{ fontWeight: 900, fontSize: 18 }}>{user.following_count || 0}</span>
              <span style={{ color: '#555', fontSize: 13, marginLeft: 5 }}>Following</span></div>
          </div>
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
              <div style={{
                flex: 1, height: 16, background: '#eee',
                borderRadius: 50, border: '2px solid #1C1C3A', overflow: 'hidden'
              }}>
                <div style={{
                  width: `${score}%`, height: '100%',
                  background: '#FF85B3', borderRadius: 50
                }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: 24, color: '#FF85B3' }}>{score}%</span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
