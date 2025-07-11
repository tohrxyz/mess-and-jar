"use client";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { clearStorage, exportLocalConfig, getFromStorage, saveToStorage } from "../lib/localStorage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Room } from "../types/room";
import { v4 as uuidv4 } from 'uuid';

interface HamburgerMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HamburgerMenu({ isOpen, onClose }: HamburgerMenuProps) {
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

    useEffect(() => {
        const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS);
        if (rooms) {
            setRooms(JSON.parse(rooms));
        }
    }, []);

    // Close menu when clicking outside or pressing escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const handleLogout = () => {
        clearStorage(LOCAL_STORAGE_KEYS.USER);
        clearStorage(LOCAL_STORAGE_KEYS.ROOMS);
        onClose();
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

    const handleCreateRoom = () => {
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
        setActiveDropdown(null);
        onClose();
        router.push(`/chat/${room.id}`);
    }

    const handleDeleteRoom = (id: string) => {
        const newRooms = rooms.filter((room) => room.id !== id);
        setRooms(newRooms);
        onClose();
        window.location.replace(`/chat`)
        saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, JSON.stringify(newRooms));
    }

    const handleJoin = () => {
        setActiveDropdown(null);
        const room: Room = {
            id: joinFormData.id,
            name: `unknown ${Math.random().toString(36).substring(2, 15)}`,
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
        onClose();

        if (isExistAlready) {
            window.location.reload(); // TODO: figure out how to reset state, without reloading
        } else {
            router.push(`/chat/${room.id}`);
        }
    }

    const handleRoomClick = (roomId: string) => {
        onClose();
        router.push(`/chat/${roomId}`);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />
            
            {/* Menu Content */}
            <div className="absolute inset-0 bg-gray-800 flex flex-col">
                {/* Header with close button */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h1 className="text-xl font-semibold text-white">Menu</h1>
                    <button 
                        onClick={onClose}
                        className="text-white hover:text-gray-400 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Rooms Section */}
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-3">Rooms</h2>
                    <div className="relative">
                        <div className="flex gap-2">
                            <button 
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                onClick={() => toggleDropdown('create')}
                            >
                                Create
                            </button>
                            <button 
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                onClick={() => toggleDropdown('join')}
                            >
                                Join
                            </button>
                        </div>
                        
                        {activeDropdown === 'create' && (
                            <div className="mt-3 bg-gray-700 border border-gray-600 rounded-lg p-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={createFormData.name}
                                            onChange={(e) => handleCreateInputChange("name", e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                            placeholder="Enter room name"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">ID</label>
                                        <input
                                            type="text"
                                            value={createFormData.id}
                                            readOnly
                                            className="w-full px-3 py-2 bg-gray-500 border border-gray-500 rounded text-gray-300 text-sm cursor-not-allowed"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={createFormData.password}
                                            onChange={(e) => handleCreateInputChange("password", e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                            placeholder="Enter password"
                                        />
                                    </div>
                                    
                                    <button
                                        onClick={handleCreateRoom}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200"
                                        disabled={!createFormData.name || !createFormData.password}
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeDropdown === 'join' && (
                            <div className="mt-3 bg-gray-700 border border-gray-600 rounded-lg p-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">ID</label>
                                        <input
                                            type="text"
                                            value={joinFormData.id}
                                            onChange={(e) => handleJoinInputChange("id", e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                                            placeholder="Enter room ID"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={joinFormData.password}
                                            onChange={(e) => handleJoinInputChange("password", e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                                            placeholder="Enter password"
                                        />
                                    </div>
                                    
                                    <button
                                        onClick={handleJoin}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200"
                                        disabled={!joinFormData.id || !joinFormData.password}
                                    >
                                        Join
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Rooms List */}
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
                                        className="flex items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
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
                                            className="ml-2 text-red-400 hover:text-red-300 text-sm transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm("Are you sure you want to delete this room?")) {
                                                    handleDeleteRoom(room.id);
                                                }
                                            }}
                                        >
                                            ❌
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-700">
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
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
        </div>
    );
} 