import { supabase } from './supabase'

/** Fetch reports with reporter profile; enrich target details client-side. */
export async function fetchAdminReports() {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id, target_type, target_id, reason, status, created_at,
      reporter:reporter_id ( id, full_name, username, avatar_url )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return enrichReports(data || [])
}

async function enrichReports(reports) {
  const videoIds = reports.filter(r => r.target_type === 'video').map(r => r.target_id)
  const commentIds = reports.filter(r => r.target_type === 'comment').map(r => r.target_id)
  const userIds = reports.filter(r => r.target_type === 'user').map(r => r.target_id)

  const [videos, comments, users] = await Promise.all([
    videoIds.length
      ? supabase.from('videos').select('id, title, user_id, video_url').in('id', videoIds)
      : { data: [] },
    commentIds.length
      ? supabase.from('video_comments').select('id, content, user_id, video_id').in('id', commentIds)
      : { data: [] },
    userIds.length
      ? supabase.from('profiles').select('id, full_name, username, avatar_url, is_banned').in('id', userIds)
      : { data: [] },
  ])

  const videoMap = Object.fromEntries((videos.data || []).map(v => [v.id, v]))
  const commentMap = Object.fromEntries((comments.data || []).map(c => [c.id, c]))
  const userMap = Object.fromEntries((users.data || []).map(u => [u.id, u]))

  return reports.map(r => ({
    ...r,
    target: r.target_type === 'video'
      ? videoMap[r.target_id]
      : r.target_type === 'comment'
        ? commentMap[r.target_id]
        : userMap[r.target_id],
  }))
}

export async function updateReportStatus(reportId, status) {
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId)
  if (error) throw error
}

export async function adminDeleteVideo(videoId) {
  const { error } = await supabase.from('videos').delete().eq('id', videoId)
  if (error) throw error
}

export async function adminDeleteComment(commentId) {
  const { error } = await supabase.from('video_comments').delete().eq('id', commentId)
  if (error) throw error
}

export async function adminBanUser(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: true })
    .eq('id', userId)
  if (error) throw error
}

export async function fetchPendingVideos() {
  const { data, error } = await supabase
    .from('videos')
    .select('id, title, description, hashtags, status, created_at, user_id, profiles(full_name, username)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function approveVideo(videoId) {
  const { error } = await supabase
    .from('videos')
    .update({ status: 'published' })
    .eq('id', videoId)
  if (error) throw error
}

export function targetSummary(report) {
  const t = report.target
  if (!t) return '(content removed or unavailable)'
  switch (report.target_type) {
    case 'video':
      return t.title || 'Untitled reel'
    case 'comment':
      return t.content?.slice(0, 80) || 'Comment'
    case 'user':
      return `@${t.username || t.full_name || 'user'}`
    default:
      return report.target_id
  }
}
