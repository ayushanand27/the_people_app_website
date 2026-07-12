import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import InlineError from '../components/InlineError'
import { reportSupabaseError } from '../lib/supabaseError'
import { useBrowseCity } from '../hooks/useBrowseCity'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']

export default function Groups({ profile }) {
  const browseCity = useBrowseCity(profile?.city)
  const [groups,  setGroups]  = useState([])
  const [joined,  setJoined]  = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab,     setTab]     = useState('all')

  useEffect(() => { if (profile) { fetchGroups(); fetchJoined() } }, [profile, browseCity])

  async function fetchGroups() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase.from('groups')
      .select('*, group_members(count)')
      .eq('city', browseCity)
    if (error) {
      setLoadError(reportSupabaseError(error, 'Groups') || 'Failed to load groups')
      setGroups([])
    } else {
      setGroups(data || [])
    }
    setLoading(false)
  }

  async function fetchJoined() {
    const { data } = await supabase.from('group_members')
      .select('group_id').eq('user_id', profile.id)
    setJoined((data || []).map(d => d.group_id))
  }

  async function joinGroup(id) {
    const { error } = await supabase.from('group_members').insert({ group_id: id, user_id: profile.id })
    if (error) {
      setLoadError(reportSupabaseError(error, 'Join group') || 'Could not join group')
      return
    }
    setJoined(prev => [...prev, id])
    setGroups(prev => prev.map(g => {
      if (g.id !== id) return g
      const count = g.group_members?.[0]?.count ?? 0
      return { ...g, group_members: [{ count: count + 1 }] }
    }))
  }

  async function leaveGroup(id) {
    const { error } = await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', profile.id)
    if (error) {
      setLoadError(reportSupabaseError(error, 'Leave group') || 'Could not leave group')
      return
    }
    setJoined(prev => prev.filter(x => x !== id))
    setGroups(prev => prev.map(g => {
      if (g.id !== id) return g
      const count = g.group_members?.[0]?.count ?? 1
      return { ...g, group_members: [{ count: Math.max(count - 1, 0) }] }
    }))
  }

  const filtered = tab === 'joined' ? groups.filter(g => joined.includes(g.id)) : groups

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="groups" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>Communities in {browseCity} 🏘️</div>
          <div style={{ color: '#888', marginTop: 4, fontSize: 15 }}>Find your tribe · {browseCity}</div>
        </div>

        <InlineError message={loadError} onRetry={fetchGroups} />

        {/* TABS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['all','joined'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', borderRadius: 50,
              border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 14,
              background: tab === t ? '#FF85B3' : 'white',
              color: tab === t ? 'white' : '#1C1C3A',
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer'
            }}>
              {t === 'all' ? '🌍 All Groups' : '✅ Joined'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontWeight: 700 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 20, padding: '40px 20px', textAlign: 'center',
            boxShadow: '5px 5px 0 #1C1C3A'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏘️</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {tab === 'joined' ? "You haven't joined any groups in this city" : `No communities in ${browseCity} yet`}
            </div>
            <div style={{ color: '#aaa', marginTop: 6 }}>Check back soon!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map((g, i) => {
              const isJoined = joined.includes(g.id)
              const count    = g.group_members?.[0]?.count || 0
              const isFull   = count >= g.max_members
              return (
                <div key={g.id} style={{
                  background: BG[i % BG.length],
                  border: '3px solid #1C1C3A', borderRadius: 20,
                  padding: '20px 20px', boxShadow: '5px 5px 0 #1C1C3A'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>{g.name}</div>
                      <div style={{ color: '#555', fontSize: 14, marginTop: 4 }}>{g.description}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {g.interests?.map(x => (
                          <span key={x} style={{
                            background: 'white', border: '2px solid #1C1C3A',
                            borderRadius: 50, padding: '3px 10px', fontSize: 12, fontWeight: 700
                          }}>{x}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#666', fontWeight: 700 }}>
                        <span>📍 {g.city}</span>
                        <span>👥 {count}/{g.max_members}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => isJoined ? leaveGroup(g.id) : joinGroup(g.id)}
                      disabled={!isJoined && isFull}
                      style={{
                        padding: '10px 18px', borderRadius: 14,
                        border: '3px solid #1C1C3A', fontWeight: 900, fontSize: 14,
                        background: isJoined ? '#FFB3CC' : isFull ? '#eee' : '#B8F0B8',
                        color: isJoined ? '#CC0044' : isFull ? '#aaa' : '#1C6B3A',
                        boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer',
                        flexShrink: 0, opacity: (!isJoined && isFull) ? 0.5 : 1
                      }}
                    >
                      {isJoined ? 'Leave' : isFull ? 'Full' : 'Join ✓'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
