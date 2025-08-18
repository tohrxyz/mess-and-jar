import Dexie, { Table } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'

export interface ChatMedia {
  id: string
  timestamp: number
  blob: Blob
}

export const CHAT_MEDIA_DB_KEY = 'media-db'

class MediaDB extends Dexie {
  images!: Table<ChatMedia, string>

  constructor() {
    super(CHAT_MEDIA_DB_KEY)
    this.version(1).stores({
      images: '&id, timestamp',
    })
  }
}

export const mediaDb = new MediaDB()

export function useImage(id: string | null) {
  return useLiveQuery(() => mediaDb.images.get(id ?? ''), [id])
}

export async function getImage(id: string) {
  return await mediaDb.images.get(id)
}

export async function saveImage(rec: ChatMedia) {
  await mediaDb.images.put(rec)
}

export async function deleteOld(max: number) {
  const total = await mediaDb.images.count()
  if (total > max) {
    const old = await mediaDb.images
      .orderBy('timestamp')
      .limit(total - max)
      .toArray()
    await mediaDb.images.bulkDelete(old.map((r) => r.id))
  }
}

export const MAX_IMAGES_IN_CACHED_INDEX_DB = 200
