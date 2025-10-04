import { HashParams } from '../types'

export const parseHashFromUrl = (hash: string | null | undefined): null | HashParams => {
  if (!hash?.trim()) return null
  const pairs = hash?.slice(1)?.split('&').filter(Boolean)
  if (!pairs || pairs?.length === 0) return null

  const parsed = pairs.reduce<HashParams>((acc, pair) => {
    const [rawKey, rawVal] = pair.split('=')
    if (!rawKey) return acc
    const key = decodeURIComponent(rawKey)
    const value = rawVal === undefined ? '' : decodeURIComponent(rawVal)
    acc[key] = value
    return acc
  }, {})
  return Object.keys.length ? parsed : null
}
