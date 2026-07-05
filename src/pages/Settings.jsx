import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import CityPicker from '../components/CityPicker'
import { initCityState, resolveCity, isCityValid } from '../lib/cities'
import { LogOut, Save, Camera } from 'lucide-react'

const INTERESTS = [
  'Tech/Coding', 'Art/Design', 'Finance/Investing', 'Movies/Cinema',
  'Travel', 'Books/Reading', 'Gaming', 'Photography',
  'Startups/Entrepreneurship', 'Indie Music', 'Fitness', 'Food',
  'Chess', 'Philosophy', 'Anime', 'Podcasts'
]

export default function Settings({ profile, setProfile }) {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)
  const initialCity = initCityState(profile?.city)

  const [fullName,    setFullName]    = useState(profile?.full_name  || '')
  const [bio,         setBio]         = useState(profile?.bio        || '')
  const [city,        setCity]        = useState(initialCity.city)
  const [customCity,  setCustomCity]  = useState(initialCity.customCity)
  const [interests,   setInterests]   = useState(profile?.interests  || [])
  const [avatarUrl,   setAvatarUrl]   = useState(profile?.avatar_url || '')
  const [loading,     setLoading]     = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')

  function toggleInterest(x) {
    setInterests(prev =>
      prev.includes(x) ? prev.filter(i => i !== x)
      : prev.length < 5 ? [...prev, x] : prev
    )
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB')
      return
    }

    setUploading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const fileExt  = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadErr) {
      setError('Upload failed: ' + uploadErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    setAvatarUrl(publicUrl)

    // Save to profile
    await supabase.from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    setUploading(false)
  }

  async function handleSave() {
    if (!fullName || !isCityValid(city, customCity) || interests.length < 3) {
      setError('Fill all fields, enter your city, and pick at least 3 interests')
      return
    }
    setLoading(true)
    setError('')
    const finalCity = resolveCity(city, customCity)

    const { data, error: err } = await supabase.from('profiles')
      .update({ full_name: fullName, bio, city: finalCity, interests, avatar_url: avatarUrl })
      .eq('id', profile.id).select().single()

    if (err) { setError(err.message); setLoading(false); return }
    setProfile(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const section = (title, children) => (
    <div style={{
      background: 'white', border: '3px solid #1C1C3A',
      borderRadius: 20, padding: 20,
      boxShadow: '5px 5px 0 #1C1C3A', marginBottom: 16
    }}>
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: 100 }}>
      <Navbar active="settings" profile={profile} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>Settings ⚙️</div>
          <div style={{ color: '#888', marginTop: 4 }}>Update your profile</div>
        </div>

        {/* PHOTO UPLOAD */}
        {section('Profile Photo 📸', (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 90, height: 90, borderRadius: 24,
                border: '3px solid #1C1C3A',
                background: avatarUrl ? 'transparent' : '#FF85B3',
                overflow: 'hidden',
                boxShadow: '4px 4px 0 #1C1C3A',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'white', fontWeight: 900, fontSize: 36 }}>
                    {profile?.full_name?.[0] || '?'}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  position: 'absolute', bottom: -6, right: -6,
                  width: 32, height: 32, borderRadius: 10,
                  background: '#FF85B3', border: '2.5px solid #1C1C3A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '2px 2px 0 #1C1C3A'
                }}
              >
                <Camera size={14} color="white" />
              </button>
            </div>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  background: '#FFB3CC', border: '3px solid #1C1C3A',
                  borderRadius: 50, padding: '10px 20px',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  boxShadow: '3px 3px 0 #1C1C3A',
                  fontFamily: 'inherit',
                  opacity: uploading ? 0.6 : 1
                }}
              >
                {uploading ? 'Uploading... ⏳' : 'Upload Photo 📸'}
              </button>
              <div style={{ color: '#aaa', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                Max 5MB · JPG, PNG, GIF
              </div>
            </div>
          </div>
        ))}

        {/* PROFILE INFO */}
        {section('Profile Info', (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Full Name</div>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                style={{
                  width: '100%', border: '3px solid #1C1C3A', borderRadius: 50,
                  padding: '12px 16px', fontSize: 15, fontWeight: 600,
                  background: '#FFF0F5', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box'
                }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Bio</div>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                style={{
                  width: '100%', border: '3px solid #1C1C3A', borderRadius: 20,
                  padding: '12px 16px', fontSize: 15, fontWeight: 600,
                  background: '#FFF0F5', outline: 'none',
                  fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box'
                }} />
            </div>
          </div>
        ))}

        {/* CITY */}
        {section('Your City 📍', (
          <CityPicker
            layout="compact"
            city={city}
            customCity={customCity}
            onCityChange={setCity}
            onCustomCityChange={setCustomCity}
          />
        ))}

        {/* INTERESTS */}
        {section(`Interests 🎯 (${interests.length}/5)`, (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INTERESTS.map(x => (
              <button key={x} onClick={() => toggleInterest(x)} style={{
                padding: '8px 16px', borderRadius: 50,
                border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 13,
                background: interests.includes(x) ? '#FF85B3' : 'white',
                color: interests.includes(x) ? 'white' : '#1C1C3A',
                boxShadow: '2px 2px 0 #1C1C3A', cursor: 'pointer',
                fontFamily: 'inherit'
              }}>{x}</button>
            ))}
          </div>
        ))}

        {/* PREMIUM */}
        <div style={{
          background: '#FFD699', border: '3px solid #1C1C3A',
          borderRadius: 20, padding: 20,
          boxShadow: '5px 5px 0 #1C1C3A', marginBottom: 16
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>⭐ Premium</div>
          <div style={{ color: '#555', fontSize: 14, marginBottom: 14 }}>
            Unlock unlimited matches and exclusive features.
          </div>
          <div style={{
            background: 'white', border: '3px solid #1C1C3A',
            borderRadius: 16, padding: 16, marginBottom: 14
          }}>
            <div style={{ fontWeight: 900, fontSize: 22 }}>₹199 / month</div>
            {['Join up to 5 groups','See who viewed your profile','Priority in discovery','Verified badge'].map(f => (
              <div key={f} style={{ fontSize: 14, color: '#555', marginTop: 6, fontWeight: 600 }}>✓ {f}</div>
            ))}
          </div>
          {profile?.is_premium ? (
            <div style={{
              background: '#B8F0B8', border: '3px solid #4CAF82',
              borderRadius: 14, padding: '12px 16px',
              fontWeight: 900, color: '#1C6B3A', textAlign: 'center'
            }}>✅ You are a Premium member!</div>
          ) : (
            <button style={{
              width: '100%', background: '#FF9F1C', color: 'white',
              border: '3px solid #1C1C3A', borderRadius: 50,
              padding: '14px 20px', fontWeight: 900, fontSize: 16,
              boxShadow: '4px 4px 0 #1C1C3A', cursor: 'pointer',
              fontFamily: 'inherit'
            }}>Upgrade to Premium ⭐</button>
          )}
        </div>

        {error && (
          <div style={{
            background: '#FFE0E0', border: '3px solid #FF6B6B',
            borderRadius: 14, padding: '12px 16px',
            fontWeight: 700, color: '#CC0000', marginBottom: 14
          }}>{error}</div>
        )}

        <button onClick={handleSave} disabled={loading} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          background: saved ? '#4CAF82' : '#FF85B3', color: 'white',
          border: '3px solid #1C1C3A', borderRadius: 50,
          padding: '16px 20px', fontWeight: 900, fontSize: 17,
          boxShadow: '5px 5px 0 #1C1C3A', cursor: 'pointer',
          marginBottom: 12, opacity: loading ? 0.6 : 1,
          fontFamily: 'inherit', transition: 'all 0.2s'
        }}>
          <Save size={20} />
          {loading ? 'Saving...' : saved ? 'Saved! ✅' : 'Save Changes'}
        </button>

        <button onClick={handleLogout} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          background: 'white', color: '#CC0000',
          border: '3px solid #1C1C3A', borderRadius: 50,
          padding: '16px 20px', fontWeight: 900, fontSize: 17,
          boxShadow: '5px 5px 0 #1C1C3A', cursor: 'pointer',
          marginBottom: 32, fontFamily: 'inherit'
        }}>
          <LogOut size={20} /> Log Out
        </button>

        {/* ADMIN PANEL LINK — only for admin users (profiles.is_admin) */}
        {profile?.is_admin && (
          <button onClick={() => navigate('/admin')} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8,
            background: '#1C1C3A', color: 'white',
            border: '3px solid #1C1C3A', borderRadius: 50,
            padding: '16px 20px', fontWeight: 900, fontSize: 17,
            boxShadow: '5px 5px 0 #FF85B3', cursor: 'pointer',
            marginBottom: 12, fontFamily: 'inherit'
          }}>
            ⚙️ Admin Panel
          </button>
        )}

      </div>
    </div>
  )
}
