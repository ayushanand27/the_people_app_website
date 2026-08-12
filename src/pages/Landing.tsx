import { useNavigate } from 'react-router-dom'
import { LAUNCH_CITIES } from '../lib/cities'

const FEATURES = [
  { title: 'Find your people', blurb: 'Interest-based discovery — your city first, then beyond.', bg: '#FFB3CC' },
  { title: 'City communities', blurb: 'Join groups and RSVP to local events happening near you.', bg: '#B8F0B8' },
  { title: 'Local spots', blurb: 'Verified shops, food, and services you can actually use.', bg: '#B3E5FC' },
  { title: 'Safer chat', blurb: 'Filters, report, and block — so conversations stay kind.', bg: '#FFD699' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', color: '#1C1C3A' }}>
      {/* atmosphere */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 10% -10%, rgba(255,133,179,0.45), transparent 55%),
          radial-gradient(ellipse 60% 40% at 90% 20%, rgba(184,240,184,0.35), transparent 50%),
          radial-gradient(ellipse 50% 40% at 50% 100%, rgba(179,229,252,0.3), transparent 55%)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{
          maxWidth: 960, margin: '0 auto', padding: '20px 20px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, background: '#FF85B3',
              border: '3px solid #1C1C3A', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 22,
              boxShadow: '4px 4px 0 #1C1C3A',
            }}>P</div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>The People App</div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/auth')}
            style={{
              background: 'white', color: '#1C1C3A',
              border: '3px solid #1C1C3A', borderRadius: 50,
              padding: '10px 18px', fontWeight: 800, fontSize: 14,
              boxShadow: '3px 3px 0 #1C1C3A', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Log in
          </button>
        </header>

        {/* hero — brand first, one composition */}
        <section style={{
          maxWidth: 720, margin: '0 auto',
          padding: '56px 20px 48px',
          textAlign: 'center',
        }}>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(36px, 8vw, 56px)',
            lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 16,
            animation: 'peopleFadeUp 0.7s ease-out both',
          }}>
            The People App
          </div>
          <h1 style={{
            fontWeight: 900, fontSize: 'clamp(22px, 4.5vw, 30px)',
            lineHeight: 1.25, marginBottom: 12,
            animation: 'peopleFadeUp 0.7s ease-out 0.08s both',
          }}>
            Stop scrolling. Start belonging.
          </h1>
          <p style={{
            color: '#666', fontSize: 17, fontWeight: 600, lineHeight: 1.5,
            maxWidth: 480, margin: '0 auto 28px',
            animation: 'peopleFadeUp 0.7s ease-out 0.16s both',
          }}>
            Find people by interests, join city groups & events, explore verified local spots, and chat safely.
          </p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
            animation: 'peopleFadeUp 0.7s ease-out 0.24s both',
          }}>
            <button
              type="button"
              onClick={() => navigate('/auth?mode=signup')}
              style={{
                background: '#FF85B3', color: 'white',
                border: '3px solid #1C1C3A', borderRadius: 50,
                padding: '16px 28px', fontWeight: 900, fontSize: 17,
                boxShadow: '5px 5px 0 #1C1C3A', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Join free →
            </button>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                background: 'white', color: '#1C1C3A',
                border: '3px solid #1C1C3A', borderRadius: 50,
                padding: '16px 28px', fontWeight: 900, fontSize: 17,
                boxShadow: '5px 5px 0 #1C1C3A', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              I have an account
            </button>
          </div>
          <div style={{
            marginTop: 28, color: '#888', fontSize: 14, fontWeight: 700,
            animation: 'peopleFadeUp 0.7s ease-out 0.32s both',
          }}>
            Soft launching in {LAUNCH_CITIES.join(' · ')}
          </div>
        </section>

        <section style={{
          maxWidth: 960, margin: '0 auto', padding: '8px 20px 64px',
        }}>
          <div style={{
            fontWeight: 900, fontSize: 22, marginBottom: 8, textAlign: 'center',
          }}>
            Built for real connection
          </div>
          <p style={{
            color: '#888', fontWeight: 600, textAlign: 'center',
            marginBottom: 24, fontSize: 15,
          }}>
            Everything you need to meet people where you live — without the doomscroll.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{
                  background: f.bg,
                  border: '3px solid #1C1C3A',
                  borderRadius: 20,
                  padding: 20,
                  boxShadow: '5px 5px 0 #1C1C3A',
                  animation: `peopleFadeUp 0.6s ease-out ${0.1 + i * 0.06}s both`,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 8 }}>{f.title}</div>
                <div style={{ color: '#444', fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>
                  {f.blurb}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer style={{
          borderTop: '3px solid #1C1C3A',
          background: 'white',
          padding: '20px',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: '#888',
        }}>
          <div style={{ marginBottom: 8 }}>Still building · feedback welcome</div>
          <a href="/privacy" style={{ color: '#FF85B3', fontWeight: 800, textDecoration: 'none' }}>Privacy</a>
          {' · '}
          <a href="/terms" style={{ color: '#FF85B3', fontWeight: 800, textDecoration: 'none' }}>Terms</a>
        </footer>
      </div>

      <style>{`
        @keyframes peopleFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
