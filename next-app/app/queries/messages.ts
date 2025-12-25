import { useQuery } from '@tanstack/react-query'
import { Message } from '../types'

export const getMessages = async (roomId: string, timestamp: number | null): Promise<Message[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL
  const response = await fetch(`${apiUrl}/query_messages?room=${roomId}&timestamp=${timestamp}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.json()
  // Map from backend format to frontend format
  return (data.messages || []).map((m: { timestamp: number; room_id: string; username: string; msg: string; identity_pubkey: string | null; signature: string | null }) => ({
    date: String(m.timestamp),
    room: m.room_id,
    username: m.username,
    msg: m.msg,
    identity_pubkey: m.identity_pubkey ?? undefined,
    signature: m.signature ?? undefined,
  }))
}

export const useMessages = (roomId: string, timestamp: number | null) => {
  return useQuery({
    queryKey: ['messages', roomId, timestamp],
    queryFn: () => getMessages(roomId, timestamp),
    enabled: Boolean(roomId && timestamp !== null),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3,
    staleTime: 4000,
  })
}
