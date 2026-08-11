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

/**
 * Chat text moderation via AI.
 * If AI is down, returns flagged:false so local filter remains the gate.
 */
export async function moderateChatText(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return { flagged: false, unavailable: false }

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'moderate_content', context: trimmed.slice(0, 2000) },
  })

  if (error || data?.error) {
    console.warn('[ai] chat moderation unavailable:', error?.message || data?.error)
    return { flagged: false, unavailable: true }
  }

  return {
    flagged: Boolean(data?.flagged),
    reason: data?.reason || null,
    unavailable: false,
  }
}

/**
 * Chat image moderation. Fail closed: unavailable = treat as blocked.
 */
export async function moderateChatImage(imageUrl) {
  const url = String(imageUrl || '').trim()
  if (!url) return { flagged: true, reason: 'Missing image URL', unavailable: true }

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'moderate_image', imageUrl: url },
  })

  if (error || data?.error) {
    console.warn('[ai] image moderation unavailable:', error?.message || data?.error)
    return {
      flagged: true,
      reason: 'Image safety check is temporarily unavailable. Please try text-only.',
      unavailable: true,
    }
  }

  return {
    flagged: Boolean(data?.flagged),
    reason: data?.reason || 'This image was blocked for safety.',
    unavailable: data?.source === 'unavailable',
  }
}
