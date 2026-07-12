import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Search } from 'lucide-react'
import { useBrowseCity } from '../hooks/useBrowseCity'
import { interestMatchScore, commonInterests, sortByMatchScore } from '../lib/matching'
import InlineError from '../components/InlineError'
import { reportSupabaseError } from '../lib/supabaseError'

const ALL_INTERESTS = [
  'Tech/Coding', 'Art/Design', 'Finance/Investing', 'Movies/Cinema',
  'Travel', 'Books/Reading', 'Gaming', 'Photography',
  'Startups/Entrepreneurship', 'Indie Music', 'Fitness', 'Food',
  'Chess', 'Philosophy', 'Anime', 'Podcasts'
]

const PAGE_SIZE = 30

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']

export default function Discover({ profile }) {
  const navigate = useNavigate()
  const [people,         setPeople]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [selectedInterest, setSelectedInterest] = useState('')
  const [showFilters,    setShowFilters]    = useState(false)
  const browseCity = useBrowseCity(profile?.city)
  const [loadError,      setLoadError]       = useState('')
  const [hasMore,        setHasMore]         = useState(true)
  const [loadingMore,    setLoadingMore]     = useState(false)
  const [page,           setPage]            = useState(0)

  useEffect(() => { if (profile) fetchPeople(false) }, [profile, browseCity])

  async function fetchPeople(append = false) {
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setLoadError('')
      setPage(0)
    }

    const nextPage = append ? page + 1 : 0
    const from = nextPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase.from('profiles')
      .select('id,full_name,username,city,interests,avatar_url,bio')
      .neq('id', profile.id)
      .eq('onboarding_complete', true)
      .eq('city', browseCity)
    const { data, error } = await query.range(from, to)
    if (error) {
      setLoadError(reportSupabaseError(error, 'Discover') || 'Failed to load people')
      if (!append) setPeople([])
      setLoading(false)
      setLoadingMore(false)
      return
    }

    const batch = data || []
    setHasMore(batch.length === PAGE_SIZE)
    setPage(nextPage)
    setPeople(prev => {
      const merged = append ? [...prev, ...batch] : batch
      const deduped = [...new Map(merged.map(p => [p.id, p])).values()]
      return sortByMatchScore(deduped, profile.interests)
    })
    setLoading(false)
    setLoadingMore(false)
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
    <div style={{ minHeight: '100vh', background: '#FFFCFD', paddingBottom: 100 }}>
      <Navbar active="discover" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>People in {browseCity} 🔍</div>
          <div style={{ color: '#888', marginTop: 4, fontSize: 15 }}>Discover by interests · {browseCity}</div>
        </div>

        <InlineError message={loadError} onRetry={() => fetchPeople(false)} />

        {/* SEARCH BAR */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'white', border: '3px solid #8A8AA8',
          borderRadius: 50, padding: '12px 20px',
          boxShadow: '4px 4px 0 #8A8AA8', marginBottom: 14
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
              color: '#5A5A78'
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              background: '#FFB3CC', border: '2px solid #8A8AA8',
              borderRadius: 50, width: 24, height: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontWeight: 900, fontSize: 14
            }}>×</button>
          )}
        </div>

        {/* INTEREST FILTER */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '8px 16px', borderRadius: 50,
              border: '3px solid #8A8AA8', fontWeight: 700, fontSize: 13,
              background: selectedInterest ? '#B3E5FC' : 'white',
              color: '#5A5A78',
              boxShadow: '3px 3px 0 #8A8AA8', cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            🎯 {selectedInterest || 'Filter by interest'}
          </button>
        </div>

        {/* INTEREST FILTER DROPDOWN */}
        {showFilters && (
          <div style={{
            background: 'white', border: '3px solid #8A8AA8',
            borderRadius: 20, padding: 16,
            boxShadow: '5px 5px 0 #8A8AA8', marginBottom: 16
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#888' }}>
              FILTER BY INTEREST
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                onClick={() => { setSelectedInterest(''); setShowFilters(false) }}
                style={{
                  padding: '6px 14px', borderRadius: 50,
                  border: '2.5px solid #8A8AA8', fontWeight: 700, fontSize: 12,
                  background: !selectedInterest ? '#FFB0D0' : 'white',
                  color: !selectedInterest ? 'white' : '#8A8AA8',
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >All</button>
              {ALL_INTERESTS.map(x => (
                <button key={x}
                  onClick={() => { setSelectedInterest(x); setShowFilters(false) }}
                  style={{
                    padding: '6px 14px', borderRadius: 50,
                    border: '2.5px solid #8A8AA8', fontWeight: 700, fontSize: 12,
                    background: selectedInterest === x ? '#FFB0D0' : '#FFFCFD',
                    color: selectedInterest === x ? 'white' : '#8A8AA8',
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
            background: 'white', border: '3px solid #8A8AA8',
            borderRadius: 20, padding: '40px 20px', textAlign: 'center',
            boxShadow: '5px 5px 0 #8A8AA8'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No people in {browseCity} yet</div>
            <div style={{ color: '#aaa', marginTop: 6, lineHeight: 1.5 }}>
              {search
                ? `No one matching "${search}"`
                : 'Switch city in the top bar, or invite a friend to join this city.'}
            </div>
            <button
              onClick={() => { setSearch(''); setSelectedInterest('') }}
              style={{
                marginTop: 16, background: '#FFB0D0', color: 'white',
                border: '3px solid #8A8AA8', borderRadius: 50,
                padding: '10px 24px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '3px 3px 0 #8A8AA8', fontFamily: 'inherit'
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
                    border: '3px solid #8A8AA8', borderRadius: 20,
                    padding: 16, textAlign: 'left', cursor: 'pointer',
                    boxShadow: '5px 5px 0 #8A8AA8', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #8A8AA8' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #8A8AA8' }}
                >
                  {/* AVATAR */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: BORDER[i % BORDER.length],
                    border: '3px solid #8A8AA8', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 900, fontSize: 24,
                    marginBottom: 10, boxShadow: '2px 2px 0 #8A8AA8',
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
                      borderRadius: 50, border: '1.5px solid #8A8AA8', overflow: 'hidden'
                    }}>
                      <div style={{ width: `${s}%`, height: '100%', background: '#4CAF82' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#4CAF82' }}>{s}%</span>
                  </div>

                  {/* COMMON INTERESTS */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.slice(0,2).map(x => (
                      <span key={x} style={{
                        background: 'white', border: '2px solid #8A8AA8',
                        borderRadius: 50, padding: '2px 8px',
                        fontSize: 11, fontWeight: 700
                      }}>{x}</span>
                    ))}
                    {c.length > 2 && (
                      <span style={{
                        background: '#FFB3CC', border: '2px solid #8A8AA8',
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

        {!loading && filtered.length > 0 && hasMore && !search && !selectedInterest && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              type="button"
              onClick={() => fetchPeople(true)}
              disabled={loadingMore}
              style={{
                background: loadingMore ? '#eee' : 'white',
                border: '3px solid #8A8AA8', borderRadius: 50,
                padding: '12px 28px', fontWeight: 800, fontSize: 14,
                cursor: loadingMore ? 'wait' : 'pointer',
                boxShadow: '4px 4px 0 #8A8AA8', fontFamily: 'inherit',
              }}
            >
              {loadingMore ? 'Loading...' : 'Load more people'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
