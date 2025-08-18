'use client'

import { Room } from '@/app/types'
import { useState } from 'react'
import HamburgerMenu from './HamburgerMenu'
import RoomInfoDropdown from './RoomInfoDropdown'

const formatName = (name: string | undefined, maxLen: number) => {
  if (!name) return ''
  const len = name.length
  return len > maxLen ? name.slice(0, maxLen - 3) + '...' : name
}

interface ChatHeaderProps {
  room: Room | null
  messageCount: number
  failureCount: number
}

export default function ChatHeader({ room, messageCount, failureCount }: ChatHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start gap-3 p-3 sm:p-4 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative group">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${failureCount > 0 ? 'bg-red-500' : 'bg-green-500'}`}
              ></div>
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                {failureCount > 0 ? `Connection issues (${failureCount} failures)` : 'Connected'}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-wide truncate">
                  {formatName(room?.name, 30) || 'Loading...'}
                </h1>
                {room && (
                  <div className="flex-shrink-0">
                    <RoomInfoDropdown room={room} />
                  </div>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {messageCount} message{messageCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            className="text-white hover:text-gray-400 lg:hidden ml-3 flex-shrink-0 p-1 rounded-md hover:bg-gray-800 transition-colors"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </header>

      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  )
}
