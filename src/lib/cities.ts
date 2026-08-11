export const PRESET_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Begusarai', 'Patna', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Surat',
]

export const LAUNCH_CITIES = ['Bangalore', 'Begusarai', 'Patna', 'Jaipur']

export const CITIES = [...PRESET_CITIES, 'Other']

const BROWSE_KEY = 'peopleapp_browse_city'

export interface CityState {
  city: string
  customCity: string
}

/** Canonical city name (case-insensitive match to presets) */
export function normalizeCity(raw = ''): string {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  const known = PRESET_CITIES.find(c => c.toLowerCase() === trimmed.toLowerCase())
  if (known) return known
  return trimmed.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

export function initCityState(savedCity = ''): CityState {
  const city = normalizeCity(savedCity)
  if (!city) return { city: '', customCity: '' }
  if (PRESET_CITIES.includes(city)) return { city, customCity: '' }
  return { city: 'Other', customCity: city }
}

export function resolveCity(city?: string, customCity?: string): string {
  if (city === 'Other') return normalizeCity(customCity)
  return normalizeCity(city)
}

export function isCityValid(city?: string, customCity?: string): boolean {
  const resolved = resolveCity(city, customCity)
  return resolved.length >= 2
}

export function getBrowseCity(profileCity = ''): string {
  const stored = normalizeCity(localStorage.getItem(BROWSE_KEY) || '')
  if (stored && (LAUNCH_CITIES.includes(stored) || PRESET_CITIES.includes(stored))) {
    return stored
  }
  const profile = normalizeCity(profileCity)
  if (profile && LAUNCH_CITIES.includes(profile)) return profile
  if (profile && PRESET_CITIES.includes(profile)) {
    // Profile outside launch set — still prefer a launch city for browse
    return LAUNCH_CITIES.includes(profile) ? profile : LAUNCH_CITIES[0]
  }
  return LAUNCH_CITIES[0]
}

export function setBrowseCity(city: string): void {
  const next = normalizeCity(city) || LAUNCH_CITIES[0]
  localStorage.setItem(BROWSE_KEY, next)
  window.dispatchEvent(new CustomEvent('browse-city-changed', { detail: next }))
}
