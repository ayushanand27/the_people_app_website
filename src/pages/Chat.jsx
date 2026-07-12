import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Send, ArrowLeft } from 'lucide-react'
import InlineError from '../components/InlineError'
import { reportSupabaseError } from '../lib/supabaseError'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']
const MESSAGE_PAGE = 50

export default function Chat({ profile }) {
  const navigate           = useNavigate()
  const { id: receiverId } = useParams()
  const bottomRef          = useRef(null)
  const messagesRef        = useRef(null)
  const oldestCursorRef    = useRef(null)

  const [conversations, setConversations] = useState([])
  const [messages,      setMessages]      = useState([])
  const [receiver,      setReceiver]      = useState(null)
  const [newMsg,        setNewMsg]        = useState('')
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState('')
  const [hasOlder,      setHasOlder]      = useState(false)
  const [loadingOlder,  setLoadingOlder]  = useState(false)

  useEffect(() => { if (profile) fetchConversations() }, [profile])
  useEffect(() => {
    if (!receiverId || !profile) return
    setLoadError('')
    setHasOlder(false)
    oldestCursorRef.current = null
    fetchReceiver()
    fetchMessages()
    markThreadRead()
    return subscribeMessages()
  }, [receiverId, profile])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, receiverId])

  async function markThreadRead() {
    await supabase.from('messages')
      .update({ read: true })
      .eq('receiver_id', profile.id)
      .eq('sender_id', receiverId)
      .eq('read', false)
  }

  async function fetchConversations() {
    setLoadError('')
    setLoading(true)
    const { data, error } = await supabase.from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
    if (error) {
      setLoadError(reportSupabaseError(error, 'Chat conversations') || 'Failed to load conversations')
      setLoading(false)
      return
    }
    if (!data) { setLoading(false); return }
    const ids = [...new Set(data.map(m => m.sender_id === profile.id ? m.receiver_id : m.sender_id))]
    if (ids.length === 0) { setLoading(false); return }
    const { data: profiles, error: profileError } = await supabase.from('profiles')
      .select('id,full_name,username').in('id', ids)
    if (profileError) {
      setLoadError(reportSupabaseError(profileError, 'Chat profiles') || 'Failed to load conversations')
      setLoading(false)
      return
    }
    setConversations(profiles || [])
    setLoading(false)
  }

  async function fetchReceiver() {
    const { data, error } = await supabase.from('profiles')
      .select('id,full_name,username,city').eq('id', receiverId).single()
    if (error) {
      setLoadError(reportSupabaseError(error, 'Chat receiver') || 'Failed to load chat')
      return
    }
    setReceiver(data)
  }

  async function fetchMessages() {
    const { data, error } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE + 1)
    if (error) {
      setLoadError(reportSupabaseError(error, 'Chat messages') || 'Failed to load messages')
      return
    }
    const batch = data || []
    setHasOlder(batch.length > MESSAGE_PAGE)
    const slice = batch.slice(0, MESSAGE_PAGE).reverse()
    setMessages(slice)
    oldestCursorRef.current = slice[0]?.created_at ?? null
  }

  async function loadOlderMessages() {
    if (!oldestCursorRef.current || loadingOlder || !hasOlder) return
    setLoadingOlder(true)
    const container = messagesRef.current
    const prevHeight = container?.scrollHeight ?? 0

    const { data, error } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${profile.id})`)
      .lt('created_at', oldestCursorRef.current)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE + 1)

    if (error) {
      setLoadError(reportSupabaseError(error, 'Chat older messages') || 'Failed to load older messages')
      setLoadingOlder(false)
      return
    }

    const batch = data || []
    setHasOlder(batch.length > MESSAGE_PAGE)
    const slice = batch.slice(0, MESSAGE_PAGE).reverse()
    if (slice.length) {
      oldestCursorRef.current = slice[0].created_at
      setMessages(prev => [...slice, ...prev])
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevHeight
      })
    } else {
      setHasOlder(false)
    }
    setLoadingOlder(false)
  }

  function handleMessagesScroll(e) {
    if (e.currentTarget.scrollTop < 80) loadOlderMessages()
  }

  function subscribeMessages() {
    const ch = supabase.channel(`msgs-${receiverId}`)
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
    const content = newMsg.trim()
    setNewMsg('')
    const { data, error } = await supabase.from('messages').insert({
      sender_id: profile.id, receiver_id: receiverId, content,
    }).select().single()
    if (error) {
      setLoadError(reportSupabaseError(error, 'Send message') || 'Could not send message')
      setNewMsg(content)
      return
    }
    if (data) setMessages(prev => (prev.some(m => m.id === data.id) ? prev : [...prev, data]))
    fetchConversations()
  }

  // CONVERSATION LIST
  if (!receiverId) return (
    <div style={{ minHeight: '100vh', background: '#FFFCFD', paddingBottom: 100 }}>
      <Navbar active="chat" profile={profile} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 20 }}>Messages 💬</div>

        <InlineError message={loadError} onRetry={fetchConversations} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontWeight: 700 }}>Loading...</div>
        ) : conversations.length === 0 ? (
          <div style={{
            background: 'white', border: '3px solid #8A8AA8',
            borderRadius: 20, padding: '40px 20px', textAlign: 'center',
            boxShadow: '5px 5px 0 #8A8AA8'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No messages yet</div>
            <div style={{ color: '#aaa', marginTop: 6, marginBottom: 16 }}>Discover people and start chatting!</div>
            <button onClick={() => navigate('/discover')} style={{
              background: '#FFB0D0', color: 'white',
              border: '3px solid #8A8AA8', borderRadius: 50,
              padding: '12px 28px', fontWeight: 900, fontSize: 15,
              boxShadow: '4px 4px 0 #8A8AA8', cursor: 'pointer'
            }}>Find People →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {conversations.map((c, i) => (
              <button key={c.id} onClick={() => navigate(`/chat/${c.id}`)}
                style={{
                  background: BG[i % BG.length],
                  border: '3px solid #8A8AA8', borderRadius: 20,
                  padding: 16, display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: '5px 5px 0 #8A8AA8', cursor: 'pointer',
                  transition: 'all 0.2s', textAlign: 'left'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #8A8AA8' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #8A8AA8' }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: BORDER[i % BORDER.length],
                  border: '3px solid #8A8AA8',
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
    <div style={{ minHeight: '100vh', background: '#FFFCFD', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'white', borderBottom: '3px solid #8A8AA8',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button onClick={() => navigate('/chat')} style={{
          width: 38, height: 38, background: '#FFFCFD',
          border: '3px solid #8A8AA8', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '2px 2px 0 #8A8AA8', cursor: 'pointer'
        }}><ArrowLeft size={18} /></button>

        <div style={{
          width: 44, height: 44, background: '#FFB0D0',
          border: '3px solid #8A8AA8', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: 20
        }}>{receiver?.full_name?.[0] || '?'}</div>

        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{receiver?.full_name}</div>
          <div style={{ color: '#888', fontSize: 13 }}>@{receiver?.username}</div>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <InlineError
          message={loadError}
          onRetry={() => { setLoadError(''); fetchReceiver(); fetchMessages() }}
        />
        {hasOlder && (
          <div style={{ textAlign: 'center', color: '#888', fontSize: 12, fontWeight: 700 }}>
            {loadingOlder ? 'Loading older messages...' : 'Scroll up for older messages'}
          </div>
        )}
        {messages.length === 0 && !loadError && (
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
                borderRadius: 20, border: '3px solid #8A8AA8',
                fontWeight: 600, fontSize: 15,
                boxShadow: '3px 3px 0 #8A8AA8',
                background: isMine ? '#FFB0D0' : 'white',
                color: isMine ? 'white' : '#8A8AA8'
              }}>{msg.content}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <form onSubmit={sendMessage} style={{
        position: 'fixed', bottom: 72, left: 0, right: 0,
        background: 'white', borderTop: '3px solid #8A8AA8',
        padding: '12px 16px', display: 'flex', gap: 10, zIndex: 40
      }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          style={{
            flex: 1, border: '3px solid #8A8AA8', borderRadius: 50,
            padding: '12px 20px', fontSize: 15, fontWeight: 600,
            background: '#FFFCFD', outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <button type="submit" disabled={!newMsg.trim()} style={{
          width: 50, height: 50, background: '#FFB0D0',
          border: '3px solid #8A8AA8', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', boxShadow: '3px 3px 0 #8A8AA8',
          cursor: 'pointer', opacity: newMsg.trim() ? 1 : 0.4
        }}><Send size={20} /></button>
      </form>
    </div>
  )
}
