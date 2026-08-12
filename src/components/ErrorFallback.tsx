export default function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FFF0F5', padding: 24,
    }}>
      <div style={{
        background: 'white', border: '3px solid #1C1C3A', borderRadius: 20,
        boxShadow: '5px 5px 0 #1C1C3A', padding: '40px 32px', maxWidth: 420,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😵</div>
        <h1 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: '#1C1C3A' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
          We hit an unexpected error. Try refreshing the page — if it keeps happening, come back a little later.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#FF85B3', color: 'white', border: '3px solid #1C1C3A',
            borderRadius: 50, padding: '12px 28px', fontWeight: 900, fontSize: 15,
            boxShadow: '4px 4px 0 #1C1C3A', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Refresh page
        </button>
      </div>
    </div>
  )
}
