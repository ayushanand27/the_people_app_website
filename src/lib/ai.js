import { supabase } from './supabase'

const FALLBACK = (context) =>
  `Hey! Nice to connect — what got you interested in ${context}?`

export async function generateIcebreaker(context = 'new connection') {
  const trimmed = String(context || '').trim() || 'new connection'

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'icebreaker', context: trimmed },
  })

  if (error) {
    console.warn('[ai] edge function error:', error.message)
    return FALLBACK(trimmed)
  }

  if (data?.error) {
    console.warn('[ai] proxy error:', data.error)
    return FALLBACK(trimmed)
  }

  return data?.text?.trim() || FALLBACK(trimmed)
}

/** Returns true if description/hashtags look like spam or abusive content. */
export async function moderateUploadText(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return { flagged: false }

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'moderate_content', context: trimmed },
  })

  if (error || data?.error) {
    console.warn('[ai] moderation unavailable:', error?.message || data?.error)
    return { flagged: false }
  }

  return { flagged: Boolean(data?.flagged), reason: data?.reason || null }
}
