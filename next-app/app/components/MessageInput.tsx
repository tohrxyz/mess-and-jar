'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useRoomContext } from '../chat/[room_id]/RoomContext'
import { MESSAGE_CODES } from '../constants/messageCodes'
import { deleteMessage, getLastTimestamp, saveMessage } from '../indexdb/chat-db'
import { deleteOld, MAX_IMAGES_IN_CACHED_INDEX_DB, saveImage } from '../indexdb/media-db'
import {
  arrayBufferToHex,
  cryptoKeyFromRawExport,
  encryptSubtleClient,
  getNewIV,
  prepareBufferFromMessage,
  signMessage,
} from '../lib/crypto-client'
import { scrollToBottom } from '../lib/scroll-util'
import { mutateSendMessage, mutateUploadMedia } from '../mutations/message'
import { User } from '../types'
import VoiceRecorder, { VoiceRecorderHandle } from './VoiceRecorder'

const ProgressBar = ({ isUploading, error }: { isUploading: boolean; error: null | Error }) => {
  if (isUploading) {
    return (
      <div className="absolute bottom-full left-0 right-0 bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center space-x-2 text-sm">
          <div className="size-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-400">Uploading media...</span>
        </div>
        <div className="mt-1 w-full bg-gray-700 rounded-full h-1">
          <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '100%' }}></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="absolute bottom-full left-0 right-0 bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center space-x-2 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-3 text-red-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <span className="text-red-400">{error.message}</span>
        </div>
      </div>
    )
  }

  return null
}

export default function MessageInput() {
  const [error, setError] = useState<null | Error>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceReady, setIsVoiceReady] = useState(false)
  const { inputMessage, setInputMessage, room, user, lastTimestampRef, messageAreaScrollRef } = useRoomContext()
  const queryClient = useQueryClient()
  const voiceRef = useRef<VoiceRecorderHandle | null>(null)

  const handleSendMessage = async (msg: string, forcedDate?: string): Promise<null | Error> => {
    const userObj = JSON.parse(user ?? '{}') as User
    const date = forcedDate ?? Date.now().toString()

    const key = await cryptoKeyFromRawExport(room?.password ?? '')
    const { raw: iv, hex: ivHex } = getNewIV()

    const encryptedContent = await encryptSubtleClient(msg, { key, iv })
    const encryptedContentHex = arrayBufferToHex(encryptedContent)
    const encryptedMessageTransit = `${ivHex}_${encryptedContentHex}`

    const preparedMessageBuffToSign = await prepareBufferFromMessage({
      date,
      room: room?.id ?? 'general',
      username: userObj.username,
      msg,
    })

    const signature = await signMessage({
      messageBuffer: preparedMessageBuffToSign,
      privateKeyHex: userObj.identityKeypairHex.privateKeyHex,
    })

    // optimistically save
    saveMessage({
      id: `${date}-${userObj.username}-${room?.id ?? 'general'}`,
      date,
      room: room?.id ?? 'general',
      username: userObj.username,
      msg: encryptedMessageTransit,
      signature: signature.signatureHex,
      identity_pubkey: userObj.identityKeypairHex.privateKeyHex,
    })
    setInputMessage('')
    lastTimestampRef.current = Number(date)

    const response = await mutateSendMessage(
      room?.id ?? 'general',
      userObj.username,
      encryptedMessageTransit,
      date,
      signature.signatureHex,
    )

    if (response.success) {
      await queryClient.invalidateQueries({ queryKey: ['messages', room?.id, lastTimestampRef.current] })
      scrollToBottom(messageAreaScrollRef)
      return null
    } else {
      // rollback
      setInputMessage(msg)
      await deleteMessage(`${date}-${userObj.username}-${room?.id ?? 'general'}`)
      const latestTimestamp = await getLastTimestamp(room?.id ?? 'general')
      lastTimestampRef.current = latestTimestamp
      return new Error('Failed to send message')
    }
  }

  const handleOnKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputMessage.trim().length > 0) {
      const result = await handleSendMessage(inputMessage)
      if (result instanceof Error) {
        setError(result)
        setTimeout(() => {
          setError(null)
        }, 5000)
        return
      }
      setError(null)
    }
  }

  const handleSendMedia = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      if (!room || !room?.password) throw new Error(`Can't access room [${room?.id}] password.`)
      const loadedFile = await file.arrayBuffer()

      const key = await cryptoKeyFromRawExport(room.password)
      const { raw: iv, hex: ivHex } = getNewIV()

      const encryptedBinary = await encryptSubtleClient(loadedFile, { key, iv })

      if (!encryptedBinary) throw new Error(`Can't encrypt the media`)

      const newFileId = `${ivHex}_${uuid()}`
      const res = await mutateUploadMedia(encryptedBinary, newFileId)
      setIsUploading(false)

      let msgInjected = ''
      if (file.type.startsWith('image')) {
        msgInjected = `${MESSAGE_CODES.PHOTO.START}${newFileId}${MESSAGE_CODES.PHOTO.END}`
      } else if (file.type.startsWith('video')) {
        msgInjected = MESSAGE_CODES.VIDEO.START + newFileId + MESSAGE_CODES.VIDEO.END
      } else {
        throw new Error('Unsupported media type')
      }
      if (res.success) {
        const date = Date.now()
        await saveImage({ id: newFileId, timestamp: date, blob: new Blob([loadedFile]) })
        await deleteOld(MAX_IMAGES_IN_CACHED_INDEX_DB)
        await handleSendMessage(msgInjected, date.toString())
      } else {
        throw new Error('Failed to upload media')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown upload error'))
      setTimeout(() => {
        setError(null)
      }, 5000)
    }
  }

  return (
    <div className="bg-gray-800 border-t border-gray-700 relative">
      <ProgressBar isUploading={isUploading} error={error} />

      <div className="flex space-x-2 py-2 pl-2 pr-2">
        <input
          type="text"
          placeholder="Type a message..."
          className={`flex-1 px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
            isRecording || isVoiceReady ? 'hidden sm:flex' : 'flex'
          }`}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleOnKeyDown}
          suppressHydrationWarning
          disabled={isUploading}
        />
        {!isRecording && !isVoiceReady && (
          <>
            <input
              type="file"
              id="file-input"
              className="hidden"
              accept="image/*,video/mp4"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleSendMedia(file)
                }
              }}
              disabled={isUploading}
            />
            <button
              className={`p-2 rounded-lg transition-all duration-200 ${
                isUploading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
              } ${isRecording || isVoiceReady ? 'hidden sm:flex' : 'flex'}`}
              onClick={() => {
                if (!isUploading) {
                  document.getElementById('file-input')?.click()
                }
              }}
              disabled={isUploading}
              aria-label="Choose file"
              title="Choose file"
            >
              {isUploading ? (
                <div className="size-5 flex items-center justify-center">
                  <div className="size-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                  />
                </svg>
              )}
            </button>
          </>
        )}
        <VoiceRecorder
          ref={voiceRef}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          onVoiceReadyChange={setIsVoiceReady}
          onRecordingChange={setIsRecording}
          handleSendMessage={handleSendMessage}
        />
        <button
          className={`bg-blue-600 hover:bg-blue-700 text-white px-2 rounded-lg font-medium transition-colors duration-200 ${
            error ? 'opacity-50 cursor-not-allowed bg-red-500 hover:bg-red-600 duration-100' : ''
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={async () => {
            if (isVoiceReady) {
              await voiceRef.current?.sendVoiceRecording()
              return
            }
            await handleSendMessage(inputMessage)
          }}
          disabled={(inputMessage.length === 0 && !isVoiceReady) || error !== null || isUploading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
