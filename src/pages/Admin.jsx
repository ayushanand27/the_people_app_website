import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Users, Calendar } from 'lucide-react'

const INTERESTS = [
  'Tech/Coding', 'Art/Design', 'Finance/Investing', 'Movies/Cinema',
  'Travel', 'Books/Reading', 'Gaming', 'Photography',
  'Startups/Entrepreneurship', 'Indie Music', 'Fitness', 'Food',
  'Chess', 'Philosophy', 'Anime', 'Podcasts'
]

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Surat', 'Other'
]

export default function Admin({ profile }) {
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('groups')
  const [groups,   setGroups]   = useState([])
  const [events,   setEvents]   = useState([])
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [success,  setSuccess]  = useState('')
  const [error,    setError]    = useState('')

  // GROUP FORM
  const [gName,     setGName]     = useState('')
  const [gDesc,     setGDesc]     = useState('')
  const [gCity,     setGCity]     = useState('Jaipur')
  const [gMax,      setGMax]      = useState(12)
  const [gInterests,setGInterests]= useState([])

  // EVENT FORM
  const [eName,     setEName]     = useState('')
  const [eDesc,     setEDesc]     = useState('')
  const [eCity,     setECity]     = useState('Jaipur')
  const [eDate,     setEDate]     = useState('')
  const [eLocation, setELocation] = useState('')
  const [eMax,      setEMax]      = useState(30)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const [g, e, u] = await Promise.all([
      supabase.from('groups').select('*, group_members(count)').order('created_at', { ascending: false }),
      supabase.from('events').select('*, event_attendees(count)').order('date', { ascending: false }),
      supabase.from('profiles').select('id, full_name, username, city, created_at').order('created_at', { ascending: false }).limit(50)
    ])
    setGroups(g.data || [])
    setEvents(e.data || [])
    setUsers(u.data  || [])
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
    if (!gName || !gCity || gInterests.length === 0) {
      setError('Fill all group fields')
      return
    }
    setError('')
    const { error: err } = await supabase.from('groups').insert({
      name: gName, description: gDesc,
      city: gCity, max_members: gMax,
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
    if (!eName || !eCity || !eDate || !eLocation) {
      setError('Fill all event fields')
      return
    }
    setError('')
    const { error: err } = await supabase.from('events').insert({
      title: eName, description: eDesc,
      city: eCity, date: new Date(eDate).toISOString(),
      location: eLocation, max_attendees: eMax,
      created_by: profile.id
    })
    if (err) { setError(err.message); return }
    setEName(''); setEDesc(''); setEDate(''); setELocation('')
    showSuccess('Event created!')
    fetchAll()
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return
    setError('')

    const { error: attendeeError } = await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', id)

    if (attendeeError) {
      setError(attendeeError.message)
      return
    }

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
    width: '100%', border: '3px solid #1C1C3A', borderRadius: 16,
    padding: '12px 16px', fontSize: 14, fontWeight: 600,
    background: '#FFF0F5', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  }

  const labelStyle = { fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 40 }}>

      {/* TOP BAR */}
      <div style={{
        background: '#1C1C3A', borderBottom: '3px solid #1C1C3A',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: '#FF85B3',
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
          background: '#FF85B3', color: 'white',
          border: '2.5px solid white', borderRadius: 50,
          padding: '8px 18px', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit'
        }}>← App</button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Users', value: users.length, bg: '#FFB3CC', icon: '👥' },
            { label: 'Total Groups', value: groups.length, bg: '#B8F0B8', icon: '🏘️' },
            { label: 'Total Events', value: events.length, bg: '#B3E5FC', icon: '🎉' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: '3px solid #1C1C3A',
              borderRadius: 20, padding: '20px 16px', textAlign: 'center',
              boxShadow: '4px 4px 0 #1C1C3A'
            }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 28 }}>{s.value}</div>
              <div style={{ color: '#555', fontSize: 13, fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['groups','events','users'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', borderRadius: 50,
              border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
              background: tab === t ? '#FF85B3' : 'white',
              color: tab === t ? 'white' : '#1C1C3A',
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer',
              fontFamily: 'inherit', textTransform: 'capitalize'
            }}>{t === 'groups' ? '🏘️ Groups' : t === 'events' ? '🎉 Events' : '👥 Users'}</button>
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
              background: 'white', border: '3px solid #1C1C3A',
              borderRadius: 20, padding: 24,
              boxShadow: '5px 5px 0 #1C1C3A', marginBottom: 20
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
                  <select style={inputStyle} value={gCity} onChange={e => setGCity(e.target.value)}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
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
                      border: '2.5px solid #1C1C3A', fontWeight: 700, fontSize: 12,
                      background: gInterests.includes(x) ? '#FF85B3' : '#FFF0F5',
                      color: gInterests.includes(x) ? 'white' : '#1C1C3A',
                      cursor: 'pointer', fontFamily: 'inherit'
                    }}>{x}</button>
                  ))}
                </div>
              </div>
              <button onClick={createGroup} style={{
                background: '#4CAF82', color: 'white',
                border: '3px solid #1C1C3A', borderRadius: 50,
                padding: '12px 28px', fontWeight: 900, fontSize: 15,
                boxShadow: '4px 4px 0 #1C1C3A', cursor: 'pointer',
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
                  background: '#B8F0B8', border: '3px solid #1C1C3A',
                  borderRadius: 16, padding: '14px 18px',
                  boxShadow: '3px 3px 0 #1C1C3A',
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
              background: 'white', border: '3px solid #1C1C3A',
              borderRadius: 20, padding: 24,
              boxShadow: '5px 5px 0 #1C1C3A', marginBottom: 20
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
                  <select style={inputStyle} value={eCity} onChange={e => setECity(e.target.value)}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
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
              <button onClick={createEvent} style={{
                background: '#4CAF82', color: 'white',
                border: '3px solid #1C1C3A', borderRadius: 50,
                padding: '12px 28px', fontWeight: 900, fontSize: 15,
                boxShadow: '4px 4px 0 #1C1C3A', cursor: 'pointer',
                fontFamily: 'inherit'
              }}>Create Event ✓</button>
            </div>

            {/* EVENTS LIST */}
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>
              All Events ({events.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.map(ev => (
                <div key={ev.id} style={{
                  background: '#B3E5FC', border: '3px solid #1C1C3A',
                  borderRadius: 16, padding: '14px 18px',
                  boxShadow: '3px 3px 0 #1C1C3A',
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
              All Users ({users.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map((u, i) => (
                <div key={u.id} style={{
                  background: 'white', border: '3px solid #1C1C3A',
                  borderRadius: 16, padding: '14px 18px',
                  boxShadow: '3px 3px 0 #1C1C3A',
                  display: 'flex', alignItems: 'center', gap: 14
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699'][i % 4],
                    border: '2.5px solid #1C1C3A',
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
          </div>
        )}
      </div>
    </div>
  )
}