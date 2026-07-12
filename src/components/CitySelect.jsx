import { useEffect, useRef, useState } from 'react'
import { LAUNCH_CITIES } from '../lib/cities'
import { ChevronDown } from 'lucide-react'

export default function CitySelect({ value, onChange, compact = false, label }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 800, color: '#666', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: '2.5px solid #8A8AA8',
          borderRadius: 12,
          padding: compact ? '7px 10px' : '8px 12px',
          fontSize: 13,
          fontWeight: 800,
          fontFamily: 'inherit',
          background: 'white',
          color: '#5A5A78',
          boxShadow: '2px 2px 0 #8A8AA8',
          cursor: 'pointer',
          outline: 'none',
          minWidth: compact ? 118 : 140,
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{value || 'City'}</span>
        <ChevronDown size={16} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 80,
            minWidth: '100%',
            background: 'white',
            border: '2.5px solid #8A8AA8',
            borderRadius: 12,
            boxShadow: '4px 4px 0 #8A8AA8',
            overflow: 'hidden',
          }}
        >
          {LAUNCH_CITIES.map(c => {
            const selected = c === value
            return (
              <button
                key={c}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  background: selected ? '#FFD0E4' : 'white',
                  color: selected ? '#5A5A78' : '#8A8AA8',
                  fontWeight: 800,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  if (!selected) e.currentTarget.style.background = '#FFF7FA'
                }}
                onMouseLeave={e => {
                  if (!selected) e.currentTarget.style.background = 'white'
                }}
              >
                {c}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
