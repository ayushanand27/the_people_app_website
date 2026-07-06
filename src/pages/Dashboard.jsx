import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { track } from '../lib/analytics'
import { fetchVerifiedListings } from '../lib/localListings'
import { sortByMatchScore, interestMatchScore, commonInterests } from '../lib/matching'
import InlineError from '../components/InlineError'
import { reportSupabaseError } from '../lib/supabaseError'
import { useBrowseCity } from '../hooks/useBrowseCity'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']

export default function Dashboard({ profile }) {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [groups,  setGroups]  = useState([])
  const [events,  setEvents]  = useState([])
  const [localPreview, setLocalPreview] = useState([])
  const browseCity = useBrowseCity(profile?.city)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function loadDashboard(city) {
    setLoadError('')
    setLoading(true)
    const [matchesRes, groupsRes, eventsRes, localRes] = await Promise.all([
      supabase.from('profiles')
        .select('id,full_name,username,city,interests,avatar_url')
        .neq('id', profile.id)
        .eq('city', city || profile.city)
        .eq('onboarding_complete', true)
        .limit(30),
      supabase.from('groups').select('*').eq('city', city || profile.city).limit(3),
      supabase.from('events').select('*')
        .eq('city', city || profile.city)
        .gte('date', new Date().toISOString()).limit(3),
      fetchVerifiedListings({ city, category: 'all', limit: 3 }).then(
        data => ({ data, error: null }),
        err => ({ data: [], error: err }),
      ),
    ])

    const firstError = matchesRes.error || groupsRes.error || eventsRes.error || localRes.error
    if (firstError) {
      const msg = reportSupabaseError(firstError, 'Dashboard') || 'Failed to load dashboard'
      setLoadError(msg)
      setMatches([])
      setGroups([])
      setEvents([])
      setLocalPreview([])
      setLoading(false)
      return
    }

    setMatches(sortByMatchScore(matchesRes.data || [], profile.interests).slice(0, 6))
    setGroups(groupsRes.data || [])
    setEvents(eventsRes.data || [])
    setLocalPreview(localRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (profile) loadDashboard(browseCity)
  }, [profile, browseCity])

  function score(other) {
    return interestMatchScore(profile?.interests, other?.interests)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="dashboard" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        {/* GREETING BANNER */}
        <div style={{
          background: '#FF85B3', border: '3px solid #1C1C3A',
          borderRadius: 24, padding: '24px 24px',
          boxShadow: '6px 6px 0 #1C1C3A', marginBottom: 28
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>
            Hey {profile?.full_name?.split(' ')[0]} 👋
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4, fontSize: 15 }}>
            Browsing {browseCity} · {profile?.interests?.length || 0} interests
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {profile?.interests?.slice(0,3).map(i => (
              <span key={i} style={{
                background: 'white', color: '#FF6B9D',
                border: '2px solid #1C1C3A',
                borderRadius: 50, padding: '4px 12px',
                fontSize: 12, fontWeight: 700
              }}>{i}</span>
            ))}
          </div>
        </div>

        <InlineError message={loadError} onRetry={() => loadDashboard(browseCity)} />

        {/* HUB — Local + People only (Events/Moments in bottom nav) */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28,
        }}>
          {[
            { label: 'Local 🏪', sub: 'Shops & services', path: '/local', bg: '#B8F0B8' },
            { label: 'People ✨', sub: 'Discover by interests', path: '/discover', bg: '#FFB3CC' },
          ].map(hub => (
            <button
              key={hub.path}
              type="button"
              onClick={() => navigate(hub.path)}
              style={{
                background: hub.bg, border: '3px solid #1C1C3A',
                borderRadius: 20, padding: '18px 16px', textAlign: 'left',
                cursor: 'pointer', boxShadow: '5px 5px 0 #1C1C3A',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>{hub.label}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 4, fontWeight: 600 }}>{hub.sub}</div>
            </button>
          ))}
        </div>

        {/* LOCAL PREVIEW */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Local in {browseCity} 🏪</div>
            <button
              onClick={() => navigate('/local')}
              style={{ color: '#4CAF82', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              See all →
            </button>
          </div>
          {localPreview.length === 0 ? (
            <div style={{
              background: 'white', border: '3px solid #1C1C3A',
              borderRadius: 20, padding: '28px 20px', textAlign: 'center',
              boxShadow: '4px 4px 0 #1C1C3A',
            }}>
              <div style={{ fontWeight: 900 }}>No local listings yet</div>
              <div style={{ color: '#aaa', fontSize: 14, marginTop: 4 }}>Verified shops coming soon</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {localPreview.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/local/${item.id}`)}
                  style={{
                    background: BG[i % BG.length], border: '3px solid #1C1C3A',
                    borderRadius: 16, padding: '14px 16px', textAlign: 'left',
                    cursor: 'pointer', boxShadow: '4px 4px 0 #1C1C3A', fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{item.title}</div>
                  {item.price_text && (
                    <div style={{ color: '#4CAF82', fontWeight: 800, fontSize: 14, marginTop: 4 }}>{item.price_text}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DAILY MATCHES */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Your matches ✨</div>
            <button
              onClick={() => navigate('/discover')}
              style={{ color: '#FF85B3', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              See all →
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontWeight: 700 }}>
              Finding your people...
            </div>
          ) : matches.length === 0 ? (
            <div style={{
              background: 'white', border: '3px solid #1C1C3A',
              borderRadius: 20, padding: '32px 20px', textAlign: 'center',
              boxShadow: '4px 4px 0 #1C1C3A'
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🌟</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>No matches in your city yet</div>
              <div style={{ color: '#aaa', marginTop: 4, fontSize: 14 }}>Invite friends to join!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {matches.map((m, i) => {
                const s = score(m)
                const common = commonInterests(profile?.interests, m.interests)
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      track('match_view', { user_id: profile.id, target_user_id: m.id })
                      navigate(`/profile/${m.id}`)
                    }}
                    style={{
                      background: BG[i % BG.length],
                      border: `3px solid #1C1C3A`,
                      borderRadius: 20, padding: 16,
                      textAlign: 'left', cursor: 'pointer',
                      boxShadow: '5px 5px 0 #1C1C3A',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #1C1C3A' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #1C1C3A' }}
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: BORDER[i % BORDER.length],
                      border: '3px solid #1C1C3A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 900, fontSize: 22,
                      marginBottom: 10, boxShadow: '2px 2px 0 #1C1C3A'
                    }}>
                      {m.full_name?.[0] || '?'}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: '#1C1C3A' }}>{m.full_name}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>📍 {m.city}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
                      <div style={{ flex: 1, height: 8, background: '#eee', borderRadius: 50, border: '1.5px solid #1C1C3A', overflow: 'hidden' }}>
                        <div style={{ width: `${s}%`, height: '100%', background: '#4CAF82', borderRadius: 50 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#4CAF82' }}>{s}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {common.slice(0,2).map(i => (
                        <span key={i} style={{
                          background: 'white', border: '2px solid #1C1C3A',
                          borderRadius: 50, padding: '2px 8px',
                          fontSize: 11, fontWeight: 700
                        }}>
                          {i}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* GROUPS */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Communities 🏘️</div>
            <button onClick={() => navigate('/groups')}
              style={{ color: '#FF85B3', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
              See all →
            </button>
          </div>
          {groups.length === 0 ? (
            <div style={{
              background: 'white', border: '3px solid #1C1C3A',
              borderRadius: 20, padding: '32px 20px', textAlign: 'center',
              boxShadow: '4px 4px 0 #1C1C3A'
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🏘️</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>No communities yet</div>
              <div style={{ color: '#aaa', marginTop: 4, fontSize: 14 }}>Check back soon!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groups.map((g, i) => (
                <button key={g.id}
                  onClick={() => navigate('/groups')}
                  style={{
                    background: BG[i % BG.length],
                    border: '3px solid #1C1C3A', borderRadius: 20,
                    padding: '18px 20px', textAlign: 'left',
                    boxShadow: '5px 5px 0 #1C1C3A', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #1C1C3A' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #1C1C3A' }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{g.name}</div>
                  <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>{g.description}</div>
                  <div style={{ color: '#888', fontSize: 12, marginTop: 6 }}>📍 {g.city}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* EVENTS */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Upcoming events 🎉</div>
            <button onClick={() => navigate('/events')}
              style={{ color: '#FF85B3', fontWeight: 700, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
              See all →
            </button>
          </div>
          {events.length === 0 ? (
            <div style={{
              background: 'white', border: '3px solid #1C1C3A',
              borderRadius: 20, padding: '32px 20px', textAlign: 'center',
              boxShadow: '4px 4px 0 #1C1C3A'
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>No events yet</div>
              <div style={{ color: '#aaa', marginTop: 4, fontSize: 14 }}>Events coming soon!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map((ev, i) => (
                <button key={ev.id}
                  onClick={() => navigate('/events')}
                  style={{
                    background: BG[(i+2) % BG.length],
                    border: '3px solid #1C1C3A', borderRadius: 20,
                    padding: '18px 20px', textAlign: 'left',
                    boxShadow: '5px 5px 0 #1C1C3A', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #1C1C3A' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #1C1C3A' }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{ev.title}</div>
                  <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>{ev.description}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <span style={{ color: '#888', fontSize: 12 }}>📍 {ev.city}</span>
                    <span style={{ color: '#888', fontSize: 12 }}>📅 {new Date(ev.date).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
