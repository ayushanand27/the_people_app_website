import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']

export default function Discover({ profile }) {
  const navigate = useNavigate()
  const [people,  setPeople]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => { if (profile) fetchPeople() }, [profile, filter])

  async function fetchPeople() {
    setLoading(true)
    let query = supabase.from('profiles')
      .select('id,full_name,username,city,interests,avatar_url,bio')
      .neq('id', profile.id).eq('onboarding_complete', true)
    if (filter === 'city') query = query.eq('city', profile.city)
    const { data } = await query.limit(20)
    setPeople(data || [])
    setLoading(false)
  }

  function score(other) {
    if (!profile?.interests || !other?.interests) return 0
    const c = profile.interests.filter(i => other.interests?.includes(i))
    return Math.round((c.length / Math.max(profile.interests.length, 1)) * 100)
  }

  function common(other) {
    if (!profile?.interests || !other?.interests) return []
    return profile.interests.filter(i => other.interests?.includes(i))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="discover" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>Discover People 🔍</div>
          <div style={{ color: '#888', marginTop: 4, fontSize: 15 }}>Find people who get you</div>
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['all','city'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '10px 20px', borderRadius: 50,
              border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
              background: filter === f ? '#FF85B3' : 'white',
              color: filter === f ? 'white' : '#1C1C3A',
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              {f === 'all' ? '🌍 Everyone' : `📍 ${profile?.city}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontWeight: 700, fontSize: 16 }}>
            Finding your people... ✨
          </div>
        ) : people.length === 0 ? (
          <div style={{
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 20, padding: '40px 20px', textAlign: 'center',
            boxShadow: '5px 5px 0 #1C1C3A'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌟</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No people found yet</div>
            <div style={{ color: '#aaa', marginTop: 6 }}>Invite friends to join!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {people.sort((a,b) => score(b) - score(a)).map((p, i) => {
              const s = score(p)
              const c = common(p)
              return (
                <button key={p.id} onClick={() => navigate(`/profile/${p.id}`)}
                  style={{
                    background: BG[i % BG.length],
                    border: '3px solid #1C1C3A', borderRadius: 20,
                    padding: 16, textAlign: 'left', cursor: 'pointer',
                    boxShadow: '5px 5px 0 #1C1C3A', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #1C1C3A' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #1C1C3A' }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: BORDER[i % BORDER.length],
                    border: '3px solid #1C1C3A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 900, fontSize: 24,
                    marginBottom: 10, boxShadow: '2px 2px 0 #1C1C3A'
                  }}>{p.full_name?.[0] || '?'}</div>

                  <div style={{ fontWeight: 900, fontSize: 15 }}>{p.full_name}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>@{p.username}</div>
                  <div style={{ color: '#888', fontSize: 12, margin: '4px 0 8px' }}>📍 {p.city}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 8, background: '#eee', borderRadius: 50, border: '1.5px solid #1C1C3A', overflow: 'hidden' }}>
                      <div style={{ width: `${s}%`, height: '100%', background: '#4CAF82' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#4CAF82' }}>{s}%</span>
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.slice(0,2).map(x => (
                      <span key={x} style={{
                        background: 'white', border: '2px solid #1C1C3A',
                        borderRadius: 50, padding: '2px 8px', fontSize: 11, fontWeight: 700
                      }}>{x}</span>
                    ))}
                    {c.length > 2 && (
                      <span style={{
                        background: '#FFB3CC', border: '2px solid #1C1C3A',
                        borderRadius: 50, padding: '2px 8px', fontSize: 11, fontWeight: 700
                      }}>+{c.length - 2}</span>
                    )}
                  </div>

                  {p.bio && <div style={{ color: '#666', fontSize: 12, marginTop: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.bio}</div>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
