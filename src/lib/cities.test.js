import { describe, it, expect } from 'vitest'
import { getBrowseCity, resolveCity, isCityValid, setBrowseCity, normalizeCity } from './cities'

describe('normalizeCity', () => {
  it('canonicalizes known cities case-insensitively', () => {
    expect(normalizeCity('begusarai')).toBe('Begusarai')
    expect(normalizeCity('BANGALORE')).toBe('Bangalore')
  })
})

describe('getBrowseCity', () => {
  it('prefers a valid launch city stored in localStorage', () => {
    localStorage.setItem('peopleapp_browse_city', 'Patna')
    expect(getBrowseCity('Bangalore')).toBe('Patna')
  })

  it('falls back to profile city then default launch city', () => {
    expect(getBrowseCity('Jaipur')).toBe('Jaipur')
    expect(getBrowseCity('begusarai')).toBe('Begusarai')
    expect(getBrowseCity('')).toBe('Bangalore')
  })
})

describe('resolveCity / isCityValid', () => {
  it('resolves custom city when Other is selected', () => {
    expect(resolveCity('Other', '  Kochi ')).toBe('Kochi')
    expect(isCityValid('Other', 'Kochi')).toBe(true)
    expect(isCityValid('Other', 'K')).toBe(false)
  })
})

describe('setBrowseCity', () => {
  it('persists city and dispatches browse-city-changed', () => {
    const seen = []
    window.addEventListener('browse-city-changed', (e) => seen.push(e.detail))
    setBrowseCity('Begusarai')
    expect(localStorage.getItem('peopleapp_browse_city')).toBe('Begusarai')
    expect(seen).toEqual(['Begusarai'])
  })
})
