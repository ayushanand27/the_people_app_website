export default function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FFFCFD', padding: 24,
    }}>
      <div style={{
        background: 'white', border: '3px solid #8A8AA8', borderRadius: 20,
        boxShadow: '5px 5px 0 #8A8AA8', padding: '40px 32px', maxWidth: 420,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😵</div>
        <h1 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: '#5A5A78' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
          We hit an unexpected error. Try refreshing the page — if it keeps happening, come back a little later.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#FFB0D0', color: 'white', border: '3px solid #8A8AA8',
            borderRadius: 50, padding: '12px 28px', fontWeight: 900, fontSize: 15,
            boxShadow: '4px 4px 0 #8A8AA8', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Refresh page
        </button>
      </div>
    </div>
  )
}
