import { describe, it, expect } from 'vitest'
import { normalizePhone, whatsappUrl } from './contact'

describe('normalizePhone', () => {
  it('strips formatting and keeps 10-digit Indian numbers', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('9876543210')
    expect(normalizePhone('919876543210')).toBe('9876543210')
  })
})

describe('whatsappUrl', () => {
  it('builds wa.me link with optional encoded message', () => {
    expect(whatsappUrl('9876543210')).toBe('https://wa.me/919876543210')
    expect(whatsappUrl('9876543210', 'Hello there')).toBe(
      'https://wa.me/919876543210?text=Hello%20there'
    )
    expect(whatsappUrl('')).toBeNull()
  })
})
