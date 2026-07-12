import { describe, it, expect } from 'vitest'
import { checkChatText } from './chatSafety'

describe('checkChatText', () => {
  it('allows normal friendly messages', () => {
    expect(checkChatText('Hey! Nice to meet you in Begusarai').ok).toBe(true)
    expect(checkChatText('')).toEqual({ ok: true })
  })

  it('blocks clear sexual solicitation', () => {
    const r = checkChatText('send nudes please')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/blocked|inappropriate/i)
  })

  it('blocks common harassment / threats', () => {
    expect(checkChatText('kill yourself').ok).toBe(false)
    expect(checkChatText('madarchod').ok).toBe(false)
  })

  it('blocks spam patterns', () => {
    expect(checkChatText('aaaaaaaaaaaaaa').ok).toBe(false)
    expect(checkChatText('http://a.com http://b.com http://c.com hey').ok).toBe(false)
  })

  it('blocks oversized messages', () => {
    expect(checkChatText('x'.repeat(2001)).ok).toBe(false)
  })
})
