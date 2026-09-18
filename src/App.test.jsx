import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

// ── Mock the Supabase client ────────────────────────────────────────────────
// Auth state is driven by capturing the onAuthStateChange callback and
// invoking it manually per test, mirroring how the real client notifies App.jsx.
let authCallback = null
const signOut = vi.fn().mockResolvedValue({})
const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
const getSession = vi.fn().mockResolvedValue({ data: { session: null } })

/** profiles.single() resolves to whatever this holds when a test triggers auth */
let profileResult = { data: null, error: { code: 'PGRST116' } }

function chain(result) {
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    gte: () => builder,
    in: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return builder
}

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      exchangeCodeForSession: (...args) => exchangeCodeForSession(...args),
      signOut: (...args) => signOut(...args),
      getSession: (...args) => getSession(...args),
    },
    from: (table) => (table === 'profiles' ? chain(profileResult) : chain({ data: [], error: null })),
  },
}))

vi.mock('./lib/authRecovery', () => ({
  shouldBlockAppForPasswordReset: vi.fn(() => false),
  isGoogleOAuthPending: vi.fn(() => false),
  clearGoogleOAuthPending: vi.fn(),
  isPasswordResetPending: vi.fn(() => false),
  clearPasswordResetPending: vi.fn(),
}))

vi.mock('./lib/supabaseHealth', () => ({
  checkSupabaseHealth: vi.fn(() => Promise.resolve({ ok: true })),
  getSessionWithTimeout: vi.fn(() =>
    import('./lib/supabase').then(({ supabase }) => supabase.auth.getSession()),
  ),
}))

const { default: App } = await import('./App')
const authRecovery = await import('./lib/authRecovery')
const supabaseHealth = await import('./lib/supabaseHealth')

function setUrl(path) {
  window.history.pushState(null, '', path)
}

function signedOut() {
  act(() => { authCallback('SIGNED_OUT', null) })
}

const BASE_PROFILE = {
  id: 'user-1',
  full_name: 'Test User',
  onboarding_complete: true,
  is_admin: false,
  is_banned: false,
}

beforeEach(() => {
  // The global setup.js runs vi.restoreAllMocks() after every test, which wipes
  // mockResolvedValue implementations back to returning undefined — re-establish
  // them fresh each time rather than relying on the module-scope defaults.
  authCallback = null
  signOut.mockReset().mockResolvedValue({})
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
  getSession.mockReset().mockResolvedValue({ data: { session: null } })
  authRecovery.shouldBlockAppForPasswordReset.mockReset().mockReturnValue(false)
  authRecovery.isGoogleOAuthPending.mockReset().mockReturnValue(false)
  profileResult = { data: null, error: { code: 'PGRST116' } }
  supabaseHealth.checkSupabaseHealth.mockReset().mockResolvedValue({ ok: true })
  supabaseHealth.getSessionWithTimeout.mockReset().mockImplementation(() =>
    import('./lib/supabase').then(({ supabase }) => supabase.auth.getSession()),
  )
})

describe('App routing and auth guards', () => {
  it('shows a loading state before the auth callback fires', async () => {
    setUrl('/')
    render(<App />)
    expect(screen.getByText(/Loading/)).toBeInTheDocument()
    signedOut()
    await waitFor(() => expect(screen.getByText('Log in')).toBeInTheDocument())
  })

  it('shows Landing (with a login link) when there is no session', async () => {
    setUrl('/')
    render(<App />)
    await waitFor(() => expect(screen.getByText('Log in')).toBeInTheDocument())
  })

  it('redirects an authenticated, onboarded user away from "/" (no Landing/login link)', async () => {
    setUrl('/')
    profileResult = { data: BASE_PROFILE, error: null }
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    render(<App />)
    await waitFor(() => expect(screen.queryByText('Log in')).not.toBeInTheDocument())
  })

  it('routes a signed-in user with an incomplete profile into onboarding', async () => {
    setUrl('/')
    profileResult = { data: { ...BASE_PROFILE, onboarding_complete: false }, error: null }
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    render(<App />)
    await waitFor(() => expect(screen.getByText(/Tell us about you/)).toBeInTheDocument())
  })

  it('signs out and drops back to Landing when the profile is banned', async () => {
    setUrl('/')
    profileResult = { data: { ...BASE_PROFILE, is_banned: true }, error: null }
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    render(<App />)
    await waitFor(() => expect(signOut).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Log in')).toBeInTheDocument())
  })

  it('shows a retry screen when the profile fetch fails for a reason other than "no row"', async () => {
    setUrl('/')
    profileResult = { data: null, error: { code: '500', message: 'Network error' } }
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    render(<App />)
    await waitFor(() => expect(screen.getByText(/Couldn.t load profile/)).toBeInTheDocument())
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('redirects a non-admin user away from /admin', async () => {
    setUrl('/admin')
    profileResult = { data: BASE_PROFILE, error: null } // is_admin: false
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    render(<App />)
    await waitFor(() => expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument())
  })

  it('redirects to /reset-password when a password reset is pending for this session', async () => {
    setUrl('/')
    authRecovery.shouldBlockAppForPasswordReset.mockReturnValue(true)
    profileResult = { data: BASE_PROFILE, error: null }
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe('/reset-password'))
  })

  it('does not call a session timeout "backend down" when Supabase is reachable', async () => {
    setUrl('/')
    supabaseHealth.getSessionWithTimeout.mockRejectedValue(new Error('Backend timeout'))
    supabaseHealth.checkSupabaseHealth.mockResolvedValue({ ok: true })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Log in')).toBeInTheDocument())
    expect(screen.queryByText(/Cannot reach the database/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Backend temporarily unavailable/)).not.toBeInTheDocument()
  })

  it('shows a config/network screen only when the session read fails and health fails', async () => {
    setUrl('/')
    supabaseHealth.getSessionWithTimeout.mockRejectedValue(new Error('Backend timeout'))
    supabaseHealth.checkSupabaseHealth.mockResolvedValue({ ok: false, reason: 'unreachable' })
    render(<App />)
    await waitFor(() => expect(screen.getByText(/Cannot reach the database/)).toBeInTheDocument())
    expect(screen.getByText(/paused project/i)).toBeInTheDocument()
  })

  it('redirects an unauthenticated user away from a protected route to /auth', async () => {
    setUrl('/dashboard')
    render(<App />)
    signedOut()
    await waitFor(() => expect(screen.getByText(/Welcome back/)).toBeInTheDocument())
  })
})
