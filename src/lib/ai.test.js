import { describe, it, expect, vi, beforeEach } from 'vitest'

const invoke = vi.fn()
vi.mock('./supabase', () => ({
  supabase: { functions: { invoke: (...args) => invoke(...args) } },
}))

const {
  generateIcebreaker,
  moderateUploadText,
  moderateChatText,
  moderateChatImage,
} = await import('./ai')

beforeEach(() => {
  invoke.mockReset()
})

describe('generateIcebreaker', () => {
  it('returns the AI text on success', async () => {
    invoke.mockResolvedValue({ data: { text: '  Hey, tell me more!  ' }, error: null })
    expect(await generateIcebreaker('chess')).toBe('Hey, tell me more!')
    expect(invoke).toHaveBeenCalledWith('ai-proxy', {
      body: { type: 'icebreaker', context: 'chess' },
    })
  })

  it('falls back on a transport error', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'network down' } })
    expect(await generateIcebreaker('chess')).toMatch(/chess/)
  })

  it('falls back when the proxy reports an error payload', async () => {
    invoke.mockResolvedValue({ data: { error: 'rate limited' }, error: null })
    expect(await generateIcebreaker('travel')).toMatch(/travel/)
  })

  it('defaults blank context to "new connection"', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'down' } })
    expect(await generateIcebreaker('   ')).toMatch(/new connection/)
  })
})

describe('moderateUploadText', () => {
  it('skips the call for empty text', async () => {
    expect(await moderateUploadText('   ')).toEqual({ flagged: false })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('returns flagged:true with reason when the proxy flags content', async () => {
    invoke.mockResolvedValue({ data: { flagged: true, reason: 'spam' }, error: null })
    expect(await moderateUploadText('buy now buy now')).toEqual({ flagged: true, reason: 'spam' })
  })

  it('fails open (flagged:false) when the proxy is unavailable', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'timeout' } })
    expect(await moderateUploadText('hello')).toEqual({ flagged: false })
  })
})

describe('moderateChatText', () => {
  it('skips the call for empty text', async () => {
    expect(await moderateChatText('')).toEqual({ flagged: false, unavailable: false })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('truncates context to 2000 chars', async () => {
    invoke.mockResolvedValue({ data: { flagged: false }, error: null })
    await moderateChatText('x'.repeat(3000))
    expect(invoke.mock.calls[0][1].body.context).toHaveLength(2000)
  })

  it('fails open but marks unavailable on error', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'down' } })
    expect(await moderateChatText('hi')).toEqual({ flagged: false, unavailable: true })
  })
})

describe('moderateChatImage', () => {
  it('fails closed (flagged:true) for a missing URL', async () => {
    const r = await moderateChatImage('')
    expect(r.flagged).toBe(true)
    expect(r.unavailable).toBe(true)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('fails closed (flagged:true) when the proxy is unavailable', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'down' } })
    const r = await moderateChatImage('https://example.com/a.jpg')
    expect(r.flagged).toBe(true)
    expect(r.unavailable).toBe(true)
  })

  it('trusts the proxy verdict when available', async () => {
    invoke.mockResolvedValue({ data: { flagged: false, source: 'model' }, error: null })
    const r = await moderateChatImage('https://example.com/a.jpg')
    expect(r).toEqual({ flagged: false, reason: 'This image was blocked for safety.', unavailable: false })
  })
})
