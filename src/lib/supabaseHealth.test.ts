import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSupabaseHealth } from './supabaseHealth'

describe('checkSupabaseHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('treats 2xx as healthy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"name":"GoTrue"}', { status: 200 })))
    await expect(checkSupabaseHealth()).resolves.toEqual({ ok: true })
  })

  it('treats 401 as reachable (wrong key is not a paused project)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"Invalid API key"}', { status: 401 })))
    await expect(checkSupabaseHealth()).resolves.toEqual({ ok: true })
  })

  it('treats 5xx as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('paused', { status: 521 })))
    await expect(checkSupabaseHealth()).resolves.toEqual({ ok: false, reason: 'unreachable' })
  })

  it('treats a network error as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))
    await expect(checkSupabaseHealth()).resolves.toEqual({ ok: false, reason: 'unreachable' })
  })

  it('does not throw when AbortSignal.timeout is missing', async () => {
    const timeout = AbortSignal.timeout
    // Simulate Safari < 16 / older Android WebViews
    // @ts-expect-error -- deleting a method that may not exist in those browsers
    delete AbortSignal.timeout
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })))
    await expect(checkSupabaseHealth()).resolves.toEqual({ ok: true })
    AbortSignal.timeout = timeout
  })
})
