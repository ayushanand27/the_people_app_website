import { useCallback, useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent } from 'react'
import {
  LISTING_CATEGORIES,
  categoryLabel,
  createListing,
  fetchAdminListings,
  fetchPendingUpdateRequests,
  verifyListing,
  archiveListing,
  approveUpdateRequest,
  rejectUpdateRequest,
  uploadListingImage,
} from '../../lib/localListings'
import { LAUNCH_CITIES } from '../../lib/cities'
import type { Profile, Listing, ListingUpdateRequest } from '../../types'

function cardStyle(bg = 'white'): CSSProperties {
  return {
    background: bg, border: '3px solid #1C1C3A', borderRadius: 16,
    padding: '14px 18px', boxShadow: '3px 3px 0 #1C1C3A',
  }
}

function btn(bg: string, color = 'white'): CSSProperties {
  return {
    background: bg, color, border: '2.5px solid #1C1C3A', borderRadius: 10,
    padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

const inputStyle: CSSProperties = {
  width: '100%', border: '3px solid #1C1C3A', borderRadius: 12,
  padding: '10px 14px', fontSize: 14, fontWeight: 600,
  fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10,
}

interface AdminListingsTabProps {
  profile?: Profile | null
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

export default function AdminListingsTab({ profile, onSuccess, onError }: AdminListingsTabProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [updates, setUpdates] = useState<ListingUpdateRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceText, setPriceText] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('Bangalore')
  const [category, setCategory] = useState('other')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, reqs] = await Promise.all([
        fetchAdminListings(),
        fetchPendingUpdateRequests(),
      ])
      setListings(list)
      setUpdates(reqs)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => { load() }, [load])

  async function handleImagePick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setSaving(true)
    try {
      const urls: string[] = []
      for (const file of files) {
        urls.push(await uploadListingImage(file))
      }
      setImages(prev => [...prev, ...urls])
      onSuccess?.('Images uploaded')
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not upload images')
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!title.trim()) {
      onError?.('Title is required')
      return
    }
    setSaving(true)
    try {
      const row = await createListing({
        title: title.trim(),
        description: description.trim() || null,
        price_text: priceText.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || phone.trim() || null,
        city,
        category,
        images,
        status: 'pending',
        owner_id: null,
      })
      await verifyListing(row.id, profile.id)
      onSuccess?.('Listing created and verified')
      setTitle('')
      setDescription('')
      setPriceText('')
      setPhone('')
      setWhatsapp('')
      setImages([])
      await load()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not create listing')
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify(id: string) {
    if (!profile) return
    setBusyId(id)
    try {
      await verifyListing(id, profile.id)
      onSuccess?.('Listing verified')
      await load()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not verify listing')
    } finally {
      setBusyId(null)
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this listing?')) return
    setBusyId(id)
    try {
      await archiveListing(id)
      onSuccess?.('Listing archived')
      await load()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not archive listing')
    } finally {
      setBusyId(null)
    }
  }

  async function handleApproveUpdate(req: ListingUpdateRequest) {
    if (!profile) return
    setBusyId(req.id)
    try {
      await approveUpdateRequest(req, profile.id)
      onSuccess?.('Update approved')
      await load()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not approve update')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRejectUpdate(id: string) {
    if (!profile) return
    setBusyId(id)
    try {
      await rejectUpdateRequest(id, profile.id)
      onSuccess?.('Update rejected')
      await load()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not reject update')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <div style={{ padding: 24, fontWeight: 700, color: '#888' }}>Loading listings...</div>
  }

  return (
    <div>
      <div style={{ ...cardStyle('#E8D5FF'), marginBottom: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Create verified listing</div>
        <form onSubmit={handleCreate}>
          <input style={inputStyle} placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} required />
          <textarea style={{ ...inputStyle, minHeight: 80 }} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <input style={inputStyle} placeholder="Price (e.g. ₹50/kg, Rent ₹15k)" value={priceText} onChange={e => setPriceText(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <select style={inputStyle} value={city} onChange={e => setCity(e.target.value)}>
              {LAUNCH_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
              {LISTING_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImagePick} style={{ marginTop: 10 }} />
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
              {images.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '2px solid #1C1C3A' }} />
              ))}
            </div>
          )}
          <button type="submit" disabled={saving} style={{ ...btn('#4CAF82'), marginTop: 8, fontSize: 14, padding: '12px 20px' }}>
            {saving ? 'Saving...' : 'Create & verify listing'}
          </button>
        </form>
      </div>

      {updates.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>
            Pending update requests ({updates.length})
          </div>
          {updates.map(req => (
            <div key={req.id} style={{ ...cardStyle('#FFF9C4'), marginBottom: 10 }}>
              <div style={{ fontWeight: 800 }}>{req.local_listings?.title} · {req.local_listings?.city}</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                By {req.submitter?.full_name || req.submitter?.username || 'user'}
              </div>
              <pre style={{ fontSize: 12, background: 'white', padding: 8, borderRadius: 8, marginTop: 8, overflow: 'auto' }}>
                {JSON.stringify(req.changes, null, 2)}
              </pre>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" disabled={busyId === req.id} onClick={() => handleApproveUpdate(req)} style={btn('#4CAF82')}>
                  Approve
                </button>
                <button type="button" disabled={busyId === req.id} onClick={() => handleRejectUpdate(req.id)} style={btn('#FF6B6B')}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>
        All listings ({listings.length})
      </div>
      {listings.map(item => (
        <div key={item.id} style={{ ...cardStyle(), marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 900 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                {categoryLabel(item.category)} · {item.city} · {item.status}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {item.status !== 'verified' && (
                <button type="button" disabled={busyId === item.id} onClick={() => handleVerify(item.id)} style={btn('#4CAF82')}>
                  Verify
                </button>
              )}
              {item.status !== 'archived' && (
                <button type="button" disabled={busyId === item.id} onClick={() => handleArchive(item.id)} style={btn('#999')}>
                  Archive
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
