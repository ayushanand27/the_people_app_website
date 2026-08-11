/** Local chat safety — always-on, free, instant */

const BLOCKED_PATTERNS = [
  // Sexual / solicitation (EN)
  /\b(nudes?|nude\s*pics?|send\s*nudes?|dick\s*pic|sex\s*chat|hook\s*up\s*tonight)\b/i,
  /\b(onlyfans|porn|xxx|boobs?|pussy|cock\b|penis|vagina)\b/i,
  /\b(show\s*me\s*your\s*(body|boobs?|ass|pics?))\b/i,
  // Harassment / threats (EN)
  /\b(kill\s*yourself|kys\b|i'?ll\s*kill\s*you|rape\s*you)\b/i,
  /\b(sluts?|whores?|bitch\s*ass|go\s*die)\b/i,
  // Common Hindi romanized harassment / sexual
  /\b(chodu|chutiya|madarchod|behenchod|bhosdike|randi)\b/i,
  /\b(nangi\s*(photo|pic|pics?)|apni\s*nangi)\b/i,
]

const URL_RE = /https?:\/\/[^\s]+|www\.[^\s]+/gi

export type ChatTextCheck = { ok: true } | { ok: false; reason: string }

export function checkChatText(text?: string | null): ChatTextCheck {
  const raw = String(text || '')
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true }

  if (trimmed.length > 2000) {
    return { ok: false, reason: 'Message is too long (max 2000 characters)' }
  }

  // Same-character spam (e.g. aaaaaaaaa)
  if (trimmed.length >= 12 && /^(.)\1+$/.test(trimmed.replace(/\s/g, ''))) {
    return { ok: false, reason: 'That looks like spam. Please write a normal message.' }
  }

  const links = trimmed.match(URL_RE) || []
  if (links.length >= 3) {
    return { ok: false, reason: 'Too many links in one message.' }
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        reason: 'This message was blocked because it may be harmful or inappropriate.',
      }
    }
  }

  return { ok: true }
}
