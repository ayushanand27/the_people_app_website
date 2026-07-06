import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { MessageCircle } from 'lucide-react'
import { whatsappUrl, telUrl } from '../lib/contact'
import {
  categoryEmoji,
  categoryLabel,
  fetchListingById,
  submitListingUpdateRequest,
} from '../lib/localListings'

export default function LocalDetail({ profile }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [suggestMsg, setSuggestMsg] = useState('')
  const [suggesting, setSuggesting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetchListingById(id)
        setListing(data)
      } catch {
        setError('Listing not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSuggestUpdate(e) {
    e.preventDefault()
    if (!note.trim()) return
    setSuggesting(true)
    setSuggestMsg('')
    try {
      await submitListingUpdateRequest({
        listingId: id,
        userId: profile.id,
        changes: { description: note.trim() },
        note: 'User suggested update',
      })
      setSuggestMsg('Thanks! Your update suggestion was sent for admin review.')
      setNote('')
    } catch (err) {
      setSuggestMsg(err.message || 'Could not submit suggestion')
    } finally {
      setSuggesting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFF0F5' }}>
        <Navbar profile={profile} />
        <div style={{ textAlign: 'center', padding: 60, fontWeight: 700, color: '#aaa' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFF0F5' }}>
        <Navbar profile={profile} />
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{error || 'Not found'}</div>
          <button
            type="button"
            onClick={() => navigate('/local')}
            style={{
              marginTop: 16, background: '#FF85B3', color: 'white',
              border: '3px solid #1C1C3A', borderRadius: 50,
              padding: '12px 24px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Back to Local
          </button>
        </div>
      </div>
    )
  }

  const wa = whatsappUrl(
    listing.whatsapp || listing.phone,
    `Hi, I found "${listing.title}" on The People App. I'm interested!`
  )
  const tel = telUrl(listing.phone)
  const owner = listing.owner

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px' }}>
        <button
          type="button"
          onClick={() => navigate('/local')}
          style={{
            background: 'none', border: 'none', color: '#FF85B3',
            fontWeight: 800, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit',
          }}
        >
          ← Back
        </button>

        {listing.images?.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16,
          }}>
            {listing.images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                style={{
                  width: listing.images.length === 1 ? '100%' : 280,
                  height: 200, objectFit: 'cover', borderRadius: 16,
                  border: '3px solid #1C1C3A', flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}

        <div style={{
          background: 'white', border: '4px solid #1C1C3A',
          borderRadius: 24, padding: 24, boxShadow: '8px 8px 0 #1C1C3A',
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={badgeStyle}>
              {categoryEmoji(listing.category)} {categoryLabel(listing.category)}
            </span>
            <span style={badgeStyle}>📍 {listing.city}</span>
            <span style={{ ...badgeStyle, background: '#B8F0B8' }}>✓ Verified</span>
          </div>

          <h1 style={{ fontWeight: 900, fontSize: 24, margin: '0 0 8px', color: '#1C1C3A' }}>
            {listing.title}
          </h1>

          {listing.price_text && (
            <div style={{ fontWeight: 900, fontSize: 20, color: '#4CAF82', marginBottom: 12 }}>
              {listing.price_text}
            </div>
          )}

          {listing.description && (
            <p style={{ color: '#555', lineHeight: 1.6, fontSize: 15, marginBottom: 20 }}>
              {listing.description}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                style={btnStyle('#25D366')}
              >
                WhatsApp →
              </a>
            )}
            {listing.phone && tel && (
              <a href={tel} style={btnStyle('#29ABE2')}>
                Call {listing.phone}
              </a>
            )}
            {owner?.id && owner.id !== profile?.id && (
              <button
                type="button"
                onClick={() => navigate(`/chat/${owner.id}`)}
                style={{
                  ...btnStyle('#FF85B3'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <MessageCircle size={18} /> Chat on app
              </button>
            )}
          </div>
        </div>

        <div style={{
          marginTop: 20, background: 'white', border: '3px solid #1C1C3A',
          borderRadius: 20, padding: 20, boxShadow: '4px 4px 0 #1C1C3A',
        }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
            Suggest an update
          </div>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
            Wrong info? Suggest a change — admin will review before it goes live.
          </p>
          <form onSubmit={handleSuggestUpdate}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. New price, updated menu, new timing..."
              rows={3}
              style={{
                width: '100%', border: '3px solid #1C1C3A', borderRadius: 16,
                padding: 12, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />
            <button
              type="submit"
              disabled={suggesting || !note.trim()}
              style={{
                background: '#FFD699', border: '3px solid #1C1C3A',
                borderRadius: 50, padding: '10px 20px', fontWeight: 800,
                cursor: suggesting ? 'wait' : 'pointer', fontFamily: 'inherit',
                opacity: suggesting || !note.trim() ? 0.6 : 1,
              }}
            >
              {suggesting ? 'Sending...' : 'Submit suggestion'}
            </button>
          </form>
          {suggestMsg && (
            <p style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#7A6000' }}>
              {suggestMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const badgeStyle = {
  background: '#FFF0F5',
  border: '2px solid #1C1C3A',
  borderRadius: 50,
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 700,
}

function btnStyle(bg) {
  return {
    display: 'block',
    textAlign: 'center',
    textDecoration: 'none',
    width: '100%',
    background: bg,
    color: 'white',
    border: '3px solid #1C1C3A',
    borderRadius: 50,
    padding: '14px 20px',
    fontWeight: 900,
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '4px 4px 0 #1C1C3A',
    boxSizing: 'border-box',
  }
}
