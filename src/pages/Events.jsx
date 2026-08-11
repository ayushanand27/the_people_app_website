import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import InlineError from '../components/InlineError'
import { reportSupabaseError } from '../lib/supabaseError'
import { useBrowseCity } from '../hooks/useBrowseCity'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']

export default function Events({ profile }) {
  const browseCity = useBrowseCity(profile?.city)
  const [events,  setEvents]  = useState([])
  const [rsvpd,   setRsvpd]   = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab,     setTab]     = useState('upcoming')

  useEffect(() => { if (profile) { fetchEvents(); fetchRsvpd() } }, [profile, tab, browseCity])

  async function fetchEvents() {
    setLoading(true)
    setLoadError('')
    let q = supabase.from('events')
      .select('*, event_attendees(count)')
      .eq('city', browseCity)
      .order('date', { ascending: true })
    if (tab === 'upcoming') q = q.gte('date', new Date().toISOString())
    const { data, error } = await q.limit(20)
    if (error) {
      setLoadError(reportSupabaseError(error, 'Events') || 'Failed to load events')
      setEvents([])
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }

  async function fetchRsvpd() {
    const { data } = await supabase.from('event_attendees').select('event_id').eq('user_id', profile.id)
    setRsvpd((data || []).map(d => d.event_id))
  }

  async function rsvp(id) {
    const { error } = await supabase.from('event_attendees').insert({ event_id: id, user_id: profile.id })
    if (error) {
      setLoadError(reportSupabaseError(error, 'RSVP') || 'Could not RSVP')
      return
    }
    setRsvpd(prev => [...prev, id])
    setEvents(prev => prev.map(e => {
      if (e.id !== id) return e
      const count = e.event_attendees?.[0]?.count ?? 0
      return { ...e, event_attendees: [{ count: count + 1 }] }
    }))
  }

  async function cancel(id) {
    const { error } = await supabase.from('event_attendees').delete().eq('event_id', id).eq('user_id', profile.id)
    if (error) {
      setLoadError(reportSupabaseError(error, 'Cancel RSVP') || 'Could not cancel RSVP')
      return
    }
    setRsvpd(prev => prev.filter(x => x !== id))
    setEvents(prev => prev.map(e => {
      if (e.id !== id) return e
      const count = e.event_attendees?.[0]?.count ?? 1
      return { ...e, event_attendees: [{ count: Math.max(count - 1, 0) }] }
    }))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="events" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>Events in {browseCity} 🎉</div>
          <div style={{ color: '#888', marginTop: 4, fontSize: 15 }}>Meet your people IRL · {browseCity}</div>
        </div>

        <InlineError message={loadError} onRetry={fetchEvents} />

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['upcoming','all'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', borderRadius: 50,
              border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
              background: tab === t ? '#FF85B3' : 'white',
              color: tab === t ? 'white' : '#1C1C3A',
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer'
            }}>
              {t === 'upcoming' ? '🚀 Upcoming' : '📅 All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontWeight: 700 }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div style={{
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 20, padding: '40px 20px', textAlign: 'center',
            boxShadow: '5px 5px 0 #1C1C3A'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No events in {browseCity} yet</div>
            <div style={{ color: '#aaa', marginTop: 6 }}>Check back soon, or be the first to host one!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {events.map((ev, i) => {
              const isRsvpd  = rsvpd.includes(ev.id)
              const count    = ev.event_attendees?.[0]?.count || 0
              const isFull   = count >= ev.max_attendees
              const isPast   = new Date(ev.date) < new Date()
              return (
                <div key={ev.id} style={{
                  background: BG[i % BG.length],
                  border: '3px solid #1C1C3A', borderRadius: 20,
                  padding: '20px 20px', boxShadow: '5px 5px 0 #1C1C3A'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>{ev.title}</div>
                      <div style={{ color: '#555', fontSize: 14, marginTop: 4 }}>{ev.description}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, fontSize: 12, color: '#666', fontWeight: 700 }}>
                        <span>📍 {ev.city}</span>
                        <span>📅 {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        <span>🕐 {new Date(ev.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>👥 {count}/{ev.max_attendees}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', fontWeight: 700, marginTop: 4 }}>
                        📌 {ev.location}
                      </div>
                    </div>
                    {!isPast && (
                      <button
                        onClick={() => isRsvpd ? cancel(ev.id) : rsvp(ev.id)}
                        disabled={!isRsvpd && isFull}
                        style={{
                          padding: '10px 16px', borderRadius: 14,
                          border: '3px solid #1C1C3A', fontWeight: 900, fontSize: 13,
                          background: isRsvpd ? '#FFB3CC' : isFull ? '#eee' : '#B8F0B8',
                          color: isRsvpd ? '#CC0044' : isFull ? '#aaa' : '#1C6B3A',
                          boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer',
                          flexShrink: 0, opacity: (!isRsvpd && isFull) ? 0.5 : 1
                        }}
                      >
                        {isRsvpd ? 'Cancel' : isFull ? 'Full' : 'RSVP ✓'}
                      </button>
                    )}
                  </div>
                  {isRsvpd && (
                    <div style={{
                      marginTop: 12, background: '#B8F0B8',
                      border: '2px solid #4CAF82', borderRadius: 12,
                      padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#1C6B3A'
                    }}>✅ You're going!</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
