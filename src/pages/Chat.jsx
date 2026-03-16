import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Send, ArrowLeft } from 'lucide-react'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']

export default function Chat({ profile }) {
  const navigate           = useNavigate()
  const { id: receiverId } = useParams()
  const bottomRef          = useRef(null)

  const [conversations, setConversations] = useState([])
  const [messages,      setMessages]      = useState([])
  const [receiver,      setReceiver]      = useState(null)
  const [newMsg,        setNewMsg]        = useState('')
  const [loading,       setLoading]       = useState(true)

  useEffect(() => { if (profile) fetchConversations() }, [profile])
  useEffect(() => { if (receiverId && profile) { fetchReceiver(); fetchMessages(); subscribeMessages() } }, [receiverId, profile])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function fetchConversations() {
    const { data } = await supabase.from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
    if (!data) { setLoading(false); return }
    const ids = [...new Set(data.map(m => m.sender_id === profile.id ? m.receiver_id : m.sender_id))]
    if (ids.length === 0) { setLoading(false); return }
    const { data: profiles } = await supabase.from('profiles')
      .select('id,full_name,username').in('id', ids)
    setConversations(profiles || [])
    setLoading(false)
  }

  async function fetchReceiver() {
    const { data } = await supabase.from('profiles')
      .select('id,full_name,username,city').eq('id', receiverId).single()
    setReceiver(data)
  }

  async function fetchMessages() {
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  function subscribeMessages() {
    const ch = supabase.channel('msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new
        if ((m.sender_id === profile.id && m.receiver_id === receiverId) ||
            (m.sender_id === receiverId && m.receiver_id === profile.id)) {
          setMessages(prev => [...prev, m])
        }
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMsg.trim()) return
    await supabase.from('messages').insert({
      sender_id: profile.id, receiver_id: receiverId, content: newMsg.trim()
    })
    setNewMsg('')
  }

  // CONVERSATION LIST
  if (!receiverId) return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="chat" profile={profile} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 20 }}>Messages 💬</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontWeight: 700 }}>Loading...</div>
        ) : conversations.length === 0 ? (
          <div style={{
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 20, padding: '40px 20px', textAlign: 'center',
            boxShadow: '5px 5px 0 #1C1C3A'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No messages yet</div>
            <div style={{ color: '#aaa', marginTop: 6, marginBottom: 16 }}>Discover people and start chatting!</div>
            <button onClick={() => navigate('/discover')} style={{
              background: '#FF85B3', color: 'white',
              border: '3px solid #1C1C3A', borderRadius: 50,
              padding: '12px 28px', fontWeight: 900, fontSize: 15,
              boxShadow: '4px 4px 0 #1C1C3A', cursor: 'pointer'
            }}>Find People →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {conversations.map((c, i) => (
              <button key={c.id} onClick={() => navigate(`/chat/${c.id}`)}
                style={{
                  background: BG[i % BG.length],
                  border: '3px solid #1C1C3A', borderRadius: 20,
                  padding: 16, display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: '5px 5px 0 #1C1C3A', cursor: 'pointer',
                  transition: 'all 0.2s', textAlign: 'left'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #1C1C3A' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #1C1C3A' }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: BORDER[i % BORDER.length],
                  border: '3px solid #1C1C3A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 900, fontSize: 22, flexShrink: 0
                }}>{c.full_name?.[0] || '?'}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{c.full_name}</div>
                  <div style={{ color: '#666', fontSize: 13 }}>@{c.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // CHAT WINDOW
  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'white', borderBottom: '3px solid #1C1C3A',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button onClick={() => navigate('/chat')} style={{
          width: 38, height: 38, background: '#FFF0F5',
          border: '3px solid #1C1C3A', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '2px 2px 0 #1C1C3A', cursor: 'pointer'
        }}><ArrowLeft size={18} /></button>

        <div style={{
          width: 44, height: 44, background: '#FF85B3',
          border: '3px solid #1C1C3A', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: 20
        }}>{receiver?.full_name?.[0] || '?'}</div>

        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{receiver?.full_name}</div>
          <div style={{ color: '#888', fontSize: 13 }}>@{receiver?.username}</div>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
            <div style={{ color: '#888', fontWeight: 600 }}>Say hello to {receiver?.full_name}!</div>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === profile.id
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '72%', padding: '12px 16px',
                borderRadius: 20, border: '3px solid #1C1C3A',
                fontWeight: 600, fontSize: 15,
                boxShadow: '3px 3px 0 #1C1C3A',
                background: isMine ? '#FF85B3' : 'white',
                color: isMine ? 'white' : '#1C1C3A'
              }}>{msg.content}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <form onSubmit={sendMessage} style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '3px solid #1C1C3A',
        padding: '12px 16px', display: 'flex', gap: 10
      }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          style={{
            flex: 1, border: '3px solid #1C1C3A', borderRadius: 50,
            padding: '12px 20px', fontSize: 15, fontWeight: 600,
            background: '#FFF0F5', outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <button type="submit" disabled={!newMsg.trim()} style={{
          width: 50, height: 50, background: '#FF85B3',
          border: '3px solid #1C1C3A', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', boxShadow: '3px 3px 0 #1C1C3A',
          cursor: 'pointer', opacity: newMsg.trim() ? 1 : 0.4
        }}><Send size={20} /></button>
      </form>
    </div>
  )
}
