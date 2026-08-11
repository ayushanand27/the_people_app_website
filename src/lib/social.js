import { supabase } from './supabase'

// All helpers fail soft: if a table/policy is missing (new Supabase not set up
// yet), they log and return a safe default instead of throwing.

function soft(error, context) {
  if (error) console.warn(`[social] ${context}:`, error.message)
}

// ── HASHTAGS ──────────────────────────────────────────────────────────────────
export function extractHashtags(text = '') {
  // \p{M} covers combining marks (e.g. Devanagari vowel signs like ु in #जयपुर) —
  // without it, hashtags in Hindi/other Indic scripts get silently truncated.
  const matches = text.match(/#[\p{L}\p{M}0-9_]+/gu) || []
  return [...new Set(matches.map(t => t.slice(1).toLowerCase()))].slice(0, 10)
}

// ── FOLLOWS ───────────────────────────────────────────────────────────────────
export async function isFollowing(followerId, followingId) {
  if (!followerId || !followingId) return false
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  soft(error, 'isFollowing')
  return Boolean(data)
}

export async function followUser(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId })
  soft(error, 'followUser')
  if (!error) {
    createNotification({ userId: followingId, actorId: followerId, type: 'follow' })
  }
  return !error
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
  soft(error, 'unfollowUser')
  return !error
}

export async function getFollowingIds(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
  soft(error, 'getFollowingIds')
  return (data || []).map(f => f.following_id)
}

// ── BOOKMARKS ─────────────────────────────────────────────────────────────────
export async function getBookmarkedIds(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('video_bookmarks')
    .select('video_id')
    .eq('user_id', userId)
  soft(error, 'getBookmarkedIds')
  return (data || []).map(b => b.video_id)
}

export async function toggleBookmark(videoId, userId, currentlyBookmarked) {
  if (currentlyBookmarked) {
    const { error } = await supabase
      .from('video_bookmarks')
      .delete()
      .eq('video_id', videoId)
      .eq('user_id', userId)
    soft(error, 'removeBookmark')
    return !error
  }
  const { error } = await supabase
    .from('video_bookmarks')
    .insert({ video_id: videoId, user_id: userId })
  soft(error, 'addBookmark')
  return !error
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export async function createNotification({ userId, actorId, type, entityId = null }) {
  if (!userId || !actorId || userId === actorId) return // never notify self
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, actor_id: actorId, type, entity_id: entityId })
  soft(error, 'createNotification')
}

export async function getNotifications(userId, limit = 50) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:actor_id(id, full_name, username, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  soft(error, 'getNotifications')
  return data || []
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  soft(error, 'getUnreadNotificationCount')
  return count || 0
}

export async function markNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  soft(error, 'markNotificationsRead')
}

// ── SAFETY: REPORT & BLOCK ────────────────────────────────────────────────────
export async function reportContent({ reporterId, targetType, targetId, reason = '' }) {
  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason })
  soft(error, 'reportContent')
  return !error
}

export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId })
  soft(error, 'blockUser')
  return !error
}

/** IDs of users blocked in either direction (you blocked them, or they blocked you). */
export async function getBlockedIds(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
  soft(error, 'getBlockedIds')
  return [...new Set(
    (data || []).map(b => (b.blocker_id === userId ? b.blocked_id : b.blocker_id))
  )]
}
