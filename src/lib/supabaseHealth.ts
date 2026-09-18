import { supabase } from './supabase'

const HEALTH_TIMEOUT_MS = 8000

export type SupabaseHealth = {
  ok: boolean
  reason?: 'missing_config' | 'unreachable'
}

function timeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(id),
  }
}

/**
 * True when the Supabase project is reachable from this browser.
 * Uses AbortController (not AbortSignal.timeout) so older Safari / Android
 * WebViews do not throw and get treated as "backend down".
 *
 * Any HTTP response below 500 means the API gateway is up — including 401
 * (wrong key) — so we do not confuse config/CORS with a paused project.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return { ok: false, reason: 'missing_config' }

  const { signal, cancel } = timeoutSignal(HEALTH_TIMEOUT_MS)
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: anonKey },
      signal,
    })
    if (res.status >= 500) return { ok: false, reason: 'unreachable' }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'unreachable' }
  } finally {
    cancel()
  }
}

/** Warm session read with timeout — avoids infinite loader when backend is down. */
export async function getSessionWithTimeout(ms = HEALTH_TIMEOUT_MS) {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Backend timeout')), ms),
    ),
  ])
}
