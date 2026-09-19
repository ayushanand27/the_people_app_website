import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import type { Profile } from '../types'

interface NotFoundProps {
  profile?: Profile | null
}

export default function NotFound({ profile }: NotFoundProps) {
  const home = profile?.onboarding_complete ? '/dashboard' : '/'

  return (
    <div style={{ minHeight: '100vh', background: '#FFF0F5', paddingBottom: profile ? 100 : 0 }}>
      {profile ? <Navbar profile={profile} /> : null}
      <div style={{
        maxWidth: 440, margin: '0 auto', padding: profile ? '48px 20px' : '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, background: '#FF85B3',
          border: '4px solid #1C1C3A', borderRadius: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: 36,
          boxShadow: '6px 6px 0 #1C1C3A', margin: '0 auto 16px',
        }}>?</div>
        <div style={{ fontWeight: 900, fontSize: 28, marginBottom: 8 }}>Page not found</div>
        <div style={{ color: '#666', fontWeight: 600, fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
          That link doesn’t exist. Head back and keep exploring.
        </div>
        <Link
          to={home}
          style={{
            display: 'inline-block', background: '#FF85B3', color: 'white',
            border: '3px solid #1C1C3A', borderRadius: 50,
            padding: '14px 28px', fontWeight: 900, fontSize: 16,
            boxShadow: '4px 4px 0 #1C1C3A', textDecoration: 'none',
          }}
        >
          {profile ? 'Go to home →' : 'Back to home →'}
        </Link>
      </div>
    </div>
  )
}
