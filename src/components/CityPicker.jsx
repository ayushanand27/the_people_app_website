import { CITIES } from '../lib/cities'

const BG = ['#FFB3CC', '#B8F0B8', '#B3E5FC', '#FFD699', '#E8D5FF', '#FFE566']

const inputStyle = {
  width: '100%', border: '3px solid #8A8AA8', borderRadius: 50,
  padding: '12px 16px', fontSize: 15, fontWeight: 600,
  background: '#FFFCFD', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function CityPicker({
  city,
  customCity,
  onCityChange,
  onCustomCityChange,
  layout = 'grid',
}) {
  if (layout === 'select') {
    return (
      <div>
        <select
          value={city}
          onChange={e => onCityChange(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select city</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {city === 'Other' && (
          <input
            type="text"
            placeholder="Enter your city (e.g. Begusarai)"
            value={customCity}
            onChange={e => onCustomCityChange(e.target.value)}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: layout === 'compact' ? 'repeat(3, 1fr)' : '1fr 1fr',
        gap: 10,
      }}>
        {CITIES.map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => onCityChange(c)}
            style={{
              padding: layout === 'compact' ? '10px 8px' : '14px 10px',
              borderRadius: layout === 'compact' ? 14 : 16,
              border: '3px solid #8A8AA8', fontWeight: 700,
              fontSize: layout === 'compact' ? 13 : 14,
              background: city === c ? '#FFB0D0' : BG[i % BG.length],
              color: city === c ? 'white' : '#8A8AA8',
              boxShadow: city === c ? '4px 4px 0 #8A8AA8' : '3px 3px 0 #8A8AA8',
              cursor: 'pointer', fontFamily: 'inherit',
              transform: city === c ? 'translate(-2px,-2px)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {c}
          </button>
        ))}
      </div>
      {city === 'Other' && (
        <input
          type="text"
          placeholder="Enter your city (e.g. Begusarai)"
          value={customCity}
          onChange={e => onCustomCityChange(e.target.value)}
          style={{ ...inputStyle, marginTop: 12 }}
        />
      )}
    </div>
  )
}
