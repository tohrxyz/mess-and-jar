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
