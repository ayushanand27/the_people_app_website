import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Search } from 'lucide-react'
import { useBrowseCity } from '../hooks/useBrowseCity'
import {
  LISTING_CATEGORIES,
  categoryEmoji,
  categoryLabel,
  fetchVerifiedListings,
} from '../lib/localListings'

const BG = ['#FFB3CC', '#B8F0B8', '#B3E5FC', '#FFD699', '#E8D5FF', '#FFE566']

export default function Local({ profile }) {
  const navigate = useNavigate()
  const browseCity = useBrowseCity(profile?.city)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchVerifiedListings({
        city: browseCity,
        category,
        search,
      })
      setListings(data)
    } catch {
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [browseCity, category, search])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ minHeight: '100vh', background: '#FFFCFD', paddingBottom: 100 }}>
      <Navbar active="local" profile={profile} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{
          background: '#4CAF82', border: '3px solid #8A8AA8',
          borderRadius: 24, padding: '22px 24px',
          boxShadow: '6px 6px 0 #8A8AA8', marginBottom: 20,
        }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'white' }}>
            Local near you 🏪
          </div>
          <div style={{ color: 'rgba(255,255,255,0.9)', marginTop: 6, fontSize: 15 }}>
            Verified shops, hotels, services in {browseCity}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'white', border: '3px solid #8A8AA8',
          borderRadius: 50, padding: '12px 18px', marginBottom: 16,
          boxShadow: '4px 4px 0 #8A8AA8',
        }}>
          <Search size={20} color="#888" />
          <input
            type="search"
            placeholder="Search listings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15,
              fontWeight: 600, fontFamily: 'inherit', background: 'transparent',
            }}
          />
        </div>

        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16,
        }}>
          <button
            type="button"
            onClick={() => setCategory('all')}
            style={chipStyle(category === 'all')}
          >
            All
          </button>
          {LISTING_CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              style={chipStyle(category === c.id)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontWeight: 700 }}>
            Loading local listings...
          </div>
        ) : listings.length === 0 ? (
          <div style={{
            background: 'white', border: '3px solid #8A8AA8',
            borderRadius: 20, padding: '36px 20px', textAlign: 'center',
            boxShadow: '4px 4px 0 #8A8AA8',
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>No listings in {browseCity} yet</div>
            <div style={{ color: '#aaa', marginTop: 6, fontSize: 14 }}>
              Check back soon or list your business in Settings
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {listings.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/local/${item.id}`)}
                style={{
                  background: BG[i % BG.length],
                  border: '3px solid #8A8AA8', borderRadius: 20,
                  padding: 0, textAlign: 'left', cursor: 'pointer',
                  boxShadow: '5px 5px 0 #8A8AA8', overflow: 'hidden',
                }}
              >
                {item.images?.[0] && (
                  <img
                    src={item.images[0]}
                    alt=""
                    style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                  />
                )}
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      background: 'white', border: '2px solid #8A8AA8',
                      borderRadius: 50, padding: '2px 10px',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {categoryEmoji(item.category)} {categoryLabel(item.category)}
                    </span>
                    <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>✓ Verified</span>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 17, color: '#5A5A78' }}>{item.title}</div>
                  {item.price_text && (
                    <div style={{ fontWeight: 800, color: '#4CAF82', marginTop: 6, fontSize: 15 }}>
                      {item.price_text}
                    </div>
                  )}
                  {item.description && (
                    <div style={{ color: '#555', fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
                      {item.description.slice(0, 100)}{item.description.length > 100 ? '…' : ''}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function chipStyle(active) {
  return {
    flexShrink: 0,
    padding: '8px 14px',
    borderRadius: 50,
    border: '3px solid #8A8AA8',
    background: active ? '#FFB0D0' : 'white',
    color: active ? 'white' : '#8A8AA8',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: active ? '3px 3px 0 #8A8AA8' : '2px 2px 0 #8A8AA8',
  }
}
