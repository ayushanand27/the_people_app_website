import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSession = vi.fn()
const invoke = vi.fn()
vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: (...args) => getSession(...args) },
    functions: { invoke: (...args) => invoke(...args) },
  },
}))

const { deleteAccount } = await import('./deleteAccount')

beforeEach(() => {
  getSession.mockReset()
  invoke.mockReset()
})

describe('deleteAccount', () => {
  it('short-circuits with an error when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const { error } = await deleteAccount()
    expect(error?.message).toBe('Not signed in')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('passes the access token as a bearer header', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } })
    invoke.mockResolvedValue({ data: { ok: true }, error: null })
    await deleteAccount()
    expect(invoke).toHaveBeenCalledWith('delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok-123' },
    })
  })

  it('surfaces a transport error from the edge function', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    invoke.mockResolvedValue({ data: null, error: { message: 'network error' } })
    const { error } = await deleteAccount()
    expect(error?.message).toBe('network error')
  })

  it('surfaces an application-level error returned in the payload', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    invoke.mockResolvedValue({ data: { error: 'Could not delete: active reports' }, error: null })
    const { error } = await deleteAccount()
    expect(error?.message).toBe('Could not delete: active reports')
  })

  it('returns no error on success', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    invoke.mockResolvedValue({ data: { ok: true }, error: null })
    const { error } = await deleteAccount()
    expect(error).toBeNull()
  })
})
