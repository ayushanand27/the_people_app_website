import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBrowseCity } from './useBrowseCity'

describe('useBrowseCity', () => {
  it('initializes from localStorage browse city', () => {
    localStorage.setItem('peopleapp_browse_city', 'Patna')
    const { result } = renderHook(() => useBrowseCity('Bangalore'))
    expect(result.current).toBe('Patna')
  })

  it('updates when browse-city-changed event fires', () => {
    const { result } = renderHook(() => useBrowseCity('Bangalore'))
    act(() => {
      window.dispatchEvent(new CustomEvent('browse-city-changed', { detail: 'Jaipur' }))
    })
    expect(result.current).toBe('Jaipur')
  })
})
