'use client'
import { createContext, RefObject, SetStateAction, useContext, useRef, useState } from 'react'
import { Room } from '../../types'

export const RoomContext = createContext<{
  user: string | null
  setUser: (user: SetStateAction<string | null>) => void
  inputMessage: string
  setInputMessage: (message: SetStateAction<string>) => void
  room: Room | null
  setRoom: (room: SetStateAction<Room | null>) => void
  previousRoomIdRef: RefObject<string | null>
  lastTimestampRef: RefObject<number | null>
  messageAreaScrollRef: RefObject<HTMLDivElement | null>
  openInfoMenuId: string | null
  setOpenInfoMenuId: (id: string | null) => void
}>({
  user: null,
  setUser: () => {},
  inputMessage: '',
  setInputMessage: () => {},
  room: null,
  setRoom: () => {},
  previousRoomIdRef: { current: null },
  lastTimestampRef: { current: null },
  messageAreaScrollRef: { current: null },
  openInfoMenuId: null,
  setOpenInfoMenuId: () => {},
})

export const useRoomContext = () => {
  const context = useContext(RoomContext)
  if (!context) {
    throw new Error('useRoomContext must be used within a RoomProvider')
  }
  return context
}

export const RoomProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState<string>('')
  const [room, setRoom] = useState<Room | null>(null)
  const [openInfoMenuId, setOpenInfoMenuId] = useState<string | null>(null)
  const previousRoomIdRef = useRef<string | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const messageAreaScrollRef = useRef<HTMLDivElement>(null)

  return (
    <RoomContext.Provider
      value={{
        user,
        setUser,
        inputMessage,
        setInputMessage,
        room,
        setRoom,
        previousRoomIdRef,
        lastTimestampRef,
        messageAreaScrollRef,
        openInfoMenuId,
        setOpenInfoMenuId,
      }}
    >
      {children}
    </RoomContext.Provider>
  )
}
