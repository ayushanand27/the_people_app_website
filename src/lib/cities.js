export const PRESET_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Begusarai', 'Patna', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Surat',
]

export const LAUNCH_CITIES = ['Bangalore', 'Begusarai', 'Patna', 'Jaipur']

export const CITIES = [...PRESET_CITIES, 'Other']

const BROWSE_KEY = 'peopleapp_browse_city'

export function initCityState(savedCity = '') {
  if (!savedCity) return { city: '', customCity: '' }
  if (PRESET_CITIES.includes(savedCity)) return { city: savedCity, customCity: '' }
  return { city: 'Other', customCity: savedCity }
}

export function resolveCity(city, customCity) {
  if (city === 'Other') return customCity.trim()
  return city
}

export function isCityValid(city, customCity) {
  const resolved = resolveCity(city, customCity)
  return resolved.length >= 2
}

export function getBrowseCity(profileCity = '') {
  const stored = localStorage.getItem(BROWSE_KEY)
  if (stored && (LAUNCH_CITIES.includes(stored) || PRESET_CITIES.includes(stored))) {
    return stored
  }
  if (profileCity && LAUNCH_CITIES.includes(profileCity)) return profileCity
  if (profileCity && PRESET_CITIES.includes(profileCity)) return profileCity
  return LAUNCH_CITIES[0]
}

export function setBrowseCity(city) {
  localStorage.setItem(BROWSE_KEY, city)
  window.dispatchEvent(new CustomEvent('browse-city-changed', { detail: city }))
}
