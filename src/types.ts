/** Shared shape of a `profiles` row as used across pages/components. */
export interface Profile {
  id: string
  full_name?: string
  username?: string
  bio?: string
  city?: string
  interests?: string[]
  avatar_url?: string
  onboarding_complete?: boolean
  is_admin?: boolean
  is_banned?: boolean
  is_premium?: boolean
  follower_count?: number
  following_count?: number
  created_at?: string
  [key: string]: unknown
}

export interface Group {
  id: string
  name: string
  description?: string
  city: string
  interests?: string[]
  max_members: number
  group_members?: { count: number }[]
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  image_url?: string | null
  read?: boolean
  created_at: string
}

export interface NotificationItem {
  id: string
  user_id: string
  actor_id?: string
  type: string
  entity_id?: string | null
  read?: boolean
  created_at: string
  actor?: { id: string; full_name?: string; username?: string; avatar_url?: string }
}

export interface Video {
  id: string
  user_id: string
  title?: string
  description?: string
  video_url: string
  thumbnail_url?: string
  duration?: number
  hashtags?: string[]
  status?: string
  likes?: number
  comment_count?: number
  views?: number
  created_at?: string
  profiles?: { full_name?: string; username?: string; avatar_url?: string; city?: string }
  [key: string]: unknown
}

export interface VideoComment {
  id: string
  video_id: string
  user_id: string
  content: string
  created_at?: string
  profiles?: { full_name?: string; username?: string; avatar_url?: string }
}

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

export interface PendingVideo {
  id: string
  title?: string
  description?: string
  hashtags?: string[]
  status?: string
  created_at: string
  user_id: string
  profiles?: { full_name?: string; username?: string }
}

export interface ListingUpdateRequest {
  id: string
  listing_id: string
  submitted_by: string
  changes?: Record<string, unknown>
  note?: string
  status?: string
  created_at?: string
  local_listings?: { title?: string; city?: string }
  submitter?: { full_name?: string; username?: string }
}

export interface Listing {
  id: string
  city?: string
  category?: string
  title: string
  description?: string
  price_text?: string
  phone?: string
  whatsapp?: string
  images?: string[]
  owner_id?: string
  owner?: { id: string; full_name?: string; username?: string; avatar_url?: string }
  status?: string
  created_at?: string
  [key: string]: unknown
}

export interface EventItem {
  id: string
  title: string
  description?: string
  city: string
  date: string
  location?: string
  max_attendees?: number
  event_attendees?: { count: number }[]
}
