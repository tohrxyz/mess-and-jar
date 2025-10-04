'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function ClientNotFound() {
  const router = useRouter()
  const room_id = useSearchParams().get('room_id') || ''
  const reason = useSearchParams().get('reason')
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          {reason === 'bad_password' ? 'Invalid password' : 'Room not found'}
        </h1>
        <p className="text-gray-400 mb-6">
          {reason === 'bad_password' ? (
            <>
              Unathorized access to room with id <span className="font-mono text-white">{room_id}</span>.
            </>
          ) : (
            <>
              Room with id <span className="font-mono text-white">{room_id}</span> doesn't exist
            </>
          )}
        </p>

        <button
          onClick={() => router.replace('/chat')}
          className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mb-8"
        >
          Go back to chats
        </button>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <p className="text-sm text-blue-400">
            Tip: You can share room with link like /chat/room_id#password=super_secret_password
          </p>
        </div>
      </div>
    </div>
  )
}
