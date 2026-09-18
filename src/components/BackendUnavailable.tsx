const PROJECT_REF = (import.meta.env.VITE_SUPABASE_URL || '')
  .replace('https://', '')
  .replace('http://', '')
  .replace('.supabase.co', '')

export default function BackendUnavailable({
  onRetry,
  reason,
}: {
  onRetry?: () => void
  reason?: 'missing_config' | 'unreachable'
}) {
  const misconfigured = reason === 'missing_config'

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
          {misconfigured ? 'App is missing database config' : 'Cannot reach the database'}
        </div>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.55, marginBottom: 16 }}>
          {misconfigured ? (
            <>
              This build was shipped without <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code>. That is a deploy setting, not a paused project.
              Add both in Vercel → Project → Settings → Environment Variables (Production and Preview),
              then redeploy.
            </>
          ) : (
            <>
              The website loaded, but this device could not talk to Supabase.
              That can be a paused project, a network / ad-blocker, or a first-load timeout —
              not necessarily that the database was removed.
            </>
          )}
        </p>
        <div style={{
          background: '#FFF9C4', border: '2px solid #F1C40F',
          borderRadius: 14, padding: '12px 14px', marginBottom: 20,
          fontSize: 14, fontWeight: 600, color: '#7A6000', lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Fix (project owner):</div>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {misconfigured ? (
              <>
                <li>Vercel → Settings → Environment Variables</li>
                <li>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code></li>
                <li>Redeploy the site (Vite bakes these in at build time)</li>
              </>
            ) : (
              <>
                <li>Open Supabase Dashboard → your project</li>
                <li>If <em>Paused</em> → click <strong>Restore project</strong></li>
                <li>Confirm Auth redirect URLs include this site&apos;s origin</li>
                <li>Retry on this device (disable ad-block for this site if needed)</li>
                {PROJECT_REF && (
                  <li>Current ref: <code style={{ fontWeight: 800 }}>{PROJECT_REF}</code></li>
                )}
              </>
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
