import { MediaType } from '../types'

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const decimals = 2

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))

  return `${size} ${units[i]}`
}

export function extractIdFromImageSource(val: string) {
  const splitted = val?.split('/')
  const result = splitted?.[splitted.length - 1]
  return result
}

export function getFileExtensionFromMediaType(val: MediaType) {
  if (val === 'photo') {
    return '.jpeg'
  } else if (val === 'video') {
    return '.mp4'
  } else if (val === 'audio') {
    return '.webm'
  } else {
    return null
  }
}

export const formatPlaybackTime = (current: number, total: number): string => {
  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time) || time < 0) {
      return '00:00'
    }
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  if (!isFinite(total) || isNaN(total) || total <= 0) {
    return formatTime(current)
  }

  return `${formatTime(current)} / ${formatTime(total)}`
}

export const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
