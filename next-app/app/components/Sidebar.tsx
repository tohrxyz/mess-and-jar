'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { LOCAL_STORAGE_KEYS } from '../constants/localStorageKeys'
import { deleteAllMessages } from '../indexdb/chat-db'
import {
  arrayBufferToHex,
  cryptoKeyFromRawExport,
  decryptSubtleClient,
  encryptSubtleClient,
  generateKeySubtleClient,
  getNewIV,
  hashSubtleClientHex,
  hexToArrayBuffer,
} from '../lib/crypto-client'
import { getUserFromStorage } from '../lib/get-user-util'
import { clearStorage, exportLocalConfig, getFromStorage, saveToStorage } from '../lib/localStorage'
import { roomOperation } from '../mutations/room'
import { Room, RoomBackendMethod, RoomGetResponse } from '../types/room'
import { User } from '../types/user'

export default function Sidebar() {
  const router = useRouter()
  const [activeDropdown, setActiveDropdown] = useState<'create' | 'join' | null>(null)
  const [createFormData, setCreateFormData] = useState({
    name: '',
    id: uuidv4(),
    password: '',
  })
  const [joinFormData, setJoinFormData] = useState({
    id: '',
    password: '',
  })
  const [rooms, setRooms] = useState<Room[]>([])
  const params = useParams()
  const room_id = typeof params.room_id === 'string' ? params.room_id : params.room_id?.[0]
  const selectedRoomRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedUsername, setCopiedUsername] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [copiedPublicKey, setCopiedPublicKey] = useState(false)

  useEffect(() => {
    const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS)
    if (rooms) {
      setRooms(JSON.parse(rooms))
    }
  }, [])

  useEffect(() => {
    const userData = getUserFromStorage()
    setUser(userData)
  }, [])

  // Scroll to selected room on first render
  useEffect(() => {
    if (selectedRoomRef.current && room_id) {
      selectedRoomRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [rooms, room_id])

  const handleLogout = () => {
    clearStorage(LOCAL_STORAGE_KEYS.USER)
    clearStorage(LOCAL_STORAGE_KEYS.ROOMS)
    router.push('/auth')
  }

  const toggleDropdown = async (type: 'create' | 'join') => {
    if (activeDropdown === type) {
      setActiveDropdown(null)
    } else {
      setActiveDropdown(type)
      if (type === 'create') {
        // Reset create form and generate new UUID when opening
        const { rawKey } = await generateKeySubtleClient()
        const rawKeyAsHex = arrayBufferToHex(rawKey)
        setCreateFormData({
          name: '',
          id: uuidv4(),
          password: rawKeyAsHex,
        })
      } else {
        // Reset join form when opening
        setJoinFormData({
          id: '',
          password: '',
        })
      }
    }
  }

  const handleCreateInputChange = (field: string, value: string) => {
    setCreateFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleJoinInputChange = (field: string, value: string) => {
    setJoinFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCreateRoom = async () => {
    const room: Room = {
      id: createFormData.id,
      name: createFormData.name,
      password: createFormData.password,
    }
    setRooms([...rooms, room])
    saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, JSON.stringify([...rooms, room]))
    setCreateFormData({
      name: '',
      id: '',
      password: '',
    })

    const key = await cryptoKeyFromRawExport(room.password)
    const { raw: iv, hex: ivHex } = getNewIV()
    const [encryptedRoomName, roomPasswordHashed] = await Promise.all([
      encryptSubtleClient(room.name, { key, iv }).then((encrypted) => arrayBufferToHex(encrypted)),
      hashSubtleClientHex(room.password),
    ])

    const encryptedNameWithIv = `${ivHex}_${encryptedRoomName}`
    await roomOperation({
      id: room.id,
      name: encryptedNameWithIv,
      password: roomPasswordHashed,
      method: RoomBackendMethod.RoomCreate,
    })
    setActiveDropdown(null)
    router.push(`/chat/${room.id}`)
  }

  const handleDeleteRoom = (id: string) => {
    const newRooms = rooms.filter((room) => room.id !== id)
    setRooms(newRooms)
    router.replace(`/chat`)
    saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, JSON.stringify(newRooms))
  }

  const handleRoomClick = (roomId: string) => {
    router.push(`/chat/${roomId}`)
  }

  const handleJoin = async () => {
    setActiveDropdown(null)
    const roomResponse = (await roomOperation({
      id: joinFormData.id,
      method: RoomBackendMethod.RoomGet,
    })) as RoomGetResponse

    const key = await cryptoKeyFromRawExport(joinFormData.password)
    const _roomEncrypted = roomResponse.room.name?.split('_')
    const iv = new Uint8Array(hexToArrayBuffer(_roomEncrypted[0]))
    const encName = _roomEncrypted[1]

    const decryptedRoomNameBuffer = await decryptSubtleClient(encName, { iv, key })
    const decryptedRoomName = new TextDecoder().decode(decryptedRoomNameBuffer)
    const room: Room = {
      id: joinFormData.id,
      name: decryptedRoomName ?? `unknown ${Math.random().toString(36).substring(2, 15)}`,
      password: joinFormData.password,
    }

    let roomsToCommit: Room[] = []

    const isExistAlready = rooms.find((r) => r.id === room.id)
    if (isExistAlready) {
      roomsToCommit = rooms.map((r) => {
        if (r.id === room.id) {
          return {
            ...r,
            password: joinFormData.password,
          }
        }
        return r
      })
    } else {
      roomsToCommit = rooms.concat(room)
    }
    setRooms(roomsToCommit)
    saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, JSON.stringify(roomsToCommit))
    setActiveDropdown(null)

    if (isExistAlready) {
      window.location.reload() // TODO: figure out how to reset state, without reloading
    } else {
      router.push(`/chat/${room.id}`)
    }
  }

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen((prev) => !prev)
  }

  const nukeRoomsAndMessages = async () => {
    if (window.confirm('Are you sure you want to nuke all rooms and messages?')) {
      clearStorage(LOCAL_STORAGE_KEYS.ROOMS)
      setRooms([])
      await deleteAllMessages()
      window.location.replace('/')
    }
  }

  const handleCopy = (text: string, type: 'username' | 'password' | 'publicKey') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    }
    if (type === 'username') {
      setCopiedUsername(true)
      setTimeout(() => setCopiedUsername(false), 2000)
    } else if (type === 'password') {
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    } else {
      setCopiedPublicKey(true)
      setTimeout(() => setCopiedPublicKey(false), 2000)
    }
  }

  return (
    <article className="w-full h-full">
      <div className="w-full h-full bg-gray-800 flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-semibold text-white">Rooms</h1>
          <div className="relative">
            <div className="mt-4 flex gap-3">
              <button
                className={`group flex-1 relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold py-3 px-5 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                  activeDropdown === 'create' ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg scale-105' : 'shadow-md'
                }`}
                onClick={() => toggleDropdown('create')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create
                </div>
              </button>
              <button
                className={`group flex-1 relative overflow-hidden bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold py-3 px-5 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                  activeDropdown === 'join' ? 'ring-2 ring-purple-400 ring-opacity-50 shadow-lg scale-105' : 'shadow-md'
                }`}
                onClick={() => toggleDropdown('join')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Join
                </div>
              </button>
            </div>

            {activeDropdown === 'create' && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-5 z-10 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1">Create New Room</h3>
                    <p className="text-gray-400 text-xs">Set up your private chat space</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                      Room Name
                    </label>
                    <input
                      type="text"
                      value={createFormData.name}
                      onChange={(e) => handleCreateInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder="Enter a memorable name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                      Room ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={createFormData.id}
                        readOnly
                        className="w-full px-4 py-3 bg-gray-600/50 border border-gray-600 rounded-xl text-gray-300 text-sm cursor-not-allowed font-mono"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                      Secure 256bit Key
                    </label>
                    <textarea
                      value={createFormData.password}
                      // onChange={(e) => handleCreateInputChange("password", e.target.value)}
                      readOnly
                      disabled
                      className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600 cursor-not-allowed rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none min-h-[40px]"
                      placeholder="Secure your room"
                    />
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    disabled={!createFormData.name || !createFormData.password}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Room
                    </div>
                  </button>
                </div>
              </div>
            )}

            {activeDropdown === 'join' && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-5 z-10 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1">Join Existing Room</h3>
                    <p className="text-gray-400 text-xs">Connect to a shared chat space</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                      Room ID
                    </label>
                    <input
                      type="text"
                      value={joinFormData.id}
                      onChange={(e) => handleJoinInputChange('id', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-mono"
                      placeholder="Enter the room ID"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                      Password
                    </label>
                    <input
                      type="password"
                      value={joinFormData.password}
                      onChange={(e) => handleJoinInputChange('password', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      placeholder="Enter the room password"
                    />
                  </div>

                  <button
                    onClick={handleJoin}
                    disabled={!joinFormData.id || !joinFormData.password}
                    className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      Join Room
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-300">Your Rooms</h3>
              <button
                onClick={nukeRoomsAndMessages}
                className="text-sm text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
                Nuke Local History
              </button>
            </div>
            {rooms.length === 0 ? (
              <p className="text-gray-400 text-sm">No rooms yet. Create or join one!</p>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    ref={room.id === room_id ? selectedRoomRef : null}
                    className={`flex items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer border-2 transition-colors ${room.id === room_id ? 'border-blue-500' : 'border-transparent'}`}
                    onClick={() => handleRoomClick(room.id)}
                  >
                    <div className="w-10 h-10 rounded-full flex-shrink-0 bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{room.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{room.name}</p>
                      <p className="text-gray-400 text-xs truncate">{room.id}</p>
                    </div>
                    <button
                      className="ml-2 text-white hover:text-gray-300 text-sm transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm('Are you sure you want to delete this room?')) {
                          handleDeleteRoom(room.id)
                        }
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          {user && (
            <div className="relative mb-4">
              <button
                onClick={toggleProfileDropdown}
                className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium truncate flex-1 text-left">{user.username}</span>
                <svg
                  className={`w-4 h-4 text-gray-300 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800/95 backdrop-blur-md border border-gray-600/50 rounded-2xl p-5 z-20 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
                  <div className="space-y-4">
                    {/* Username row */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wide">
                          Username
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={user.username}
                          className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600 rounded-lg text-white text-sm font-mono cursor-not-allowed"
                        />
                      </div>
                      <button
                        onClick={() => handleCopy(user.username, 'username')}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors mt-[26px]"
                      >
                        {copiedUsername ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-green-400"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                            />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wide">
                          Public Key
                        </label>
                        <textarea
                          readOnly
                          value={user.identityKeypairHex.publicKeyHex}
                          className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600 rounded-lg text-white text-xs font-mono cursor-not-allowed resize-none"
                          rows={3}
                        />
                      </div>
                      <button
                        onClick={() => handleCopy(user.identityKeypairHex.publicKeyHex, 'publicKey')}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors mt-[26px]"
                      >
                        {copiedPublicKey ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-green-400"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                            />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wide">
                          Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          readOnly
                          value={user.password}
                          className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600 rounded-lg text-white text-sm font-mono cursor-not-allowed pr-10"
                        />
                        <button
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-2 top-[26px] flex items-center text-gray-400 hover:text-gray-200"
                        >
                          {showPassword ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 1-4.243-4.243m4.242 4.242L9.88 9.88"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handleCopy(user.password, 'password')}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors mt-[26px]"
                      >
                        {copiedPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-green-400"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-row gap-3">
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 text-white text-sm bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded transition-colors"
                onClick={() => exportLocalConfig()}
              >
                Export Config
              </button>
            </div>
            <button
              className="w-full text-red-400 hover:text-red-300 text-sm bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded transition-colors"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
