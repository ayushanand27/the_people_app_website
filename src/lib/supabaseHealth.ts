import { supabase } from './supabase'

const HEALTH_TIMEOUT_MS = 8000

/** True when Supabase auth API responds (project exists and is reachable). */
export async function checkSupabaseHealth(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) return false

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
    return res.ok
  } catch {
    return false
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
