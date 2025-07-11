"use client";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { clearStorage, exportLocalConfig, getFromStorage, saveToStorage } from "../lib/localStorage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Room } from "../types/room";

export default function Sidebar() {
    const router = useRouter();
    const [activeDropdown, setActiveDropdown] = useState<'create' | 'join' | null>(null);
    const [createFormData, setCreateFormData] = useState({
        name: "",
        id: crypto.randomUUID(),
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
                    id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
            password: ""
        });
        setActiveDropdown(null);
        router.push(`/chat/${room.id}`);
    }

    const handleDeleteRoom = (id: string) => {
        const newRooms = rooms.filter((room) => room.id !== id);
        setRooms(newRooms);
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

        if (isExistAlready) {
            window.location.reload(); // TODO: figure out how to reset state, without reloading
        } else {
            router.push(`/chat/${room.id}`);
        }
    }

    return (
        <article> 

            <div className="w-full max-w-xs h-full bg-gray-800 flex flex-col hidden lg:flex">
                <div className="p-4 border-b border-gray-700">
                    <h1 className="text-xl font-semibold text-white">Rooms</h1>
                    <div className="relative">
                        <div className="mt-3 flex gap-2">
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
                            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg p-4 z-10">
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
                            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg p-4 z-10">
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
                
                <div className="flex-1 overflow-y-auto">
                    {rooms.map((room) => (
                        <div 
                            key={room.id} 
                            className="flex items-center p-3 hover:bg-gray-700 cursor-pointer"
                            onClick={() => router.push(`/chat/${room.id}`)}
                        >
                            <div className={`w-10 h-10 rounded-full flex-shrink-0 bg-blue-500`}></div>
                            <span className="ml-3 text-white font-medium">{room.name}</span>
                            <button className="ml-auto text-white text-sm cursor-pointer hover:text-gray-400" onClick={() => handleDeleteRoom(room.id)}>
                                ❌
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 flex justify-between items-center">
                    <button className="text-white text-sm cursor-pointer hover:text-gray-400" onClick={handleLogout}>
                        Logout
                    </button>
                    <div className="flex gap-2">
                        <button className="text-white text-sm cursor-pointer hover:text-gray-400" onClick={() => exportLocalConfig()}>
                            Export
                        </button>
                        {/* <button className="text-white text-sm cursor-pointer hover:text-gray-400" onClick={() => importLocalConfig(null as any)}>
                            Import
                        </button> */}
                    </div>
                </div>
            </div>
        </article>
    )
}