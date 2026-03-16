import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const INTERESTS = [
  'Tech/Coding', 'Art/Design', 'Finance/Investing', 'Movies/Cinema',
  'Travel', 'Books/Reading', 'Gaming', 'Photography',
  'Startups/Entrepreneurship', 'Indie Music', 'Fitness', 'Food',
  'Chess', 'Philosophy', 'Anime', 'Podcasts'
]

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Surat', 'Other'
]

export default function Onboarding({ profile, setProfile }) {
  const navigate  = useNavigate()
  const [step,       setStep]       = useState(1)
  const [fullName,   setFullName]   = useState(profile?.full_name || '')
  const [username,   setUsername]   = useState('')
  const [bio,        setBio]        = useState('')
  const [city,       setCity]       = useState('')
  const [interests,  setInterests]  = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  function toggleInterest(interest) {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 5
          ? [...prev, interest]
          : prev
    )
  }

  async function handleFinish() {
    if (!fullName || !username || !city || interests.length < 3) {
      setError('Please fill all fields and pick at least 3 interests')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error: err } = await supabase
      .from('profiles')
      .update({
        full_name:            fullName,
        username:             username.toLowerCase().replace(/\s/g, ''),
        bio,
        city,
        interests,
        onboarding_complete:  true
      })
      .eq('id', user.id)
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setProfile(data)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* PROGRESS BAR */}
        <div className="flex gap-2 mb-8">
          {[1,2,3].map(s => (
            <div key={s} className={`flex-1 h-3 rounded-full border-2 border-gray-900 transition-all ${step >= s ? 'bg-pink-400' : 'bg-white'}`}/>
          ))}
        </div>

        <div className="bg-white border-4 border-gray-900 rounded-3xl p-8 shadow-[6px_6px_0px_#1C1C3A]">

          {/* STEP 1 — NAME + USERNAME */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-black mb-2">Tell us about you 👋</h2>
              <p className="text-gray-500 mb-6">This is how people will find you</p>

              <div className="space-y-4">
                <div>
                  <label className="font-bold text-sm mb-1 block">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full border-3 border-gray-900 rounded-2xl px-4 py-3 bg-pink-50 font-medium focus:outline-none focus:border-pink-400 transition-all"
                  />
                </div>
                <div>
                  <label className="font-bold text-sm mb-1 block">Username</label>
                  <input
                    type="text"
                    placeholder="@yourname"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full border-3 border-gray-900 rounded-2xl px-4 py-3 bg-pink-50 font-medium focus:outline-none focus:border-pink-400 transition-all"
                  />
                </div>
                <div>
                  <label className="font-bold text-sm mb-1 block">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    placeholder="Tell people who you are..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                    className="w-full border-3 border-gray-900 rounded-2xl px-4 py-3 bg-pink-50 font-medium focus:outline-none focus:border-pink-400 transition-all resize-none"
                  />
                </div>
              </div>

              <button
                onClick={() => fullName && username ? setStep(2) : setError('Fill name and username')}
                className="w-full mt-6 bg-pink-400 text-white border-3 border-gray-900 rounded-2xl py-3 font-black text-lg shadow-[4px_4px_0px_#1C1C3A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#1C1C3A] transition-all"
              >
                Next →
              </button>
            </div>
          )}

          {/* STEP 2 — CITY */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-black mb-2">Where are you? 📍</h2>
              <p className="text-gray-500 mb-6">We'll find people in your city</p>

              <div className="grid grid-cols-2 gap-3">
                {CITIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className={`py-3 px-4 rounded-2xl border-3 border-gray-900 font-bold text-sm transition-all shadow-[3px_3px_0px_#1C1C3A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1C1C3A]
                      ${city === c ? 'bg-pink-400 text-white' : 'bg-white text-gray-800'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white border-3 border-gray-900 rounded-2xl py-3 font-black shadow-[3px_3px_0px_#1C1C3A] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => city ? setStep(3) : setError('Pick a city')}
                  className="flex-1 bg-pink-400 text-white border-3 border-gray-900 rounded-2xl py-3 font-black shadow-[4px_4px_0px_#1C1C3A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#1C1C3A] transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — INTERESTS */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-black mb-2">Your interests 🎯</h2>
              <p className="text-gray-500 mb-1">Pick 3 to 5 things you love</p>
              <p className="text-pink-400 font-bold text-sm mb-6">{interests.length}/5 selected</p>

              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`py-2 px-4 rounded-full border-3 border-gray-900 font-bold text-sm transition-all shadow-[2px_2px_0px_#1C1C3A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#1C1C3A]
                      ${interests.includes(interest) ? 'bg-pink-400 text-white' : 'bg-white text-gray-800'}`}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border-2 border-red-400 rounded-2xl px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-white border-3 border-gray-900 rounded-2xl py-3 font-black shadow-[3px_3px_0px_#1C1C3A] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 bg-green-400 text-white border-3 border-gray-900 rounded-2xl py-3 font-black shadow-[4px_4px_0px_#1C1C3A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#1C1C3A] transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : "Let's go 🚀"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
