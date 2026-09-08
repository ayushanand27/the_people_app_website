const PROJECT_REF = (import.meta.env.VITE_SUPABASE_URL || '')
  .replace('https://', '')
  .replace('.supabase.co', '')

export default function BackendUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#FFF0F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        maxWidth: 480, background: 'white', border: '3px solid #1C1C3A',
        borderRadius: 20, padding: 28, boxShadow: '6px 6px 0 #1C1C3A',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10, color: '#1C1C3A' }}>
          Backend temporarily unavailable
        </div>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.55, marginBottom: 16 }}>
          The website is up, but our database (Supabase) isn&apos;t responding.
          This usually means the Supabase project is <strong>paused</strong> or was <strong>removed</strong> after inactivity.
        </p>
        <div style={{
          background: '#FFF9C4', border: '2px solid #F1C40F',
          borderRadius: 14, padding: '12px 14px', marginBottom: 20,
          fontSize: 14, fontWeight: 600, color: '#7A6000', lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Fix (project owner):</div>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li>Open Supabase Dashboard → your project</li>
            <li>If <em>Paused</em> → click <strong>Restore project</strong></li>
            <li>If missing → create a new project and re-run migrations</li>
            {PROJECT_REF && (
              <li>Current ref: <code style={{ fontWeight: 800 }}>{PROJECT_REF}</code></li>
            )}
          </ol>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            style={{
              background: '#FF85B3', color: 'white', border: '3px solid #1C1C3A',
              borderRadius: 50, padding: '12px 22px', fontWeight: 900, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '4px 4px 0 #1C1C3A',
            }}
          >
            Retry connection
          </button>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'white', color: '#1C1C3A', border: '3px solid #1C1C3A',
              borderRadius: 50, padding: '12px 22px', fontWeight: 800,
              textDecoration: 'none', fontFamily: 'inherit',
              boxShadow: '4px 4px 0 #1C1C3A',
            }}
          >
            Open Supabase →
          </a>
        </div>
      </div>
    </div>
  )
}
