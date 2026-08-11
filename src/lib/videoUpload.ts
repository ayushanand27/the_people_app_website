import { supabase } from './supabase'

export const VIDEO_LIMITS = {
  maxBytes: 100 * 1024 * 1024,
  minDurationSec: 3,
  maxDurationSec: 120,
  allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/mov'],
}

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME)
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration)
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video file'))
    }
    video.src = url
  })
}

export type VideoValidation =
  | { ok: false; error: string }
  | { ok: true; duration: number }

/** Client-side pre-check (server re-validates in edge function) */
export async function validateVideoFile(file?: File | null): Promise<VideoValidation> {
  if (!file) return { ok: false, error: 'No file selected' }
  if (!isCloudinaryConfigured()) {
    return { ok: false, error: 'Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME to .env' }
  }
  if (file.size > VIDEO_LIMITS.maxBytes) {
    return { ok: false, error: 'Video must be under 100MB' }
  }
  if (!VIDEO_LIMITS.allowedTypes.includes(file.type) && !file.type.startsWith('video/')) {
    return { ok: false, error: 'Please upload MP4, MOV, or WebM' }
  }

  let duration: number
  try {
    duration = await getVideoDuration(file)
  } catch {
    return { ok: false, error: 'Could not read video duration' }
  }

  if (duration < VIDEO_LIMITS.minDurationSec) {
    return { ok: false, error: `Video must be at least ${VIDEO_LIMITS.minDurationSec} seconds` }
  }
  if (duration > VIDEO_LIMITS.maxDurationSec) {
    return { ok: false, error: `Video must be under ${VIDEO_LIMITS.maxDurationSec} seconds (2 min)` }
  }

  return { ok: true, duration }
}

export interface SignedUploadParams {
  cloudName?: string
  apiKey: string
  timestamp: number
  signature: string
  resourceType?: string
  folder?: string
}

/** Request a signed upload from the edge function (server validates size + duration) */
export async function getSignedUploadParams(file: File, duration: number): Promise<SignedUploadParams> {
  const { data, error } = await supabase.functions.invoke('cloudinary-sign', {
    body: {
      fileSize: file.size,
      duration,
      fileType: file.type,
    },
  })

  if (error) {
    throw new Error(error.message || 'Failed to get upload signature')
  }
  if (data?.error) {
    throw new Error(data.error)
  }
  return data
}

export interface CloudinaryUploadResult {
  secure_url: string
  duration?: number
  [key: string]: unknown
}

export function uploadToCloudinary(
  file: File,
  signedParams: SignedUploadParams,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  const cloudName = signedParams.cloudName || CLOUD_NAME

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', signedParams.apiKey)
    formData.append('timestamp', String(signedParams.timestamp))
    formData.append('signature', signedParams.signature)
    formData.append('resource_type', signedParams.resourceType || 'video')
    if (signedParams.folder) {
      formData.append('folder', signedParams.folder)
    }

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = evt => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve(data)
        } else {
          reject(new Error(data?.error?.message || 'Upload failed'))
        }
      } catch {
        reject(new Error('Invalid response from upload server'))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`)
    xhr.send(formData)
  })
}

export function cloudinaryThumbnail(secureUrl: string): string {
  return secureUrl
    .replace('/upload/', '/upload/so_0/')
    .replace(/\.[^/.]+$/, '.jpg')
}
