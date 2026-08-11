import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  markPasswordResetPending,
  clearPasswordResetPending,
  isPasswordResetPending,
  markGoogleOAuthPending,
  clearGoogleOAuthPending,
  isGoogleOAuthPending,
  redirectRecoveryToResetPage,
  shouldBlockAppForPasswordReset,
} from './authRecovery'

function setUrl(pathname, search = '', hash = '') {
  window.history.replaceState(null, '', `${pathname}${search}${hash}`)
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setUrl('/')
})

describe('password reset pending flag', () => {
  it('is false before being marked', () => {
    expect(isPasswordResetPending()).toBe(false)
  })

  it('is true immediately after marking', () => {
    markPasswordResetPending()
    expect(isPasswordResetPending()).toBe(true)
  })

  it('clears explicitly', () => {
    markPasswordResetPending()
    clearPasswordResetPending()
    expect(isPasswordResetPending()).toBe(false)
  })

  it('expires after the TTL and self-clears', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    markPasswordResetPending()

    vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 60 * 1000)
    expect(isPasswordResetPending()).toBe(false)
    // self-clear means a fresh check without the mock still reports false
    vi.restoreAllMocks()
    expect(isPasswordResetPending()).toBe(false)
  })
})

describe('google oauth pending flag', () => {
  it('round-trips through mark/clear', () => {
    expect(isGoogleOAuthPending()).toBe(false)
    markGoogleOAuthPending()
    expect(isGoogleOAuthPending()).toBe(true)
    clearGoogleOAuthPending()
    expect(isGoogleOAuthPending()).toBe(false)
  })
})

describe('redirectRecoveryToResetPage', () => {
  it('does nothing on a plain landing with no auth params', () => {
    setUrl('/')
    expect(redirectRecoveryToResetPage()).toBe(false)
    expect(window.location.pathname).toBe('/')
  })

  it('never redirects when already on /reset-password', () => {
    setUrl('/reset-password', '?code=abc')
    expect(redirectRecoveryToResetPage()).toBe(false)
  })

  // NOTE: jsdom does not implement real navigation for location.replace(), so these
  // only assert the function's documented return value (whether it decided to redirect),
  // not the resulting pathname.
  it('redirects on a recovery type param', () => {
    setUrl('/', '?type=recovery&token_hash=xyz')
    expect(redirectRecoveryToResetPage()).toBe(true)
  })

  it('redirects on a bare PKCE code by default (password reset)', () => {
    setUrl('/', '?code=abc123')
    expect(redirectRecoveryToResetPage()).toBe(true)
  })

  it('does NOT redirect a PKCE code that is a pending Google OAuth return', () => {
    markGoogleOAuthPending()
    setUrl('/', '?code=abc123')
    expect(redirectRecoveryToResetPage()).toBe(false)
  })

  it('redirects on a recovery access_token in the hash', () => {
    setUrl('/', '', '#access_token=zzz&type=recovery')
    expect(redirectRecoveryToResetPage()).toBe(true)
  })
})

describe('shouldBlockAppForPasswordReset', () => {
  it('does not block when no reset is pending', () => {
    expect(shouldBlockAppForPasswordReset({ user: {} })).toBe(false)
  })

  it('blocks once a session exists while a reset is pending', () => {
    markPasswordResetPending()
    expect(shouldBlockAppForPasswordReset({ user: {} })).toBe(true)
  })

  it('does not block a pending reset with no session and no callback params', () => {
    markPasswordResetPending()
    expect(shouldBlockAppForPasswordReset(null)).toBe(false)
  })

  it('blocks a pending reset with no session but an auth callback in the URL', () => {
    markPasswordResetPending()
    setUrl('/', '?type=recovery&token_hash=xyz')
    expect(shouldBlockAppForPasswordReset(null)).toBe(true)
  })
})
