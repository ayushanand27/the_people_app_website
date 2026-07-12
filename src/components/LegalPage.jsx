import { Link } from 'react-router-dom'

export default function LegalPage({ title, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFCFD', padding: '24px 16px 48px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Link
          to="/"
          style={{
            display: 'inline-block', marginBottom: 20,
            color: '#FF6B9D', fontWeight: 800, textDecoration: 'none',
          }}
        >
          ← Back to The People App
        </Link>
        <div style={{
          background: 'white', border: '3px solid #8A8AA8',
          borderRadius: 20, padding: '28px 24px',
          boxShadow: '6px 6px 0 #8A8AA8',
        }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{title}</h1>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
            Last updated: July 2026
          </p>
          <div style={{ color: '#333', fontSize: 15, lineHeight: 1.7 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
