import { LAUNCH_CITIES } from '../lib/cities'

export default function CitySelect({ value, onChange, compact = false, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 800, color: '#666', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: '2.5px solid #1C1C3A',
          borderRadius: 12,
          padding: '6px 10px',
          fontSize: 12,
          fontWeight: 800,
          fontFamily: 'inherit',
          background: 'white',
          color: '#1C1C3A',
          boxShadow: '2px 2px 0 #1C1C3A',
          cursor: 'pointer',
          outline: 'none',
          maxWidth: compact ? 120 : 160,
        }}
        aria-label="Choose city"
      >
        {LAUNCH_CITIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  )
}
