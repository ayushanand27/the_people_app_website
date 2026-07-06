export default function InlineError({ message, onRetry }) {
  if (!message) return null
  return (
    <div style={{
      background: 'white', border: '3px solid #1C1C3A',
      borderRadius: 16, padding: '16px 18px', marginBottom: 16,
      boxShadow: '4px 4px 0 #1C1C3A',
    }}>
      <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>Something went wrong</div>
      <div style={{ color: '#888', fontSize: 13, marginBottom: onRetry ? 12 : 0 }}>{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: '#FF85B3', color: 'white', border: '2.5px solid #1C1C3A',
            borderRadius: 50, padding: '8px 18px', fontWeight: 800, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', boxShadow: '2px 2px 0 #1C1C3A',
          }}
        >
          Try again
        </button>
      )}
    </div>
  )
}
