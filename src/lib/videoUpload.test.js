import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  VIDEO_LIMITS,
  validateVideoFile,
  cloudinaryThumbnail,
  isCloudinaryConfigured,
} from './videoUpload'

function makeFile({ size = 1024, type = 'video/mp4' } = {}) {
  return new File([new Uint8Array(size)], 'clip.mp4', { type })
}

function mockVideoDuration(seconds) {
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:mock'
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {}
  }
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

  const origCreate = Document.prototype.createElement
  vi.spyOn(document, 'createElement').mockImplementation(function (tag) {
    if (tag === 'video') {
      return {
        preload: '',
        _onloaded: null,
        set src(_v) {
          queueMicrotask(() => this._onloaded?.())
        },
        get src() {
          return 'blob:mock'
        },
        set onloadedmetadata(fn) {
          this._onloaded = fn
        },
        set onerror(_fn) {},
        get duration() {
          return seconds
        },
      }
    }
    return origCreate.call(document, tag)
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('isCloudinaryConfigured', () => {
  it('is true when cloud name env is set in tests', () => {
    expect(isCloudinaryConfigured()).toBe(true)
  })
})

describe('cloudinaryThumbnail', () => {
  it('inserts so_0 and swaps extension to jpg', () => {
    const url = 'https://res.cloudinary.com/demo/video/upload/v1/abc/file.mp4'
    expect(cloudinaryThumbnail(url)).toBe(
      'https://res.cloudinary.com/demo/video/upload/so_0/v1/abc/file.jpg'
    )
  })
})

describe('validateVideoFile', () => {
  it('rejects when no file is provided', async () => {
    const result = await validateVideoFile(null)
    expect(result).toEqual({ ok: false, error: 'No file selected' })
  })

  it('rejects files over the size limit', async () => {
    const file = makeFile({ size: VIDEO_LIMITS.maxBytes + 1 })
    const result = await validateVideoFile(file)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/100MB/)
  })

  it('rejects unsupported mime types', async () => {
    const file = makeFile({ type: 'application/pdf' })
    const result = await validateVideoFile(file)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/MP4/)
  })

  it('rejects videos shorter than the minimum duration', async () => {
    mockVideoDuration(VIDEO_LIMITS.minDurationSec - 1)
    const file = makeFile()
    const result = await validateVideoFile(file)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/at least/)
  })
})
