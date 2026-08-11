import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Send, ArrowLeft, ImagePlus, X, Flag, Ban } from 'lucide-react'
import InlineError from '../components/InlineError'
import { reportSupabaseError } from '../lib/supabaseError'
import { checkChatText } from '../lib/chatSafety'
import { moderateChatText, moderateChatImage } from '../lib/ai'
import { reportContent, blockUser, getBlockedIds, createNotification } from '../lib/social'

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']
const BORDER = ['#FF6B9D','#4CAF82','#29ABE2','#FF9F1C','#9B59B6','#F1C40F']
const MESSAGE_PAGE = 50
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export default function Chat({ profile }) {
  const navigate           = useNavigate()
  const { id: receiverId } = useParams()
  const bottomRef          = useRef(null)
  const messagesRef        = useRef(null)
  const oldestCursorRef    = useRef(null)
  const fileRef            = useRef(null)

  const [conversations, setConversations] = useState([])
  const [messages,      setMessages]      = useState([])
  const [receiver,      setReceiver]      = useState(null)
  const [newMsg,        setNewMsg]        = useState('')
  const [pendingImage,  setPendingImage]  = useState(null)
  const [uploading,     setUploading]     = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState('')
  const [hasOlder,      setHasOlder]      = useState(false)
  const [loadingOlder,  setLoadingOlder]  = useState(false)
  const [safetyBusy,    setSafetyBusy]    = useState(false)

  useEffect(() => { if (profile) fetchConversations() }, [profile])
  useEffect(() => {
    if (!receiverId || !profile) return
    setLoadError('')
    setHasOlder(false)
    oldestCursorRef.current = null
    setPendingImage(null)
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
    const blockedIds = await getBlockedIds(profile.id)
    const { data, error } = await supabase.from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
    if (error) {
      setLoadError(reportSupabaseError(error, 'Chat conversations') || 'Failed to load conversations')
      setLoading(false)
      return
    }
    if (!data) { setLoading(false); return }
    const ids = [...new Set(
      data
        .map(m => m.sender_id === profile.id ? m.receiver_id : m.sender_id)
        .filter(id => !blockedIds.includes(id))
    )]
    if (ids.length === 0) { setConversations([]); setLoading(false); return }
    const { data: profiles, error: profileError } = await supabase.from('profiles')
      .select('id,full_name,username,city').in('id', ids)
    if (profileError) {
      setLoadError(reportSupabaseError(profileError, 'Chat profiles') || 'Failed to load conversations')
      setLoading(false)
      return
    }
    setConversations(profiles || [])
    setLoading(false)
  }

  async function fetchReceiver() {
    const blockedIds = await getBlockedIds(profile.id)
    if (blockedIds.includes(receiverId)) {
      setReceiver(null)
      setLoadError('You can’t message this user — one of you has blocked the other.')
      setTimeout(() => navigate('/chat'), 1500)
      return
    }
    const { data, error } = await supabase.from('profiles')
      .select('id,full_name,username,city').eq('id', receiverId).single()
    if (error) {
      setReceiver(null)
      setLoadError(reportSupabaseError(error, 'Chat receiver') || 'This profile isn’t available.')
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
          setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
        }
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }

  function onPickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLoadError('Please choose an image (JPG, PNG, WebP)')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLoadError('Image must be under 5MB')
      return
    }
    setLoadError('')
    setPendingImage({
      file,
      preview: URL.createObjectURL(file),
    })
  }

  function clearPendingImage() {
    if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview)
    setPendingImage(null)
  }

  async function uploadChatImage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${profile.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('chat-images').upload(path, file, {
      upsert: false,
      contentType: file.type,
    })
    if (error) throw error
    const { data } = supabase.storage.from('chat-images').getPublicUrl(path)
    return { publicUrl: data.publicUrl, path }
  }

  async function deleteUploadedImage(path) {
    if (!path) return
    await supabase.storage.from('chat-images').remove([path])
  }

  async function handleReport() {
    if (!receiverId || safetyBusy) return
    const reason = window.prompt('Why are you reporting this user? (optional)')
    if (reason === null) return
    setSafetyBusy(true)
    const ok = await reportContent({
      reporterId: profile.id,
      targetType: 'user',
      targetId: receiverId,
      reason: reason || 'Reported from chat',
    })
    setSafetyBusy(false)
    alert(ok ? 'Reported. Our team will review.' : 'Could not submit report.')
  }

  async function handleBlock() {
    if (!receiverId || safetyBusy) return
    if (!window.confirm(`Block ${receiver?.full_name || 'this user'}? They won’t be able to message you or see your profile.`)) return
    setSafetyBusy(true)
    const ok = await blockUser(profile.id, receiverId)
    setSafetyBusy(false)
    if (ok) {
      alert('User blocked. They can’t message you or see your profile.')
      navigate('/chat')
      fetchConversations()
    } else {
      alert('Could not block user.')
    }
  }

  async function sendMessage(e) {
    e.preventDefault()
    const content = newMsg.trim()
    if (!content && !pendingImage) return

    // 1) Local text filter
    if (content) {
      const local = checkChatText(content)
      if (!local.ok) {
        setLoadError(local.reason)
        return
      }
    }

    setUploading(true)
    setLoadError('')
    let imageUrl = null
    let imagePath = null

    try {
      // 2) AI text moderation (fail open if AI down — local filter already ran)
      if (content) {
        const ai = await moderateChatText(content)
        if (ai.flagged) {
          setLoadError(ai.reason || 'This message was blocked for safety.')
          setUploading(false)
          return
        }
      }

      // 3) Upload + image moderation (fail closed)
      if (pendingImage?.file) {
        const uploaded = await uploadChatImage(pendingImage.file)
        imageUrl = uploaded.publicUrl
        imagePath = uploaded.path
        const imgMod = await moderateChatImage(imageUrl)
        if (imgMod.flagged) {
          await deleteUploadedImage(imagePath)
          setLoadError(imgMod.reason || 'This image was blocked for safety.')
          setUploading(false)
          return
        }
      }

      const { data, error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        receiver_id: receiverId,
        content: content || '',
        image_url: imageUrl,
      }).select().single()
      if (error) throw error
      setNewMsg('')
      clearPendingImage()
      if (data) setMessages(prev => (prev.some(m => m.id === data.id) ? prev : [...prev, data]))
      createNotification({
        userId: receiverId,
        actorId: profile.id,
        type: 'message',
        entityId: data?.id || null,
      })
      fetchConversations()
    } catch (err) {
      if (imagePath) await deleteUploadedImage(imagePath)
      const msg = err?.message || ''
      if (/Rate limit: max 10 new/i.test(msg)) {
        setLoadError('Slow down — you can only start 10 new chats per hour.')
      } else {
        setLoadError(reportSupabaseError(err, 'Send message') || msg || 'Could not send message')
      }
    } finally {
      setUploading(false)
    }
  }

  // CONVERSATION LIST
  if (!receiverId) return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="chat" profile={profile} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Messages 💬</div>
        <div style={{ color: '#888', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
          Chat across cities · be kind · report or block anytime
        </div>

        <InlineError message={loadError} onRetry={fetchConversations} />

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
            <div style={{ color: '#aaa', marginTop: 6, marginBottom: 16, lineHeight: 1.5 }}>
              Discover people and start chatting. Harmful messages and unsafe images are blocked.
            </div>
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
                  <div style={{ color: '#666', fontSize: 13 }}>@{c.username}{c.city ? ` · ${c.city}` : ''}</div>
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
    <div style={{ minHeight: '100vh', background: '#FFF0F5', display: 'flex', flexDirection: 'column', paddingBottom: 72 }}>
      <Navbar active="chat" profile={profile} />

      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'white', borderBottom: '3px solid #1C1C3A',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button onClick={() => navigate('/chat')} aria-label="Back to conversations" style={{
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{receiver?.full_name}</div>
          <div style={{ color: '#888', fontSize: 13 }}>
            @{receiver?.username}{receiver?.city ? ` · ${receiver.city}` : ''}
          </div>
        </div>

        <button
          type="button"
          onClick={handleReport}
          disabled={safetyBusy}
          title="Report user"
          aria-label="Report user"
          style={{
            width: 38, height: 38, background: 'white',
            border: '3px solid #1C1C3A', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '2px 2px 0 #1C1C3A', cursor: 'pointer', color: '#1C1C3A',
          }}
        >
          <Flag size={16} />
        </button>
        <button
          type="button"
          onClick={handleBlock}
          disabled={safetyBusy}
          title="Block user"
          aria-label="Block user"
          style={{
            width: 38, height: 38, background: '#FFE0E0',
            border: '3px solid #1C1C3A', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '2px 2px 0 #1C1C3A', cursor: 'pointer', color: '#CC0000',
          }}
        >
          <Ban size={16} />
        </button>
      </div>

      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: pendingImage ? 180 : 120, display: 'flex', flexDirection: 'column', gap: 10 }}
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
            {receiver?.city && (
              <div style={{ color: '#aaa', fontSize: 13, marginTop: 6 }}>They&apos;re in {receiver.city}</div>
            )}
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === profile.id
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '72%', padding: msg.image_url && !msg.content ? 8 : '12px 16px',
                borderRadius: 20, border: '3px solid #1C1C3A',
                fontWeight: 600, fontSize: 15,
                boxShadow: '3px 3px 0 #1C1C3A',
                background: isMine ? '#FF85B3' : 'white',
                color: isMine ? 'white' : '#1C1C3A',
              }}>
                {msg.image_url && (
                  <a href={msg.image_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                    <img
                      src={msg.image_url}
                      alt="Shared"
                      style={{
                        maxWidth: '100%', maxHeight: 240, borderRadius: 12,
                        border: '2px solid #1C1C3A', display: 'block',
                        marginBottom: msg.content ? 8 : 0,
                      }}
                    />
                  </a>
                )}
                {msg.content ? msg.content : null}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{
        position: 'fixed', bottom: 72, left: 0, right: 0,
        background: 'white', borderTop: '3px solid #1C1C3A',
        padding: '12px 16px', zIndex: 40
      }}>
        {pendingImage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <img
              src={pendingImage.preview}
              alt="Preview"
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 12, border: '2px solid #1C1C3A' }}
            />
            <button type="button" onClick={clearPendingImage} aria-label="Remove image" style={{
              width: 32, height: 32, borderRadius: 10, border: '2px solid #1C1C3A',
              background: '#FFE0E0', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={16} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Send image (safety-checked)"
            aria-label="Attach image"
            style={{
              width: 50, height: 50, background: 'white',
              border: '3px solid #1C1C3A', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1C1C3A', boxShadow: '3px 3px 0 #1C1C3A',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ImagePlus size={20} />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            disabled={uploading}
            style={{
              flex: 1, border: '3px solid #1C1C3A', borderRadius: 50,
              padding: '12px 20px', fontSize: 15, fontWeight: 600,
              background: '#FFF0F5', outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <button type="submit" disabled={uploading || (!newMsg.trim() && !pendingImage)} aria-label="Send message" style={{
            width: 50, height: 50, background: '#FF85B3',
            border: '3px solid #1C1C3A', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '3px 3px 0 #1C1C3A',
            cursor: 'pointer', opacity: uploading || (!newMsg.trim() && !pendingImage) ? 0.4 : 1,
            flexShrink: 0,
          }}><Send size={20} /></button>
        </div>
      </form>
    </div>
  )
}
