import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'
import { useNavigate } from 'react-router-dom'
import CityPicker from '../components/CityPicker'
import { resolveCity, isCityValid } from '../lib/cities'

const INTERESTS = [
  'Tech/Coding', 'Art/Design', 'Finance/Investing', 'Movies/Cinema',
  'Travel', 'Books/Reading', 'Gaming', 'Photography',
  'Startups/Entrepreneurship', 'Indie Music', 'Fitness', 'Food',
  'Chess', 'Philosophy', 'Anime', 'Podcasts'
]

const BG = ['#FFB3CC','#B8F0B8','#B3E5FC','#FFD699','#E8D5FF','#FFE566']

export default function Onboarding({ profile, setProfile }) {
  const navigate = useNavigate()
  const [step,      setStep]      = useState(1)
  const [fullName,  setFullName]  = useState(profile?.full_name || '')
  const [username,  setUsername]  = useState('')
  const [bio,       setBio]       = useState('')
  const [city,      setCity]      = useState('')
  const [customCity, setCustomCity] = useState('')
  const [interests, setInterests] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  function toggleInterest(x) {
    setInterests(prev =>
      prev.includes(x) ? prev.filter(i => i !== x)
      : prev.length < 5 ? [...prev, x] : prev
    )
  }

  async function handleFinish() {
    const finalCity = resolveCity(city, customCity)
    if (!fullName || !username || !isCityValid(city, customCity) || interests.length < 3) {
      setError('Please fill all fields, enter your city, and pick at least 3 interests')
      return
    }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase.from('profiles')
      .update({
        full_name: fullName,
        username: username.toLowerCase().replace(/\s/g, ''),
        bio, city: finalCity, interests,
        onboarding_complete: true
      })
      .eq('id', user.id).select().single()
    if (err) { setError(err.message); setLoading(false); return }
    setProfile(data)
    track('onboarding_complete', { user_id: user.id })
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FFFCFD',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* PROGRESS BAR */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{
              flex: 1, height: 12, borderRadius: 50,
              border: '2.5px solid #8A8AA8',
              background: step >= s ? '#FFB0D0' : 'white',
              boxShadow: step >= s ? '2px 2px 0 #8A8AA8' : 'none',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>

        <div style={{
          background: 'white', border: '3px solid #8A8AA8',
          borderRadius: 24, padding: 32,
          boxShadow: '7px 7px 0 #8A8AA8'
        }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>Tell us about you 👋</div>
              <div style={{ color: '#888', fontSize: 15, marginBottom: 24 }}>This is how people will find you</div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Full Name</div>
                <input
                  type="text" placeholder="Your full name"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  style={{
                    width: '100%', border: '3px solid #8A8AA8', borderRadius: 50,
                    padding: '14px 20px', fontSize: 15, fontWeight: 600,
                    background: '#FFFCFD', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Username</div>
                <input
                  type="text" placeholder="@yourname"
                  value={username} onChange={e => setUsername(e.target.value)}
                  style={{
                    width: '100%', border: '3px solid #8A8AA8', borderRadius: 50,
                    padding: '14px 20px', fontSize: 15, fontWeight: 600,
                    background: '#FFFCFD', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                  Bio <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span>
                </div>
                <textarea
                  placeholder="Tell people who you are..."
                  value={bio} onChange={e => setBio(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', border: '3px solid #8A8AA8', borderRadius: 20,
                    padding: '14px 20px', fontSize: 15, fontWeight: 600,
                    background: '#FFFCFD', outline: 'none', fontFamily: 'inherit',
                    resize: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              {error && <div style={{ background: '#FFE0E0', border: '2px solid #FF6B6B', borderRadius: 14, padding: '10px 16px', color: '#CC0000', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{error}</div>}

              <button
                onClick={() => fullName && username ? (setError(''), setStep(2)) : setError('Fill in your name and username')}
                style={{
                  width: '100%', background: '#FFB0D0', color: 'white',
                  border: '3px solid #8A8AA8', borderRadius: 50,
                  padding: '16px 20px', fontWeight: 900, fontSize: 17,
                  boxShadow: '5px 5px 0 #8A8AA8', cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >Next →</button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>Where are you? 📍</div>
              <div style={{ color: '#888', fontSize: 15, marginBottom: 24 }}>We'll find people in your city</div>

              <CityPicker
                city={city}
                customCity={customCity}
                onCityChange={setCity}
                onCustomCityChange={setCustomCity}
              />

              {error && <div style={{ background: '#FFE0E0', border: '2px solid #FF6B6B', borderRadius: 14, padding: '10px 16px', color: '#CC0000', fontWeight: 700, fontSize: 14, marginBottom: 16, marginTop: 16 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, background: 'white', color: '#5A5A78',
                  border: '3px solid #8A8AA8', borderRadius: 50,
                  padding: '16px 20px', fontWeight: 900, fontSize: 17,
                  boxShadow: '4px 4px 0 #8A8AA8', cursor: 'pointer',
                  fontFamily: 'inherit'
                }}>← Back</button>
                <button
                  onClick={() => isCityValid(city, customCity) ? (setError(''), setStep(3)) : setError(city === 'Other' ? 'Enter your city name' : 'Pick a city')}
                  style={{
                    flex: 2, background: '#FFB0D0', color: 'white',
                    border: '3px solid #8A8AA8', borderRadius: 50,
                    padding: '16px 20px', fontWeight: 900, fontSize: 17,
                    boxShadow: '5px 5px 0 #8A8AA8', cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >Next →</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Your interests 🎯</div>
              <div style={{ color: '#888', fontSize: 15, marginBottom: 4 }}>Pick 3 to 5 things you love</div>
              <div style={{
                display: 'inline-block',
                background: '#FFB3CC', border: '2px solid #8A8AA8',
                borderRadius: 50, padding: '4px 14px',
                fontWeight: 700, fontSize: 13, marginBottom: 20
              }}>{interests.length}/5 selected</div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {INTERESTS.map((x, i) => (
                  <button key={x} onClick={() => toggleInterest(x)} style={{
                    padding: '10px 18px', borderRadius: 50,
                    border: '3px solid #8A8AA8', fontWeight: 700, fontSize: 13,
                    background: interests.includes(x) ? '#FFB0D0' : BG[i % BG.length],
                    color: interests.includes(x) ? 'white' : '#8A8AA8',
                    boxShadow: interests.includes(x) ? '4px 4px 0 #8A8AA8' : '2px 2px 0 #8A8AA8',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transform: interests.includes(x) ? 'translate(-1px,-1px)' : 'none',
                    transition: 'all 0.15s'
                  }}>{x}</button>
                ))}
              </div>

              {error && <div style={{ background: '#FFE0E0', border: '2px solid #FF6B6B', borderRadius: 14, padding: '10px 16px', color: '#CC0000', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(2)} style={{
                  flex: 1, background: 'white', color: '#5A5A78',
                  border: '3px solid #8A8AA8', borderRadius: 50,
                  padding: '16px 20px', fontWeight: 900, fontSize: 17,
                  boxShadow: '4px 4px 0 #8A8AA8', cursor: 'pointer',
                  fontFamily: 'inherit'
                }}>← Back</button>
                <button
                  onClick={handleFinish} disabled={loading}
                  style={{
                    flex: 2, background: '#4CAF82', color: 'white',
                    border: '3px solid #8A8AA8', borderRadius: 50,
                    padding: '16px 20px', fontWeight: 900, fontSize: 17,
                    boxShadow: '5px 5px 0 #8A8AA8', cursor: 'pointer',
                    fontFamily: 'inherit', opacity: loading ? 0.6 : 1
                  }}
                >{loading ? 'Saving...' : "Let's go 🚀"}</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
