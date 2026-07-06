import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Search } from 'lucide-react'
import { getBrowseCity } from '../lib/cities'
import { interestMatchScore, commonInterests, sortByMatchScore } from '../lib/matching'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']

const ALL_INTERESTS = [
  'Tech/Coding', 'Art/Design', 'Finance/Investing', 'Movies/Cinema',
  'Travel', 'Books/Reading', 'Gaming', 'Photography',
  'Startups/Entrepreneurship', 'Indie Music', 'Fitness', 'Food',
  'Chess', 'Philosophy', 'Anime', 'Podcasts'
]

export default function Discover({ profile }) {
  const navigate = useNavigate()
  const [people,         setPeople]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [filter,         setFilter]         = useState('all')
  const [search,         setSearch]         = useState('')
  const [selectedInterest, setSelectedInterest] = useState('')
  const [showFilters,    setShowFilters]    = useState(false)
  const [browseCity,     setBrowseCityState] = useState(() => getBrowseCity(profile?.city))

  useEffect(() => {
    function onCityChange(e) {
      setBrowseCityState(e.detail || getBrowseCity(profile?.city))
    }
    window.addEventListener('browse-city-changed', onCityChange)
    return () => window.removeEventListener('browse-city-changed', onCityChange)
  }, [profile?.city])

  useEffect(() => { if (profile) fetchPeople() }, [profile, filter, browseCity])

  async function fetchPeople() {
    setLoading(true)
    let query = supabase.from('profiles')
      .select('id,full_name,username,city,interests,avatar_url,bio')
      .neq('id', profile.id)
      .eq('onboarding_complete', true)
    if (filter === 'city') query = query.eq('city', browseCity)
    const { data } = await query.limit(100)
    setPeople(sortByMatchScore(data || [], profile.interests))
    setLoading(false)
  }

  // CLIENT SIDE FILTERING
  const filtered = people
    .filter(p => {
      const matchSearch = !search ||
        p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.username?.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase()) ||
        p.bio?.toLowerCase().includes(search.toLowerCase())

      const matchInterest = !selectedInterest ||
        p.interests?.includes(selectedInterest)

      return matchSearch && matchInterest
    })
    .sort((a, b) => interestMatchScore(profile?.interests, b.interests) - interestMatchScore(profile?.interests, a.interests))

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="discover" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>Discover People 🔍</div>
          <div style={{ color: '#888', marginTop: 4, fontSize: 15 }}>Find people who get you</div>
        </div>

        {/* SEARCH BAR */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'white', border: '3px solid #1C1C3A',
          borderRadius: 50, padding: '12px 20px',
          boxShadow: '4px 4px 0 #1C1C3A', marginBottom: 14
        }}>
          <Search size={18} color="#aaa" />
          <input
            type="text"
            placeholder="Search by name, city, interest..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 15, fontWeight: 600,
              background: 'transparent', fontFamily: 'inherit',
              color: '#1C1C3A'
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              background: '#FFB3CC', border: '2px solid #1C1C3A',
              borderRadius: 50, width: 24, height: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontWeight: 900, fontSize: 14
            }}>×</button>
          )}
        </div>

        {/* FILTERS ROW */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {['all','city'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 16px', borderRadius: 50,
              border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 13,
              background: filter === f ? '#FF85B3' : 'white',
              color: filter === f ? 'white' : '#1C1C3A',
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer',
              fontFamily: 'inherit'
            }}>
              {f === 'all' ? '🌍 Everyone' : `📍 ${browseCity}`}
            </button>
          ))}

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '8px 16px', borderRadius: 50,
              border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 13,
              background: selectedInterest ? '#B3E5FC' : 'white',
              color: '#1C1C3A',
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            🎯 {selectedInterest || 'Filter by interest'}
          </button>
        </div>

        {/* INTEREST FILTER DROPDOWN */}
        {showFilters && (
          <div style={{
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 20, padding: 16,
            boxShadow: '5px 5px 0 #1C1C3A', marginBottom: 16
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#888' }}>
              FILTER BY INTEREST
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                onClick={() => { setSelectedInterest(''); setShowFilters(false) }}
                style={{
                  padding: '6px 14px', borderRadius: 50,
                  border: '2.5px solid #1C1C3A', fontWeight: 700, fontSize: 12,
                  background: !selectedInterest ? '#FF85B3' : 'white',
                  color: !selectedInterest ? 'white' : '#1C1C3A',
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >All</button>
              {ALL_INTERESTS.map(x => (
                <button key={x}
                  onClick={() => { setSelectedInterest(x); setShowFilters(false) }}
                  style={{
                    padding: '6px 14px', borderRadius: 50,
                    border: '2.5px solid #1C1C3A', fontWeight: 700, fontSize: 12,
                    background: selectedInterest === x ? '#FF85B3' : '#FFF0F5',
                    color: selectedInterest === x ? 'white' : '#1C1C3A',
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >{x}</button>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS COUNT */}
        <div style={{ fontWeight: 700, fontSize: 13, color: '#888', marginBottom: 14 }}>
          {loading ? 'Finding people...' : `${filtered.length} people found`}
          {selectedInterest && ` · filtered by ${selectedInterest}`}
          {search && ` · searching "${search}"`}
        </div>

        {/* PEOPLE GRID */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontWeight: 700, fontSize: 16 }}>
            Finding your people... ✨
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 20, padding: '40px 20px', textAlign: 'center',
            boxShadow: '5px 5px 0 #1C1C3A'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No results found</div>
            <div style={{ color: '#aaa', marginTop: 6 }}>
              {search ? `No one matching "${search}"` : 'Try a different filter'}
            </div>
            <button
              onClick={() => { setSearch(''); setSelectedInterest(''); setFilter('all') }}
              style={{
                marginTop: 16, background: '#FF85B3', color: 'white',
                border: '3px solid #1C1C3A', borderRadius: 50,
                padding: '10px 24px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '3px 3px 0 #1C1C3A', fontFamily: 'inherit'
              }}
            >Clear filters</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {filtered.map((p, i) => {
              const s = interestMatchScore(profile?.interests, p.interests)
              const c = commonInterests(profile?.interests, p.interests)
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
                  {/* AVATAR */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: BORDER[i % BORDER.length],
                    border: '3px solid #1C1C3A', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 900, fontSize: 24,
                    marginBottom: 10, boxShadow: '2px 2px 0 #1C1C3A',
                    flexShrink: 0
                  }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      p.full_name?.[0] || '?'
                    )}
                  </div>

                  <div style={{ fontWeight: 900, fontSize: 15 }}>{p.full_name}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>@{p.username}</div>
                  <div style={{ color: '#888', fontSize: 12, margin: '4px 0 8px' }}>📍 {p.city}</div>

                  {/* MATCH SCORE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{
                      flex: 1, height: 8, background: '#eee',
                      borderRadius: 50, border: '1.5px solid #1C1C3A', overflow: 'hidden'
                    }}>
                      <div style={{ width: `${s}%`, height: '100%', background: '#4CAF82' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#4CAF82' }}>{s}%</span>
                  </div>

                  {/* COMMON INTERESTS */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.slice(0,2).map(x => (
                      <span key={x} style={{
                        background: 'white', border: '2px solid #1C1C3A',
                        borderRadius: 50, padding: '2px 8px',
                        fontSize: 11, fontWeight: 700
                      }}>{x}</span>
                    ))}
                    {c.length > 2 && (
                      <span style={{
                        background: '#FFB3CC', border: '2px solid #1C1C3A',
                        borderRadius: 50, padding: '2px 8px',
                        fontSize: 11, fontWeight: 700
                      }}>+{c.length - 2}</span>
                    )}
                  </div>

                  {p.bio && (
                    <div style={{
                      color: '#666', fontSize: 12, marginTop: 8,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                    }}>{p.bio}</div>
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
