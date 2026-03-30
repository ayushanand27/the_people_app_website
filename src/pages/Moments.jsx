import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Upload, X } from 'lucide-react'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function Moments({ profile }) {
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [liked, setLiked] = useState([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [progress, setProgress] = useState(0)
  const fileRef = useRef(null)
  const videoRefs = useRef([])

  useEffect(() => {
    fetchVideos()
    fetchLiked()
  }, [])

  async function fetchVideos() {
    const { data } = await supabase
      .from('videos')
      .select('*, profiles(full_name, username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50)
    setVideos(data || [])
    setLoading(false)
  }

  async function fetchLiked() {
    const { data } = await supabase
      .from('video_likes')
      .select('video_id')
      .eq('user_id', profile.id)
    setLiked((data || []).map(d => d.video_id))
  }

  async function uploadVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 100 * 1024 * 1024) {
      alert('Video must be under 100MB')
      return
    }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('resource_type', 'video')

    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = evt => {
      if (evt.lengthComputable) {
        setProgress(Math.round((evt.loaded / evt.total) * 100))
      }
    }

    xhr.onload = async () => {
      const data = JSON.parse(xhr.responseText)
      if (data.secure_url) {
        await supabase.from('videos').insert({
          user_id: profile.id,
          title: title || 'Untitled Moment',
          description: desc,
          video_url: data.secure_url,
          thumbnail_url: data.secure_url.replace('/upload/', '/upload/so_0/').replace(/\.[^/.]+$/, '.jpg'),
          duration: Math.round(data.duration || 0)
        })
        setTitle('')
        setDesc('')
        setShowUpload(false)
        setUploading(false)
        setProgress(0)
        fetchVideos()
      }
    }

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`)
    xhr.send(formData)
  }

  async function toggleLike(videoId) {
    if (liked.includes(videoId)) {
      await supabase.from('video_likes').delete()
        .eq('video_id', videoId).eq('user_id', profile.id)
      await supabase.from('videos').update({ likes: videos.find(v => v.id === videoId).likes - 1 }).eq('id', videoId)
      setLiked(prev => prev.filter(id => id !== videoId))
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: v.likes - 1 } : v))
    } else {
      await supabase.from('video_likes').insert({ video_id: videoId, user_id: profile.id })
      await supabase.from('videos').update({ likes: videos.find(v => v.id === videoId).likes + 1 }).eq('id', videoId)
      setLiked(prev => [...prev, videoId])
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: v.likes + 1 } : v))
    }
  }

  function handleScroll(e) {
    const container = e.target
    const idx = Math.round(container.scrollTop / window.innerHeight)
    if (idx !== currentIdx) {
      videoRefs.current[currentIdx]?.pause()
      setCurrentIdx(idx)
      videoRefs.current[idx]?.play()
    }
  }

  return (
    <div style={{ height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
      {/* TOP BAR */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)'
      }}>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 22 }}>
          ✨ Moments
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            background: '#FF85B3', color: 'white',
            border: '2.5px solid white', borderRadius: 50,
            padding: '8px 18px', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Upload size={16} /> Upload
        </button>
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 12px 10px',
        display: 'flex', justifyContent: 'space-around'
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
            fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <span style={{ fontSize: 20 }}>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIDEO FEED */}
      {loading ? (
        <div style={{
          height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 18
        }}>Loading Moments... ✨</div>
      ) : videos.length === 0 ? (
        <div style={{
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', color: 'white'
        }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎬</div>
          <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>No Moments yet</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Be the first to share!</div>
          <button onClick={() => setShowUpload(true)} style={{
            background: '#FF85B3', color: 'white',
            border: '2.5px solid white', borderRadius: 50,
            padding: '14px 32px', fontWeight: 900, fontSize: 16,
            cursor: 'pointer', fontFamily: 'inherit'
          }}>Upload First Moment 🚀</button>
        </div>
      ) : (
        <div
          onScroll={handleScroll}
          style={{
            height: '100vh', overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            scrollBehavior: 'smooth'
          }}
        >
          {videos.map((video, i) => {
            const isLiked = liked.includes(video.id)
            return (
              <div key={video.id} style={{
                height: '100vh', width: '100%',
                scrollSnapAlign: 'start',
                position: 'relative', background: '#000',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {/* VIDEO */}
                <video
                  ref={el => videoRefs.current[i] = el}
                  src={video.video_url}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loop playsInline
                  autoPlay={i === 0}
                  onClick={e => e.target.paused ? e.target.play() : e.target.pause()}
                />

                {/* GRADIENT OVERLAY */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%, transparent 80%, rgba(0,0,0,0.3) 100%)',
                  pointerEvents: 'none'
                }} />

                {/* RIGHT SIDE ACTIONS */}
                <div style={{
                  position: 'absolute', right: 16, bottom: 120,
                  display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center'
                }}>
                  {/* AVATAR */}
                  <button
                    onClick={() => navigate(`/profile/${video.user_id}`)}
                    style={{
                      width: 48, height: 48, borderRadius: 50,
                      background: '#FF85B3', border: '2.5px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 900, fontSize: 20,
                      cursor: 'pointer', overflow: 'hidden'
                    }}
                  >
                    {video.profiles?.avatar_url ? (
                      <img src={video.profiles.avatar_url} alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : video.profiles?.full_name?.[0] || '?'}
                  </button>

                  {/* LIKE */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => toggleLike(video.id)} style={{
                      width: 48, height: 48, borderRadius: 50,
                      background: 'rgba(0,0,0,0.4)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}>
                      <Heart size={26} fill={isLiked ? '#FF6B6B' : 'none'} color={isLiked ? '#FF6B6B' : 'white'} />
                    </button>
                    <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{video.likes || 0}</span>
                  </div>

                  {/* COMMENT */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button style={{
                      width: 48, height: 48, borderRadius: 50,
                      background: 'rgba(0,0,0,0.4)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}>
                      <MessageCircle size={26} color="white" />
                    </button>
                    <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>0</span>
                  </div>
                </div>

                {/* BOTTOM INFO */}
                <div style={{
                  position: 'absolute', bottom: 80, left: 16, right: 80
                }}>
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
                    @{video.profiles?.username}
                  </div>
                  {video.title && (
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {video.title}
                    </div>
                  )}
                  {video.description && (
                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                      {video.description}
                    </div>
                  )}
                  {video.duration && (
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>
                      {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            width: '100%', maxWidth: 500,
            background: 'white', borderRadius: '24px 24px 0 0',
            padding: 28, paddingBottom: 40
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 900, fontSize: 20 }}>Upload Moment 🎬</div>
              <button onClick={() => setShowUpload(false)} style={{
                background: '#FFE0E0', border: 'none', borderRadius: 50,
                width: 32, height: 32, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <X size={18} color="#CC0000" />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Title</div>
              <input
                type="text" placeholder="Give your moment a title..."
                value={title} onChange={e => setTitle(e.target.value)}
                style={{
                  width: '100%', border: '3px solid #1C1C3A', borderRadius: 50,
                  padding: '12px 16px', fontSize: 14, fontWeight: 600,
                  background: '#FFF0F5', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Description</div>
              <textarea
                placeholder="What's this moment about?"
                value={desc} onChange={e => setDesc(e.target.value)}
                rows={2}
                style={{
                  width: '100%', border: '3px solid #1C1C3A', borderRadius: 16,
                  padding: '12px 16px', fontSize: 14, fontWeight: 600,
                  background: '#FFF0F5', outline: 'none',
                  fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            {uploading ? (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                  Uploading... {progress}%
                </div>
                <div style={{ background: '#eee', borderRadius: 50, height: 12, border: '2px solid #1C1C3A' }}>
                  <div style={{
                    width: `${progress}%`, height: '100%',
                    background: '#FF85B3', borderRadius: 50,
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            ) : (
              <>
                <input
                  ref={fileRef} type="file"
                  accept="video/*" onChange={uploadVideo}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileRef.current?.click()} style={{
                  width: '100%', background: '#FF85B3', color: 'white',
                  border: '3px solid #1C1C3A', borderRadius: 50,
                  padding: '16px 20px', fontWeight: 900, fontSize: 16,
                  boxShadow: '4px 4px 0 #1C1C3A', cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                  <Upload size={20} /> Choose Video (max 100MB)
                </button>
                <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
                  15 seconds to 2 minutes · Vertical format recommended
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
