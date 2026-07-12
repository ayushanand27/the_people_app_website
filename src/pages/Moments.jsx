import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Heart, MessageCircle, Upload, X, Volume2, VolumeX, Trash2, Share2, Bookmark, Flag, Ban } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  validateVideoFile,
  getSignedUploadParams,
  uploadToCloudinary,
  cloudinaryThumbnail,
  VIDEO_LIMITS,
  isCloudinaryConfigured,
} from '../lib/videoUpload'
import {
  extractHashtags,
  getFollowingIds,
  getBookmarkedIds,
  toggleBookmark,
  createNotification,
  reportContent,
  blockUser,
  getBlockedIds,
} from '../lib/social'
import { moderateUploadText } from '../lib/ai'
import { track } from '../lib/analytics'
import InlineError from '../components/InlineError'
import { reportSupabaseError } from '../lib/supabaseError'
import { useBrowseCity } from '../hooks/useBrowseCity'

const PAGE_SIZE = 10

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Moments({ profile }) {
  const navigate = useNavigate()
  const browseCity = useBrowseCity(profile?.city)
  const [searchParams, setSearchParams] = useSearchParams()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [liked, setLiked] = useState([])
  const [muted, setMuted] = useState(true)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [commentsOpen, setCommentsOpen] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [feedTab, setFeedTab] = useState('foryou')   // foryou | following | saved
  const [bookmarked, setBookmarked] = useState([])
  const [followingIds, setFollowingIds] = useState([])
  const [blockedIds, setBlockedIds] = useState([])
  const [showMore, setShowMore] = useState(null)      // video id for more-menu

  const fileRef = useRef(null)
  const videoRefs = useRef([])
  const feedRef = useRef(null)
  const viewedRef = useRef(new Set())
  const lastTapRef = useRef(0)
  const cursorRef = useRef(null)
  const deepLinkHandled = useRef(false)

  const fetchVideos = useCallback(async (append = false) => {
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setLoadError('')
    }

    if (feedTab === 'following' && !followingIds.length) {
      setVideos([])
      setHasMore(false)
      setLoading(false)
      setLoadingMore(false)
      return
    }
    if (feedTab === 'saved' && !bookmarked.length) {
      setVideos([])
      setHasMore(false)
      setLoading(false)
      setLoadingMore(false)
      return
    }

    let query = supabase
      .from('videos')
      .select('*, profiles!inner(full_name, username, avatar_url, city)')
      .eq('profiles.city', browseCity)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (feedTab === 'following') {
      query = query.in('user_id', followingIds)
    } else if (feedTab === 'saved') {
      query = query.in('id', bookmarked)
    }

    if (append && cursorRef.current) {
      query = query.lt('created_at', cursorRef.current)
    }

    const { data, error } = await query

    if (error) {
      setLoadError(reportSupabaseError(error, 'Moments feed') || 'Failed to load videos')
      setLoading(false)
      setLoadingMore(false)
      return
    }

    let batch = data || []

    if (blockedIds.length) {
      batch = batch.filter(v => !blockedIds.includes(v.user_id))
    }

    if (feedTab === 'foryou' && followingIds.length) {
      batch.sort((a, b) => {
        const aF = followingIds.includes(a.user_id) ? 1 : 0
        const bF = followingIds.includes(b.user_id) ? 1 : 0
        return bF - aF
      })
    }

    if (batch.length > 0) {
      cursorRef.current = batch[batch.length - 1].created_at
    }
    setHasMore((data || []).length === PAGE_SIZE)
    setVideos(prev => (append ? [...prev, ...batch] : batch))
    setLoading(false)
    setLoadingMore(false)
  }, [feedTab, followingIds, bookmarked, blockedIds, browseCity])

  useEffect(() => {
    async function init() {
      const [fIds, bIds, blkIds] = await Promise.all([
        getFollowingIds(profile.id),
        getBookmarkedIds(profile.id),
        getBlockedIds(profile.id),
      ])
      setFollowingIds(fIds)
      setBookmarked(bIds)
      setBlockedIds(blkIds)
    }
    init()
    fetchLiked()
  }, [profile.id])

  useEffect(() => {
    cursorRef.current = null
    setLoadError('')
    fetchVideos()
  }, [feedTab, followingIds, bookmarked, blockedIds, fetchVideos])

  // Deep link: /moments?v=<videoId> from notifications or share
  useEffect(() => {
    const videoId = searchParams.get('v')
    if (!videoId) {
      deepLinkHandled.current = false
      return
    }
    if (deepLinkHandled.current || loading) return

    async function openDeepLink() {
      let idx = videos.findIndex(v => v.id === videoId)
      if (idx < 0) {
        const { data, error } = await supabase
          .from('videos')
          .select('*, profiles(full_name, username, avatar_url)')
          .eq('id', videoId)
          .single()
        if (error || !data) {
          setLoadError(reportSupabaseError(error, 'Moments deep link') || 'Video not found')
          deepLinkHandled.current = true
          setSearchParams({}, { replace: true })
          return
        }
        setVideos(prev => [data, ...prev.filter(v => v.id !== videoId)])
        return
      }

      deepLinkHandled.current = true
      setSearchParams({}, { replace: true })
      setActiveIdx(idx)

      requestAnimationFrame(() => {
        const container = feedRef.current
        const target = container?.children[idx]
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        videoRefs.current[idx]?.play().catch(() => {})
      })
    }

    openDeepLink()
  }, [videos, loading, searchParams, setSearchParams])

  async function fetchLiked() {
    const { data } = await supabase
      .from('video_likes')
      .select('video_id')
      .eq('user_id', profile.id)
    setLiked((data || []).map(d => d.video_id))
  }

  // Intersection Observer — industry-standard reel visibility detection
  useEffect(() => {
    if (!videos.length) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          const idx = Number(entry.target.dataset.idx)
          if (Number.isNaN(idx)) return

          setActiveIdx(idx)
          videoRefs.current.forEach((v, i) => {
            if (!v) return
            if (i === idx) v.play().catch(() => {})
            else v.pause()
          })

          const video = videos[idx]
          if (video && !viewedRef.current.has(video.id)) {
            viewedRef.current.add(video.id)
            supabase.rpc('increment_video_views', { p_video_id: video.id }).then(({ error }) => {
              if (!error) {
                setVideos(prev =>
                  prev.map(v => (v.id === video.id ? { ...v, views: (v.views || 0) + 1 } : v))
                )
              }
            })
          }
        })
      },
      { threshold: 0.7 }
    )

    videoRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [videos])

  // Infinite scroll — load next page near bottom
  useEffect(() => {
    const container = feedRef.current
    if (!container) return

    function onScroll() {
      const nearBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - window.innerHeight * 1.5
      if (nearBottom && hasMore && !loadingMore && !loading) {
        fetchVideos(true)
      }
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [hasMore, loadingMore, loading, fetchVideos])

  async function uploadVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    const validation = await validateVideoFile(file)
    if (!validation.ok) {
      setUploadError(validation.error)
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const signedParams = await getSignedUploadParams(file, validation.duration)
      const data = await uploadToCloudinary(file, signedParams, setProgress)
      const hashtags = extractHashtags(`${title} ${desc}`)
      const moderationText = `${title} ${desc} ${hashtags.join(' ')}`.trim()
      await moderateUploadText(moderationText)
      // DB trigger always forces pending_review until an admin publishes
      const videoStatus = 'pending_review'

      const { error } = await supabase.from('videos').insert({
        user_id: profile.id,
        title: title.trim() || 'Untitled Moment',
        description: desc.trim(),
        video_url: data.secure_url,
        thumbnail_url: cloudinaryThumbnail(data.secure_url),
        duration: validation.duration || Math.round(data.duration || 0),
        hashtags,
        status: videoStatus,
      })

      if (error) throw new Error(error.message)

      setTitle('')
      setDesc('')
      setShowUpload(false)
      cursorRef.current = null
      await fetchVideos()

      track('video_upload', { user_id: profile.id, status: videoStatus })
      alert('Moment uploaded! It will appear publicly after a quick review.')
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function toggleLike(videoId) {
    const isLiked = liked.includes(videoId)
    const video = videos.find(v => v.id === videoId)
    if (isLiked) {
      await supabase.from('video_likes').delete().eq('video_id', videoId).eq('user_id', profile.id)
      setLiked(prev => prev.filter(id => id !== videoId))
      setVideos(prev => prev.map(v => (v.id === videoId ? { ...v, likes: Math.max((v.likes || 1) - 1, 0) } : v)))
    } else {
      await supabase.from('video_likes').insert({ video_id: videoId, user_id: profile.id })
      setLiked(prev => [...prev, videoId])
      setVideos(prev => prev.map(v => (v.id === videoId ? { ...v, likes: (v.likes || 0) + 1 } : v)))
      if (video && video.user_id !== profile.id) {
        createNotification({ userId: video.user_id, actorId: profile.id, type: 'like', entityId: videoId })
      }
    }
  }

  async function handleBookmark(videoId) {
    const isSaved = bookmarked.includes(videoId)
    const ok = await toggleBookmark(videoId, profile.id, isSaved)
    if (ok) setBookmarked(prev => isSaved ? prev.filter(id => id !== videoId) : [...prev, videoId])
  }

  async function handleReport(video) {
    const reason = prompt('Why are you reporting this? (optional)')
    if (reason === null) return
    const ok = await reportContent({ reporterId: profile.id, targetType: 'video', targetId: video.id, reason })
    alert(ok ? 'Reported. Thank you.' : 'Could not submit report.')
    setShowMore(null)
  }

  async function handleBlock(video) {
    if (!confirm(`Block @${video.profiles?.username}? Their content will be hidden.`)) return
    const ok = await blockUser(profile.id, video.user_id)
    if (ok) {
      setBlockedIds(prev => [...prev, video.user_id])
      setVideos(prev => prev.filter(v => v.user_id !== video.user_id))
    }
    setShowMore(null)
  }

  function handleVideoTap(videoId) {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (!liked.includes(videoId)) toggleLike(videoId)
    } else {
      const v = videoRefs.current[activeIdx]
      if (v) v.paused ? v.play() : v.pause()
    }
    lastTapRef.current = now
  }

  async function deleteVideo(videoId) {
    if (!confirm('Delete this moment?')) return
    await supabase.from('videos').delete().eq('id', videoId).eq('user_id', profile.id)
    setVideos(prev => prev.filter(v => v.id !== videoId))
  }

  async function openComments(videoId) {
    setCommentsOpen(videoId)
    setCommentsLoading(true)
    const { data, error } = await supabase
      .from('video_comments')
      .select('*, profiles(full_name, username, avatar_url)')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      setComments([])
    } else {
      setComments(data || [])
    }
    setCommentsLoading(false)
  }

  async function postComment() {
    if (!commentText.trim() || !commentsOpen) return
    const { data, error } = await supabase
      .from('video_comments')
      .insert({ video_id: commentsOpen, user_id: profile.id, content: commentText.trim() })
      .select('*, profiles(full_name, username, avatar_url)')
      .single()

    if (!error && data) {
      setComments(prev => [...prev, data])
      setCommentText('')
      setVideos(prev =>
        prev.map(v =>
          v.id === commentsOpen ? { ...v, comment_count: (v.comment_count || 0) + 1 } : v
        )
      )
      const video = videos.find(v => v.id === commentsOpen)
      if (video && video.user_id !== profile.id) {
        createNotification({ userId: video.user_id, actorId: profile.id, type: 'comment', entityId: commentsOpen })
      }
    }
  }

  function shareVideo(video) {
    const url = `${window.location.origin}/moments?v=${video.id}`
    navigator.clipboard?.writeText(url)
    alert('Link copied!')
  }

  return (
    <div style={{ height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
      {/* TOP BAR */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
      }}>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22 }}>✨ Moments · {browseCity}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {['foryou', 'following', 'saved'].map(tab => (
            <button key={tab} onClick={() => setFeedTab(tab)} style={{
              background: feedTab === tab ? '#FF85B3' : 'rgba(255,255,255,0.15)',
              color: 'white', border: 'none', borderRadius: 50,
              padding: '5px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              {tab === 'foryou' ? 'For You' : tab === 'following' ? 'Following' : 'Saved'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setMuted(m => !m)}
            style={iconBtnStyle}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={20} color="white" /> : <Volume2 size={20} color="white" />}
          </button>
          <button onClick={() => setShowUpload(true)} style={uploadBtnStyle}>
            <Upload size={16} /> Upload
          </button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 12px 10px', display: 'flex', justifyContent: 'space-around',
      }}>
        {[
          { label: 'Home', path: '/dashboard', emoji: '🏠' },
          { label: 'Discover', path: '/discover', emoji: '🔍' },
          { label: 'Moments', path: '/moments', emoji: '✨', active: true },
          { label: 'Chat', path: '/chat', emoji: '💬' },
          { label: 'Me', path: `/profile/${profile?.id}`, emoji: '👤' },
        ].map(tab => (
          <button key={tab.label} onClick={() => navigate(tab.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 14,
            background: tab.active ? 'rgba(255,133,179,0.3)' : 'transparent',
            border: tab.active ? '1.5px solid #FF85B3' : '1.5px solid transparent',
            color: tab.active ? '#FF85B3' : 'rgba(255,255,255,0.6)',
            fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 20 }}>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* FEED */}
      {loading ? (
        <div style={centerStyle}>Loading Moments... ✨</div>
      ) : loadError && videos.length === 0 ? (
        <div style={{ ...centerStyle, padding: 24 }}>
          <InlineError message={loadError} onRetry={() => { setLoadError(''); fetchVideos() }} />
        </div>
      ) : videos.length === 0 ? (
        <div style={{ ...centerStyle, flexDirection: 'column' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎬</div>
          <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>No Moments in {browseCity} yet</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Be the first to share!</div>
          <button onClick={() => setShowUpload(true)} style={uploadBtnStyle}>Upload First Moment 🚀</button>
        </div>
      ) : (
        <div
          ref={feedRef}
          style={{
            height: '100vh', overflowY: 'scroll',
            scrollSnapType: 'y mandatory', scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {videos.map((video, i) => {
            const isLiked = liked.includes(video.id)
            const isSaved = bookmarked.includes(video.id)
            const isNear = Math.abs(i - activeIdx) <= 2
            return (
              <div key={video.id} style={{
                height: '100vh', width: '100%', scrollSnapAlign: 'start',
                position: 'relative', background: '#111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isNear ? (
                  <video
                    ref={el => { videoRefs.current[i] = el }}
                    data-idx={i}
                    src={video.video_url}
                    poster={video.thumbnail_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loop playsInline muted={muted}
                    preload={i <= activeIdx + 1 ? 'auto' : 'metadata'}
                    onClick={() => handleVideoTap(video.id)}
                  />
                ) : (
                  <img
                    src={video.thumbnail_url || video.video_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                  />
                )}

                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 45%, transparent 80%, rgba(0,0,0,0.3) 100%)',
                }} />

                {/* ACTIONS */}
                <div style={{
                  position: 'absolute', right: 16, bottom: 120,
                  display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center',
                }}>
                  <button onClick={() => navigate(`/profile/${video.user_id}`)} style={avatarBtnStyle}>
                    {video.profiles?.avatar_url ? (
                      <img src={video.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : video.profiles?.full_name?.[0] || '?'}
                  </button>

                  <ActionButton
                    icon={<Heart size={26} fill={isLiked ? '#FF6B6B' : 'none'} color={isLiked ? '#FF6B6B' : 'white'} />}
                    count={video.likes || 0}
                    onClick={() => toggleLike(video.id)}
                  />

                  <ActionButton
                    icon={<MessageCircle size={26} color="white" />}
                    count={video.comment_count || 0}
                    onClick={() => openComments(video.id)}
                  />

                  <ActionButton
                    icon={<Share2 size={24} color="white" />}
                    onClick={() => shareVideo(video)}
                  />

                  <ActionButton
                    icon={<Bookmark size={24} fill={isSaved ? '#FFD699' : 'none'} color={isSaved ? '#FFD699' : 'white'} />}
                    onClick={() => handleBookmark(video.id)}
                  />

                  {video.user_id !== profile.id && (
                    <ActionButton
                      icon={<span style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>···</span>}
                      onClick={() => setShowMore(showMore === video.id ? null : video.id)}
                    />
                  )}

                  {showMore === video.id && (
                    <div style={{
                      position: 'absolute', right: 60, bottom: 0,
                      background: 'white', borderRadius: 12, padding: 8,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 50, minWidth: 140
                    }}>
                      <button onClick={() => handleReport(video)} style={moreMenuBtn}>
                        <Flag size={14} /> Report
                      </button>
                      <button onClick={() => handleBlock(video)} style={{ ...moreMenuBtn, color: '#CC0000' }}>
                        <Ban size={14} /> Block user
                      </button>
                    </div>
                  )}

                  {video.user_id === profile.id && (
                    <ActionButton
                      icon={<Trash2 size={22} color="#FF6B6B" />}
                      onClick={() => deleteVideo(video.id)}
                    />
                  )}
                </div>

                {/* INFO */}
                <div style={{ position: 'absolute', bottom: 80, left: 16, right: 80 }}>
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
                    @{video.profiles?.username}
                  </div>
                  {video.title && (
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{video.title}</div>
                  )}
                  {video.description && (
                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{video.description}</div>
                  )}
                  {video.hashtags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {video.hashtags.map(tag => (
                        <span key={tag} style={{ color: '#FF85B3', fontSize: 13, fontWeight: 700 }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 }}>
                    {video.views ? `${video.views} views · ` : ''}
                    {video.duration ? formatDuration(video.duration) : ''}
                  </div>
                </div>
              </div>
            )
          })}
          {loadingMore && (
            <div style={{ ...centerStyle, height: 80, fontSize: 14 }}>Loading more...</div>
          )}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%', maxWidth: 500, background: 'white',
            borderRadius: '24px 24px 0 0', padding: 28, paddingBottom: 40,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 900, fontSize: 20 }}>Upload Moment 🎬</div>
              <button onClick={() => { setShowUpload(false); setUploadError('') }} style={closeBtnStyle}>
                <X size={18} color="#CC0000" />
              </button>
            </div>

            {!isCloudinaryConfigured() && (
              <div style={{ background: '#FFF3CD', padding: 12, borderRadius: 12, marginBottom: 14, fontSize: 13 }}>
                Add VITE_CLOUDINARY_CLOUD_NAME to your .env file. Upload signing runs via Supabase Edge Function.
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Title</div>
              <input type="text" placeholder="Give your moment a title..." value={title}
                onChange={e => setTitle(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Description</div>
              <textarea placeholder="What's this moment about? Use #hashtags" value={desc}
                onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inputStyle, borderRadius: 16, resize: 'none' }} />
            </div>

            {uploadError && (
              <div style={{ color: '#CC0000', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{uploadError}</div>
            )}

            {uploading ? (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Uploading... {progress}%</div>
                <div style={{ background: '#eee', borderRadius: 50, height: 12, border: '2px solid #1C1C3A' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#FF85B3', borderRadius: 50, transition: 'width 0.3s' }} />
                </div>
              </div>
            ) : (
              <>
                <input ref={fileRef} type="file" accept="video/*" onChange={uploadVideo} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current?.click()} style={chooseBtnStyle} disabled={!isCloudinaryConfigured()}>
                  <Upload size={20} /> Choose Video (max 100MB)
                </button>
                <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
                  {VIDEO_LIMITS.minDurationSec}s – {VIDEO_LIMITS.maxDurationSec}s · Vertical format recommended
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* COMMENTS SHEET */}
      {commentsOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setCommentsOpen(null)}>
          <div style={{
            width: '100%', maxHeight: '60vh', background: 'white',
            borderRadius: '24px 24px 0 0', padding: 20, display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Comments</div>
              <button onClick={() => setCommentsOpen(null)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
              {commentsLoading ? (
                <div style={{ textAlign: 'center', color: '#999' }}>Loading...</div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                  No comments yet. Run the SQL migration to enable comments.
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ ...avatarBtnStyle, width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>
                      {c.profiles?.avatar_url ? (
                        <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : c.profiles?.full_name?.[0] || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>@{c.profiles?.username}</div>
                      <div style={{ fontSize: 14 }}>{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={e => e.key === 'Enter' && postComment()}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={postComment} style={{ ...uploadBtnStyle, padding: '12px 20px' }}>Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({ icon, count, onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button onClick={onClick} style={actionBtnStyle}>{icon}</button>
      {count !== undefined && (
        <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{count}</span>
      )}
    </div>
  )
}

const centerStyle = {
  height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'white', fontWeight: 700, fontSize: 18,
}

const iconBtnStyle = {
  background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: 50,
  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
}

const uploadBtnStyle = {
  background: '#FF85B3', color: 'white', border: '2.5px solid white', borderRadius: 50,
  padding: '8px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', gap: 6,
}

const avatarBtnStyle = {
  width: 48, height: 48, borderRadius: 50, background: '#FF85B3', border: '2.5px solid white',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'white', fontWeight: 900, fontSize: 20, cursor: 'pointer', overflow: 'hidden',
}

const actionBtnStyle = {
  width: 48, height: 48, borderRadius: 50, background: 'rgba(0,0,0,0.4)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
}

const inputStyle = {
  width: '100%', border: '3px solid #1C1C3A', borderRadius: 50,
  padding: '12px 16px', fontSize: 14, fontWeight: 600,
  background: '#FFF0F5', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const closeBtnStyle = {
  background: '#FFE0E0', border: 'none', borderRadius: 50,
  width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const chooseBtnStyle = {
  width: '100%', background: '#FF85B3', color: 'white',
  border: '3px solid #1C1C3A', borderRadius: 50,
  padding: '16px 20px', fontWeight: 900, fontSize: 16,
  boxShadow: '4px 4px 0 #1C1C3A', cursor: 'pointer',
  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}

const moreMenuBtn = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '10px 12px', border: 'none',
  background: 'none', cursor: 'pointer', fontWeight: 700,
  fontSize: 13, fontFamily: 'inherit', borderRadius: 8,
}
