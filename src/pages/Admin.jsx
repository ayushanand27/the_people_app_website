import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import AdminReportsTab from './admin/AdminReportsTab'
import AdminListingsTab from './admin/AdminListingsTab'
import CityPicker from '../components/CityPicker'
import { resolveCity, isCityValid } from '../lib/cities'

const INTERESTS = [
  'Tech/Coding', 'Art/Design', 'Finance/Investing', 'Movies/Cinema',
  'Travel', 'Books/Reading', 'Gaming', 'Photography',
  'Startups/Entrepreneurship', 'Indie Music', 'Fitness', 'Food',
  'Chess', 'Philosophy', 'Anime', 'Podcasts'
]

const USER_PAGE_SIZE = 20

export default function Admin({ profile }) {
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('groups')
  const [groups,   setGroups]   = useState([])
  const [events,   setEvents]   = useState([])
  const [users,    setUsers]    = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [usersHasMore, setUsersHasMore] = useState(true)
  const [usersLoadingMore, setUsersLoadingMore] = useState(false)
  const usersCursorRef = useRef(null)
  const [pendingReports, setPendingReports] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [success,  setSuccess]  = useState('')
  const [error,    setError]    = useState('')

  // GROUP FORM
  const [gName,     setGName]     = useState('')
  const [gDesc,     setGDesc]     = useState('')
  const [gCity,     setGCity]     = useState('Jaipur')
  const [gCustomCity, setGCustomCity] = useState('')
  const [gMax,      setGMax]      = useState(12)
  const [gInterests,setGInterests]= useState([])

  // EVENT FORM
  const [eName,     setEName]     = useState('')
  const [eDesc,     setEDesc]     = useState('')
  const [eCity,     setECity]     = useState('Jaipur')
  const [eCustomCity, setECustomCity] = useState('')
  const [eDate,     setEDate]     = useState('')
  const [eLocation, setELocation] = useState('')
  const [eMax,      setEMax]      = useState(30)
  const [eventSaving, setEventSaving] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (tab === 'users' && users.length === 0 && !usersLoadingMore) {
      usersCursorRef.current = null
      fetchUsers(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load first page when opening Users tab
  }, [tab])

  async function fetchUsers(append = false) {
    if (append) setUsersLoadingMore(true)

    let query = supabase
      .from('profiles')
      .select('id, full_name, username, city, created_at')
      .order('created_at', { ascending: false })
      .limit(USER_PAGE_SIZE)

    if (append && usersCursorRef.current) {
      query = query.lt('created_at', usersCursorRef.current)
    }

    const { data, error } = await query
    if (error) {
      setError(error.message)
      setUsersLoadingMore(false)
      return
    }

    const batch = data || []
    if (batch.length > 0) {
      usersCursorRef.current = batch[batch.length - 1].created_at
    }
    setUsersHasMore(batch.length === USER_PAGE_SIZE)
    setUsers(prev => (append ? [...prev, ...batch] : batch))
    setUsersLoadingMore(false)
  }

  async function fetchAll() {
    const [g, e, r, userCount] = await Promise.all([
      supabase.from('groups').select('*, group_members(count)').order('created_at', { ascending: false }),
      supabase.from('events').select('*, event_attendees(count)').order('date', { ascending: false }),
      supabase.from('reports').select('id, status'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])
    setGroups(g.data || [])
    setEvents(e.data || [])
    const reps = r.data || []
    setPendingReports(reps.filter(x => x.status === 'pending').length)
    setTotalUsers(userCount.count || 0)
    setLoading(false)
  }

  function toggleGInterest(x) {
    setGInterests(prev => prev.includes(x) ? prev.filter(i => i !== x) : [...prev, x])
  }

  function showSuccess(msg) {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function createGroup() {
    const finalGCity = resolveCity(gCity, gCustomCity)
    if (!gName || !isCityValid(gCity, gCustomCity) || gInterests.length === 0) {
      setError('Fill all group fields')
      return
    }
    setError('')
    const { error: err } = await supabase.from('groups').insert({
      name: gName, description: gDesc,
      city: finalGCity, max_members: gMax,
      interests: gInterests,
      created_by: profile.id
    })
    if (err) { setError(err.message); return }
    setGName(''); setGDesc(''); setGInterests([])
    showSuccess('Group created!')
    fetchAll()
  }

  async function deleteGroup(id) {
    if (!confirm('Delete this group?')) return
    await supabase.from('groups').delete().eq('id', id)
    fetchAll()
  }

  async function createEvent() {
    if (eventSaving) return
    const finalECity = resolveCity(eCity, eCustomCity)
    if (!eName || !isCityValid(eCity, eCustomCity) || !eDate || !eLocation) {
      setError('Fill all event fields')
      return
    }
    setError('')
    setEventSaving(true)
    try {
      const { error: err } = await supabase.from('events').insert({
        title: eName, description: eDesc,
        city: finalECity, date: new Date(eDate).toISOString(),
        location: eLocation, max_attendees: eMax,
        created_by: profile.id
      })
      if (err) { setError(err.message); return }
      setEName(''); setEDesc(''); setEDate(''); setELocation('')
      showSuccess('Event created!')
      fetchAll()
    } finally {
      setEventSaving(false)
    }
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return
    setError('')

    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (eventError) {
      setError(eventError.message)
      return
    }

    fetchAll()
  }

  const inputStyle = {
    width: '100%', border: '3px solid #8A8AA8', borderRadius: 16,
    padding: '12px 16px', fontSize: 14, fontWeight: 600,
    background: '#FFFCFD', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  }

  const labelStyle = { fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFCFD' }}>
        <div style={{ fontWeight: 900, color: '#FFB0D0' }}>Loading admin panel...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFCFD', paddingBottom: 40 }}>

      {/* TOP BAR */}
      <div style={{
        background: '#8A8AA8', borderBottom: '3px solid #8A8AA8',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: '#FFB0D0',
            border: '2.5px solid white', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 16
          }}>P</div>
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>Admin Panel</div>
            <div style={{ color: '#aaa', fontSize: 12 }}>The People App</div>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{
          background: '#FFB0D0', color: 'white',
          border: '2.5px solid white', borderRadius: 50,
          padding: '8px 18px', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit'
        }}>← App</button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Users', value: totalUsers, bg: '#FFB3CC', icon: '👥' },
            { label: 'Total Groups', value: groups.length, bg: '#B8F0B8', icon: '🏘️' },
            { label: 'Total Events', value: events.length, bg: '#B3E5FC', icon: '🎉' },
            { label: 'Pending Reports', value: pendingReports, bg: '#FFD699', icon: '🛡️' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: '3px solid #8A8AA8',
              borderRadius: 20, padding: '20px 16px', textAlign: 'center',
              boxShadow: '4px 4px 0 #8A8AA8'
            }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 28 }}>{s.value}</div>
              <div style={{ color: '#555', fontSize: 13, fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['groups','events','listings','users','reports'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', borderRadius: 50,
              border: '3px solid #8A8AA8', fontWeight: 700, fontSize: 14,
              background: tab === t ? '#FFB0D0' : 'white',
              color: tab === t ? 'white' : '#8A8AA8',
              boxShadow: '3px 3px 0 #8A8AA8', cursor: 'pointer',
              fontFamily: 'inherit', textTransform: 'capitalize'
            }}>{
              t === 'groups' ? '🏘️ Groups'
              : t === 'events' ? '🎉 Events'
              : t === 'listings' ? '🏪 Listings'
              : t === 'users' ? '👥 Users'
              : `🛡️ Reports${pendingReports ? ` (${pendingReports})` : ''}`
            }</button>
          ))}
        </div>

        {/* SUCCESS / ERROR */}
        {success && (
          <div style={{
            background: '#B8F0B8', border: '3px solid #4CAF82',
            borderRadius: 14, padding: '12px 16px',
            fontWeight: 700, color: '#1C6B3A', marginBottom: 16
          }}>✅ {success}</div>
        )}
        {error && (
          <div style={{
            background: '#FFE0E0', border: '3px solid #FF6B6B',
            borderRadius: 14, padding: '12px 16px',
            fontWeight: 700, color: '#CC0000', marginBottom: 16
          }}>{error}</div>
        )}

        {/* GROUPS TAB */}
        {tab === 'groups' && (
          <div>
            {/* CREATE GROUP FORM */}
            <div style={{
              background: 'white', border: '3px solid #8A8AA8',
              borderRadius: 20, padding: 24,
              boxShadow: '5px 5px 0 #8A8AA8', marginBottom: 20
            }}>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>
                Create New Group ➕
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Group Name *</label>
                  <input style={inputStyle} value={gName} onChange={e => setGName(e.target.value)} placeholder="e.g. Jaipur Chess Club" />
                </div>
                <div>
                  <label style={labelStyle}>City *</label>
                  <CityPicker
                    layout="select"
                    city={gCity}
                    customCity={gCustomCity}
                    onCityChange={setGCity}
                    onCustomCityChange={setGCustomCity}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, borderRadius: 16 }} rows={2}
                  value={gDesc} onChange={e => setGDesc(e.target.value)}
                  placeholder="What is this group about?" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Max Members</label>
                <input style={{ ...inputStyle, width: 120 }} type="number"
                  value={gMax} onChange={e => setGMax(Number(e.target.value))} min={2} max={50} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Interests (select all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {INTERESTS.map(x => (
                    <button key={x} onClick={() => toggleGInterest(x)} style={{
                      padding: '6px 12px', borderRadius: 50,
                      border: '2.5px solid #8A8AA8', fontWeight: 700, fontSize: 12,
                      background: gInterests.includes(x) ? '#FFB0D0' : '#FFFCFD',
                      color: gInterests.includes(x) ? 'white' : '#8A8AA8',
                      cursor: 'pointer', fontFamily: 'inherit'
                    }}>{x}</button>
                  ))}
                </div>
              </div>
              <button onClick={createGroup} style={{
                background: '#4CAF82', color: 'white',
                border: '3px solid #8A8AA8', borderRadius: 50,
                padding: '12px 28px', fontWeight: 900, fontSize: 15,
                boxShadow: '4px 4px 0 #8A8AA8', cursor: 'pointer',
                fontFamily: 'inherit'
              }}>Create Group ✓</button>
            </div>

            {/* GROUPS LIST */}
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>
              All Groups ({groups.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {groups.map(g => (
                <div key={g.id} style={{
                  background: '#B8F0B8', border: '3px solid #8A8AA8',
                  borderRadius: 16, padding: '14px 18px',
                  boxShadow: '3px 3px 0 #8A8AA8',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{g.name}</div>
                    <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>
                      📍 {g.city} · 👥 {g.group_members?.[0]?.count || 0}/{g.max_members}
                    </div>
                  </div>
                  <button onClick={() => deleteGroup(g.id)} style={{
                    background: '#FFE0E0', border: '2.5px solid #FF6B6B',
                    borderRadius: 10, padding: '8px 12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}>
                    <Trash2 size={16} color="#CC0000" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {tab === 'events' && (
          <div>
            {/* CREATE EVENT FORM */}
            <div style={{
              background: 'white', border: '3px solid #8A8AA8',
              borderRadius: 20, padding: 24,
              boxShadow: '5px 5px 0 #8A8AA8', marginBottom: 20
            }}>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>
                Create New Event ➕
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Event Name *</label>
                  <input style={inputStyle} value={eName} onChange={e => setEName(e.target.value)} placeholder="e.g. Startup Mixer" />
                </div>
                <div>
                  <label style={labelStyle}>City *</label>
                  <CityPicker
                    layout="select"
                    city={eCity}
                    customCity={eCustomCity}
                    onCityChange={setECity}
                    onCustomCityChange={setECustomCity}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, borderRadius: 16 }} rows={2}
                  value={eDesc} onChange={e => setEDesc(e.target.value)}
                  placeholder="What happens at this event?" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Date & Time *</label>
                  <input style={inputStyle} type="datetime-local"
                    value={eDate} onChange={e => setEDate(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Max Attendees</label>
                  <input style={inputStyle} type="number"
                    value={eMax} onChange={e => setEMax(Number(e.target.value))} min={5} max={500} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Location *</label>
                <input style={inputStyle} value={eLocation}
                  onChange={e => setELocation(e.target.value)}
                  placeholder="e.g. Tapri Central, C-Scheme, Jaipur" />
              </div>
              <button onClick={createEvent} disabled={eventSaving} style={{
                background: '#4CAF82', color: 'white',
                border: '3px solid #8A8AA8', borderRadius: 50,
                padding: '12px 28px', fontWeight: 900, fontSize: 15,
                boxShadow: '4px 4px 0 #8A8AA8',
                fontFamily: 'inherit',
                opacity: eventSaving ? 0.65 : 1,
                cursor: eventSaving ? 'not-allowed' : 'pointer',
              }}>{eventSaving ? 'Creating...' : 'Create Event ✓'}</button>
            </div>

            {/* EVENTS LIST */}
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>
              All Events ({events.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.map(ev => (
                <div key={ev.id} style={{
                  background: '#B3E5FC', border: '3px solid #8A8AA8',
                  borderRadius: 16, padding: '14px 18px',
                  boxShadow: '3px 3px 0 #8A8AA8',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{ev.title}</div>
                    <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>
                      📍 {ev.city} · 📅 {new Date(ev.date).toLocaleDateString()} · 👥 {ev.event_attendees?.[0]?.count || 0}/{ev.max_attendees}
                    </div>
                    <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>📌 {ev.location}</div>
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} style={{
                    background: '#FFE0E0', border: '2.5px solid #FF6B6B',
                    borderRadius: 10, padding: '8px 12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}>
                    <Trash2 size={16} color="#CC0000" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>
              All Users ({totalUsers})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map((u, i) => (
                <div key={u.id} style={{
                  background: 'white', border: '3px solid #8A8AA8',
                  borderRadius: 16, padding: '14px 18px',
                  boxShadow: '3px 3px 0 #8A8AA8',
                  display: 'flex', alignItems: 'center', gap: 14
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699'][i % 4],
                    border: '2.5px solid #8A8AA8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 18, flexShrink: 0
                  }}>{u.full_name?.[0] || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{u.full_name || 'No name yet'}</div>
                    <div style={{ color: '#555', fontSize: 13 }}>
                      @{u.username || 'no username'} · 📍 {u.city || 'No city'}
                    </div>
                    <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {usersHasMore && (
              <button
                onClick={() => fetchUsers(true)}
                disabled={usersLoadingMore}
                style={{
                  marginTop: 16, width: '100%', padding: '12px 20px',
                  background: usersLoadingMore ? '#eee' : 'white',
                  border: '3px solid #8A8AA8', borderRadius: 50,
                  fontWeight: 700, fontSize: 14, cursor: usersLoadingMore ? 'wait' : 'pointer',
                  boxShadow: '3px 3px 0 #8A8AA8', fontFamily: 'inherit',
                }}
              >
                {usersLoadingMore ? 'Loading...' : 'Load more users'}
              </button>
            )}
          </div>
        )}

        {/* LISTINGS TAB */}
        {tab === 'listings' && (
          <AdminListingsTab
            profile={profile}
            onSuccess={msg => { showSuccess(msg); fetchAll() }}
            onError={msg => setError(msg)}
          />
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <AdminReportsTab
            onSuccess={msg => { showSuccess(msg); fetchAll() }}
            onError={msg => setError(msg)}
          />
        )}
      </div>
    </div>
  )
}