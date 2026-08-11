import { supabase } from './supabase'

export interface AdminReport {
  id: string
  target_type: 'video' | 'comment' | 'user'
  target_id: string
  reason?: string
  status: string
  created_at: string
  reporter?: { id: string; full_name?: string; username?: string; avatar_url?: string }
  target?: Record<string, unknown>
}

/** Fetch reports with reporter profile; enrich target details client-side. */
export async function fetchAdminReports(): Promise<AdminReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id, target_type, target_id, reason, status, created_at,
      reporter:reporter_id ( id, full_name, username, avatar_url )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return enrichReports((data as unknown as AdminReport[]) || [])
}

async function enrichReports(reports: AdminReport[]): Promise<AdminReport[]> {
  const videoIds = reports.filter(r => r.target_type === 'video').map(r => r.target_id)
  const commentIds = reports.filter(r => r.target_type === 'comment').map(r => r.target_id)
  const userIds = reports.filter(r => r.target_type === 'user').map(r => r.target_id)

  const [videos, comments, users] = await Promise.all([
    videoIds.length
      ? supabase.from('videos').select('id, title, user_id, video_url').in('id', videoIds)
      : { data: [] as Record<string, unknown>[] },
    commentIds.length
      ? supabase.from('video_comments').select('id, content, user_id, video_id').in('id', commentIds)
      : { data: [] as Record<string, unknown>[] },
    userIds.length
      ? supabase.from('profiles').select('id, full_name, username, avatar_url, is_banned').in('id', userIds)
      : { data: [] as Record<string, unknown>[] },
  ])

  const videoMap = Object.fromEntries(
    (videos.data || []).map((v: Record<string, unknown>) => [v.id, v])
  )
  const commentMap = Object.fromEntries(
    (comments.data || []).map((c: Record<string, unknown>) => [c.id, c])
  )
  const userMap = Object.fromEntries(
    (users.data || []).map((u: Record<string, unknown>) => [u.id, u])
  )

  return reports.map(r => ({
    ...r,
    target: r.target_type === 'video'
      ? videoMap[r.target_id]
      : r.target_type === 'comment'
        ? commentMap[r.target_id]
        : userMap[r.target_id],
  }))
}

export async function updateReportStatus(reportId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId)
  if (error) throw error
}

export async function adminDeleteVideo(videoId: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('id', videoId)
  if (error) throw error
}

export async function adminDeleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('video_comments').delete().eq('id', commentId)
  if (error) throw error
}

export async function adminBanUser(userId: string): Promise<void> {
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

export async function approveVideo(videoId: string): Promise<void> {
  const { error } = await supabase
    .from('videos')
    .update({ status: 'published' })
    .eq('id', videoId)
  if (error) throw error
}

export function targetSummary(report: AdminReport): string {
  const t = report.target
  if (!t) return '(content removed or unavailable)'
  switch (report.target_type) {
    case 'video':
      return (t.title as string) || 'Untitled reel'
    case 'comment':
      return (t.content as string)?.slice(0, 80) || 'Comment'
    case 'user':
      return `@${(t.username as string) || (t.full_name as string) || 'user'}`
    default:
      return report.target_id
  }
}
