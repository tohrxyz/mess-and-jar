"use client";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { clearStorage, exportLocalConfig, getFromStorage, saveToStorage } from "../lib/localStorage";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Room, RoomBackendMethod, RoomGetResponse } from "../types/room";
import { v4 as uuidv4 } from 'uuid';
import { roomOperation } from "../mutations/room";
import { decryptStringClient, encryptStringClient, getHashClient } from "../lib/crypto-client";

export default function Sidebar() {
    const router = useRouter();
    const [activeDropdown, setActiveDropdown] = useState<'create' | 'join' | null>(null);
    const [createFormData, setCreateFormData] = useState({
        name: "",
        id: uuidv4(),
        password: ""
    });
    const [joinFormData, setJoinFormData] = useState({
        id: "",
        password: ""
    });
    const [rooms, setRooms] = useState<Room[]>([]);
    const params = useParams();
    const room_id = typeof params.room_id === 'string' ? params.room_id : params.room_id?.[0];
    const selectedRoomRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS);
        if (rooms) {
            setRooms(JSON.parse(rooms));
        }
    }, []);

    // Scroll to selected room on first render
    useEffect(() => {
        if (selectedRoomRef.current && room_id) {
            selectedRoomRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [rooms, room_id]);


    const handleLogout = () => {
        clearStorage(LOCAL_STORAGE_KEYS.USER);
        clearStorage(LOCAL_STORAGE_KEYS.ROOMS);
        router.push("/auth");
    }

    const toggleDropdown = (type: 'create' | 'join') => {
        if (activeDropdown === type) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(type);
            if (type === 'create') {
                // Reset create form and generate new UUID when opening
                setCreateFormData({
                    name: "",
                    id: uuidv4(),
                    password: ""
                });
            } else {
                // Reset join form when opening
                setJoinFormData({
                    id: "",
                    password: ""
                });
            }
        }
    }

    const handleCreateInputChange = (field: string, value: string) => {
        setCreateFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }

    const handleJoinInputChange = (field: string, value: string) => {
        setJoinFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }

    const handleCreateRoom = async () => {
        const room: Room = {
            id: createFormData.id,
            name: createFormData.name,
            password: createFormData.password
        }
        setRooms([...rooms, room]);
        saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, JSON.stringify([...rooms, room]));
        setCreateFormData({
            name: "",
            id: uuidv4(),
            password: ""
        });
        const encryptedRoomName = encryptStringClient(room.name, room.password)
        await roomOperation({ 
            id: room.id, 
            name: encryptedRoomName, 
            password: getHashClient(room.password), 
            method: RoomBackendMethod.RoomCreate
        })
        setActiveDropdown(null);
        router.push(`/chat/${room.id}`);
    }

    const handleDeleteRoom = (id: string) => {
        const newRooms = rooms.filter((room) => room.id !== id);
        setRooms(newRooms);
        router.replace(`/chat`)
        saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, JSON.stringify(newRooms));
    }

    const handleRoomClick = (roomId: string) => {
        router.push(`/chat/${roomId}`);
    }

    const handleJoin = async () => {
        setActiveDropdown(null);
        const roomResponse = await roomOperation({
            id: joinFormData.id,
            method: RoomBackendMethod.RoomGet
        }) as RoomGetResponse
        const decryptedName = decryptStringClient(roomResponse?.room?.name ?? "", joinFormData.password)
        const room: Room = {
            id: joinFormData.id,
            name: decryptedName ?? `unknown ${Math.random().toString(36).substring(2, 15)}`,
            password: joinFormData.password
        }

        let roomsToCommit: Room[] = [];

        const isExistAlready = rooms.find((r) => r.id === room.id);
        if (isExistAlready) {
            roomsToCommit = rooms.map((r) => {
                if (r.id === room.id) {
                    return {
                        ...r,
                        password: joinFormData.password
                    }
            }
                return r;
            });
        } else {
            roomsToCommit = rooms.concat(room);
        }
        setRooms(roomsToCommit);
        saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, JSON.stringify(roomsToCommit));
        setActiveDropdown(null);

        if (isExistAlready) {
            window.location.reload(); // TODO: figure out how to reset state, without reloading
        } else {
            router.push(`/chat/${room.id}`);
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
                                    activeDropdown === 'create' 
                                        ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg scale-105' 
                                        : 'shadow-md'
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
                                    activeDropdown === 'join' 
                                        ? 'ring-2 ring-purple-400 ring-opacity-50 shadow-lg scale-105' 
                                        : 'shadow-md'
                                }`}
                                onClick={() => toggleDropdown('join')}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                                        <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Room Name</label>
                                        <input
                                            type="text"
                                            value={createFormData.name}
                                            onChange={(e) => handleCreateInputChange("name", e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            placeholder="Enter a memorable name"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Room ID</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={createFormData.id}
                                                readOnly
                                                className="w-full px-4 py-3 bg-gray-600/50 border border-gray-600 rounded-xl text-gray-300 text-sm cursor-not-allowed font-mono"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Password</label>
                                        <input
                                            type="password"
                                            value={createFormData.password}
                                            onChange={(e) => handleCreateInputChange("password", e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                                        <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Room ID</label>
                                        <input
                                            type="text"
                                            value={joinFormData.id}
                                            onChange={(e) => handleJoinInputChange("id", e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-mono"
                                            placeholder="Enter the room ID"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Password</label>
                                        <input
                                            type="password"
                                            value={joinFormData.password}
                                            onChange={(e) => handleJoinInputChange("password", e.target.value)}
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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
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
                        <h3 className="text-sm font-medium text-gray-300 mb-3">Your Rooms</h3>
                        {rooms.length === 0 ? (
                            <p className="text-gray-400 text-sm">No rooms yet. Create or join one!</p>
                        ) : (
                            <div className="space-y-2">
                                {rooms.map((room) => (
                                    <div 
                                        key={room.id} 
                                        ref={room.id === room_id ? selectedRoomRef : null}
                                        className={`flex items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer border-2 transition-colors ${room.id === room_id ? "border-blue-500" : "border-transparent"}`}
                                        onClick={() => handleRoomClick(room.id)}
                                    >
                                        <div className="w-10 h-10 rounded-full flex-shrink-0 bg-blue-500 flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {room.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{room.name}</p>
                                            <p className="text-gray-400 text-xs truncate">
                                                {room.id}
                                            </p>
                                        </div>
                                        <button 
                                            className="ml-2 text-white hover:text-gray-300 text-sm transition-colors cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm("Are you sure you want to delete this room?")) {
                                                    handleDeleteRoom(room.id);
                                                }
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
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