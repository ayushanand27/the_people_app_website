import { Sentry } from './sentry'

/** Log Supabase client error to Sentry; returns a user-facing message */
export function reportSupabaseError(error, context = 'Supabase') {
  if (!error) return null
  const message = error.message || 'Something went wrong. Please try again.'
  Sentry.captureException(new Error(`${context}: ${message}`), {
    extra: { code: error.code, details: error.details, hint: error.hint },
  })
  return message
}
