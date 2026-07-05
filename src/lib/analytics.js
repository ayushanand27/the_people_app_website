import posthog from 'posthog-js'

const KEY = import.meta.env.VITE_POSTHOG_KEY

export function initAnalytics() {
  if (!KEY) return

  posthog.init(KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    autocapture: false,
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing()
    },
  })
}

export function identifyUser(userId) {
  if (!KEY || !userId || import.meta.env.DEV) return
  posthog.identify(userId)
}

/** Track a named event. Only pass user_id as PII in properties. */
export function track(event, properties = {}) {
  if (!KEY || import.meta.env.DEV) return
  posthog.capture(event, properties)
}
