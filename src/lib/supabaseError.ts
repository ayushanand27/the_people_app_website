import { Sentry } from './sentry'

export interface SupabaseLikeError {
  message?: string
  code?: string
  details?: string
  hint?: string
}

/** Log Supabase client error to Sentry; returns a user-facing message */
export function reportSupabaseError(
  error?: SupabaseLikeError | null,
  context = 'Supabase'
): string | null {
  if (!error) return null
  const message = error.message || 'Something went wrong. Please try again.'
  Sentry.captureException(new Error(`${context}: ${message}`), {
    extra: { code: error.code, details: error.details, hint: error.hint },
  })
  return message
}
