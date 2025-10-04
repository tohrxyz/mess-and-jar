'use client'

import ChatHeader from '@/app/components/ChatHeader'
import MessageArea from '@/app/components/MessageArea'
import MessageInput from '@/app/components/MessageInput'
import { LOCAL_STORAGE_KEYS } from '@/app/constants/localStorageKeys'
import { getLastTimestamp, saveMessages, useMessagesLocal } from '@/app/indexdb/chat-db'
import {
  cryptoKeyFromRawExport,
  decryptSubtleClient,
  hexToArrayBuffer,
  prepareBufferFromMessage,
  verifyMessageAgainstPubkeyHex,
} from '@/app/lib/crypto-client'
import { clearStorage, getFromStorage, saveToStorage } from '@/app/lib/localStorage'
import { parseHashFromUrl } from '@/app/lib/parse'
import { roomOperation } from '@/app/mutations/room'
import { useMessages } from '@/app/queries/messages'
import { HashParams, Message, Room, RoomBackendMethod, RoomGetResponse } from '@/app/types'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useRoomContext } from './RoomContext'

export default function RoomPage() {
  const router = useRouter()
  const { room_id } = useParams()
  const {
    user,
    room,

    previousRoomIdRef,
    lastTimestampRef,

    setUser,
    setRoom,
  } = useRoomContext()
  const [hashParams, setHashParams] = useState<null | HashParams>(null)

  const messagesLocal = useMessagesLocal(room_id as string)
  const [messages, setMessages] = useState<Message[]>([])
  const decryptedMessageIdsRef = useRef<{
    [key: string]: Message
  }>({})

  useEffect(() => {
    const update = () => {
      setHashParams(parseHashFromUrl(window.location.hash))
    }
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  useEffect(() => {
    const doFn = async () => {
      if (!messagesLocal || !room?.password) return

      const key = await cryptoKeyFromRawExport(room.password)
      const textDecoder = new TextDecoder()
      const batchSize = 20

      const newlyDecrypted: { [id: string]: Message } = {}

      for (let i = 0; i < messagesLocal.length; i += batchSize) {
        const batch = messagesLocal.slice(i, i + batchSize)

        const toProcess = batch.filter((v) => {
          const id = `${v.date}-${v.username}-${room?.id ?? 'general'}`
          return !decryptedMessageIdsRef.current[id]
        })

        const batchResults = await Promise.all(
          toProcess.map(async (v) => {
            try {
              const [ivHex, encMsg] = v.msg.split('_')
              const iv = new Uint8Array(hexToArrayBuffer(ivHex))
              const decryptedMessageContent = await decryptSubtleClient(encMsg, { key, iv })
              const decoded = textDecoder.decode(decryptedMessageContent)

              const preparedMessageBuffToSign = await prepareBufferFromMessage({
                date: v.date.toString(),
                room: v.room,
                username: v.username,
                msg: decoded,
              })

              const isValidSig = await verifyMessageAgainstPubkeyHex({
                messageBuffer: preparedMessageBuffToSign,
                publicKeyHex: v.identity_pubkey ?? '',
                signature: v.signature ?? '',
              })

              return {
                ...v,
                msg: decoded,
                isSentFromClient: false,
                isSignatureValid: isValidSig,
              } as Message
            } catch (error) {
              return {
                ...v,
                msg: 'Unable to decrypt message',
                isSentFromClient: false,
              } as Message
            }
          }),
        )

        batchResults.forEach((m) => {
          const id = `${m.date}-${m.username}-${room?.id ?? 'general'}`
          newlyDecrypted[id] = m
        })
      }

      if (Object.keys(newlyDecrypted).length > 0) {
        decryptedMessageIdsRef.current = {
          ...decryptedMessageIdsRef.current,
          ...newlyDecrypted,
        }
      }

      const orderedMessages = Object.values(decryptedMessageIdsRef.current).sort(
        (a, b) => Number(a.date) - Number(b.date),
      )

      setMessages(orderedMessages)
    }
    doFn()
  }, [messagesLocal, room?.password])

  useEffect(() => {
    if (messagesLocal) {
      lastTimestampRef.current = Number(messagesLocal.at(messagesLocal.length - 1)?.date) ?? 0
    }
  }, [messagesLocal])

  const { data: queriedMessages, isLoading, failureCount } = useMessages(room_id as string, lastTimestampRef.current)

  useEffect(() => {
    const userData = getFromStorage(LOCAL_STORAGE_KEYS.USER)
    if (!userData) {
      router.push('/auth')
    } else {
      setUser(userData)
    }
  }, [router])

  useEffect(() => {
    const wasNukedDueToMigration: string | null = getFromStorage(LOCAL_STORAGE_KEYS.WAS_DB_MIGRATED_JSON_SQLITE_V1)
    if (wasNukedDueToMigration === null) {
      const currentStoredRooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS)
      saveToStorage(LOCAL_STORAGE_KEYS.BACKUP_WAS_DB_MIGRATED_JSON_SQLITE_V1, currentStoredRooms)
      clearStorage(LOCAL_STORAGE_KEYS.ROOMS)
      saveToStorage(LOCAL_STORAGE_KEYS.WAS_DB_MIGRATED_JSON_SQLITE_V1, 'true')
      window.location.replace('/')
    }
  }, [])

  useEffect(() => {
    const doFn = async () => {
      if (room_id) {
        const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS)
        if (rooms) {
          const parsedRooms = JSON.parse(rooms)
          const room = parsedRooms.find((room: Room) => room.id === room_id)
          if (room) {
            setRoom(room)
          } else {
            const roomResponse = (await roomOperation({
              id: room_id as string,
              method: RoomBackendMethod.RoomGet,
            })) as RoomGetResponse

            if (!hashParams || !hashParams['password']) throw Error('No password from url hash') // todo: 404 page

            const key = await cryptoKeyFromRawExport(hashParams['password'])
            const _roomEncrypted = roomResponse.room.name?.split('_')
            const iv = new Uint8Array(hexToArrayBuffer(_roomEncrypted[0]))
            const encName = _roomEncrypted[1]

            const decryptedRoomNameBuffer = await decryptSubtleClient(encName, { iv, key })
            const decryptedRoomName = new TextDecoder().decode(decryptedRoomNameBuffer)
            const room: Room = {
              id: room_id as string,
              name: decryptedRoomName ?? `unknown ${Math.random().toString(36).substring(2, 15)}`,
              password: hashParams['password'],
            }

            let roomsToCommit: Room[] = parsedRooms.concat(room)
            saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, JSON.stringify(roomsToCommit))
            window.location.replace(`/chat/${room_id}`)
          }
        }
        const timestamp = await getLastTimestamp(room_id as string)
        lastTimestampRef.current = timestamp

        if (!previousRoomIdRef.current) {
          previousRoomIdRef.current = room_id as string
        } else {
          if (previousRoomIdRef.current !== (room_id as string)) {
            lastTimestampRef.current = null
            previousRoomIdRef.current = room_id as string
          }
        }
      }
    }
    doFn()
  }, [room_id, hashParams?.password])

  useEffect(() => {
    if (room_id) {
      if (queriedMessages && queriedMessages.length > 0) {
        saveMessages(
          queriedMessages.map((m) => ({
            id: `${m.date}-${m.username}-${m.room}`,
            date: m.date,
            room: m.room,
            username: m.username,
            msg: m.msg,
            identity_pubkey: (m as any)['identity_pubkey'],
            signature: m.signature,
          })),
        )
        lastTimestampRef.current = Number(queriedMessages?.at(queriedMessages.length - 1)?.date)
      }
    }
  }, [queriedMessages, room_id])

  return (
    <div className="h-full grid grid-rows-[auto_1fr_auto] bg-gray-900">
      <ChatHeader room={room} messageCount={messages.length} failureCount={failureCount} />

      <main className="min-h-0 overflow-hidden">
        <MessageArea messages={messages} currentUsername={JSON.parse(user ?? '{}').username} />
      </main>

      <footer>
        <MessageInput />
      </footer>
    </div>
  )
}
