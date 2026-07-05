export const PRESET_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Surat',
]

export const CITIES = [...PRESET_CITIES, 'Other']

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
