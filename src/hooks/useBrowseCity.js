import { useEffect, useState } from 'react'
import { getBrowseCity } from '../lib/cities'

/** Active browse city from navbar dropdown; syncs via browse-city-changed event */
export function useBrowseCity(profileCity = '') {
  const [browseCity, setBrowseCity] = useState(() => getBrowseCity(profileCity))

  useEffect(() => {
    setBrowseCity(getBrowseCity(profileCity))
    function onCityChange(e) {
      setBrowseCity(e.detail || getBrowseCity(profileCity))
    }
    window.addEventListener('browse-city-changed', onCityChange)
    return () => window.removeEventListener('browse-city-changed', onCityChange)
  }, [profileCity])

  return browseCity
}
