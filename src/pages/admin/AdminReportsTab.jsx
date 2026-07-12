import { useCallback, useEffect, useState } from 'react'
import {
  fetchAdminReports,
  updateReportStatus,
  adminDeleteVideo,
  adminDeleteComment,
  adminBanUser,
  fetchPendingVideos,
  approveVideo,
  targetSummary,
} from '../../lib/adminReports'

const STATUS_FILTERS = ['all', 'pending', 'resolved', 'dismissed']

const STATUS_COLORS = {
  pending: { bg: '#FFD699', border: '#FF9F1C', text: '#7A4400' },
  resolved: { bg: '#B8F0B8', border: '#4CAF82', text: '#1C6B3A' },
  dismissed: { bg: '#eee', border: '#999', text: '#555' },
}

function cardStyle(bg = 'white') {
  return {
    background: bg, border: '3px solid #1C1C3A', borderRadius: 16,
    padding: '14px 18px', boxShadow: '3px 3px 0 #1C1C3A',
  }
}

function actionBtn(bg, color = 'white') {
  return {
    background: bg, color, border: '2.5px solid #1C1C3A', borderRadius: 10,
    padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

export default function AdminReportsTab({ onSuccess, onError }) {
  const [reports, setReports] = useState([])
  const [pendingVideos, setPendingVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reps, vids] = await Promise.all([fetchAdminReports(), fetchPendingVideos()])
      setReports(reps)
      setPendingVideos(vids)
    } catch (err) {
      onError?.(err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter)

  async function dismissReport(report) {
    setBusyId(report.id)
    try {
      await updateReportStatus(report.id, 'dismissed')
      onSuccess?.('Report dismissed')
      await load()
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function resolveReport(report) {
    setBusyId(report.id)
    try {
      let deleteContent = false
      if (report.target_type === 'video' || report.target_type === 'comment') {
        deleteContent = confirm(
          'Mark as resolved.\n\nAlso delete this content?\n\nOK = delete content + resolve\nCancel = resolve only'
        )
      }

      if (deleteContent && report.target_type === 'video' && report.target) {
        await adminDeleteVideo(report.target_id)
      } else if (deleteContent && report.target_type === 'comment' && report.target) {
        await adminDeleteComment(report.target_id)
      }

      await updateReportStatus(report.id, 'resolved')
      onSuccess?.(deleteContent ? 'Resolved and content deleted' : 'Report resolved')
      await load()
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function banReportedUser(report) {
    if (report.target_type !== 'user') return
    if (!confirm(`Ban @${report.target?.username || 'this user'}? They will be logged out immediately.`)) return

    setBusyId(report.id)
    try {
      await adminBanUser(report.target_id)
      await updateReportStatus(report.id, 'resolved')
      onSuccess?.('User banned and report resolved')
      await load()
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function approvePendingVideo(video) {
    setBusyId(video.id)
    try {
      await approveVideo(video.id)
      onSuccess?.('Video approved and published')
      await load()
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {pendingVideos.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>
            Videos pending review ({pendingVideos.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingVideos.map(v => (
              <div key={v.id} style={cardStyle('#FFF0F5')}>
                <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>{v.title || 'Untitled'}</div>
                <div style={{ color: '#555', fontSize: 13, marginBottom: 4 }}>
                  By {v.profiles?.full_name || 'Unknown'} (@{v.profiles?.username || '?'})
                </div>
                {v.description && (
                  <div style={{ color: '#333', fontSize: 13, marginBottom: 4 }}>{v.description}</div>
                )}
                <div style={{ color: '#aaa', fontSize: 11, marginBottom: 10 }}>
                  {new Date(v.created_at).toLocaleString()}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    disabled={busyId === v.id}
                    onClick={() => approvePendingVideo(v)}
                    style={actionBtn('#4CAF82')}
                  >
                    Approve & publish
                  </button>
                  <button
                    disabled={busyId === v.id}
                    onClick={async () => {
                      if (!confirm('Delete this video?')) return
                      setBusyId(v.id)
                      try {
                        await adminDeleteVideo(v.id)
                        onSuccess?.('Video deleted')
                        await load()
                      } catch (err) {
                        onError?.(err.message)
                      } finally {
                        setBusyId(null)
                      }
                    }}
                    style={actionBtn('#CC0000')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 50,
            border: '3px solid #1C1C3A', fontWeight: 700, fontSize: 13,
            background: filter === f ? '#FF85B3' : 'white',
            color: filter === f ? 'white' : '#1C1C3A',
            boxShadow: '2px 2px 0 #1C1C3A', cursor: 'pointer', fontFamily: 'inherit',
            textTransform: 'capitalize',
          }}>
            {f === 'all' ? `All (${reports.length})` : `${f} (${reports.filter(r => r.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontWeight: 700 }}>Loading reports...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardStyle('#FFF0F5'), textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>No {filter === 'all' ? '' : filter} reports</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(r => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending
            const isBusy = busyId === r.id
            return (
              <div key={r.id} style={cardStyle('#FFF0F5')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        background: sc.bg, border: `2px solid ${sc.border}`, color: sc.text,
                        borderRadius: 50, padding: '2px 10px', fontSize: 11, fontWeight: 800,
                        textTransform: 'uppercase',
                      }}>{r.status}</span>
                      <span style={{
                        background: '#B3E5FC', border: '2px solid #1C1C3A', borderRadius: 50,
                        padding: '2px 10px', fontSize: 11, fontWeight: 700,
                      }}>{r.target_type}</span>
                    </div>

                    <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>
                      Reported: {targetSummary(r)}
                    </div>
                    <div style={{ color: '#555', fontSize: 13, marginBottom: 4 }}>
                      By {r.reporter?.full_name || 'Unknown'} (@{r.reporter?.username || '?'})
                    </div>
                    {r.reason && (
                      <div style={{ color: '#333', fontSize: 13, marginBottom: 4 }}>
                        Reason: {r.reason}
                      </div>
                    )}
                    <div style={{ color: '#aaa', fontSize: 11 }}>
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    {r.target_type === 'user' && r.target?.is_banned && (
                      <div style={{ color: '#CC0000', fontWeight: 700, fontSize: 12, marginTop: 6 }}>
                        User already banned
                      </div>
                    )}
                  </div>
                </div>

                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button disabled={isBusy} onClick={() => dismissReport(r)} style={actionBtn('#eee', '#1C1C3A')}>
                      Dismiss
                    </button>
                    <button disabled={isBusy} onClick={() => resolveReport(r)} style={actionBtn('#4CAF82')}>
                      Resolve
                    </button>
                    {r.target_type === 'user' && !r.target?.is_banned && (
                      <button disabled={isBusy} onClick={() => banReportedUser(r)} style={actionBtn('#CC0000')}>
                        Ban user
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
