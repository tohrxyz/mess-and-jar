"use client";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { clearStorage } from "../lib/localStorage";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

    const mockChats = [
        { id: 1, username: "Alice", color: "bg-blue-500" },
        { id: 2, username: "Bob", color: "bg-green-500" },
        { id: 3, username: "Charlie", color: "bg-purple-500" },
        { id: 4, username: "Diana", color: "bg-pink-500" },
        { id: 5, username: "Eve", color: "bg-yellow-500" },
    ];

    const handleLogout = () => {
        clearStorage(LOCAL_STORAGE_KEYS.USER);
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

    const handleCreate = () => {
        // TODO: Implement room creation logic
        console.log("Creating room:", createFormData);
        setActiveDropdown(null);
    }

    const handleJoin = () => {
        // TODO: Implement room join logic
        console.log("Joining room:", joinFormData);
        setActiveDropdown(null);
    }

    return (
        <div className="w-full max-w-xs h-full bg-gray-800 flex flex-col">
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
                                    onClick={handleCreate}
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
                {mockChats.map((chat) => (
                    <div key={chat.id} className="flex items-center p-3 hover:bg-gray-700 cursor-pointer">
                        <div className={`w-10 h-10 rounded-full ${chat.color} flex-shrink-0`}></div>
                        <span className="ml-3 text-white font-medium">{chat.username}</span>
                    </div>
                ))}
            </div>
            
            <div className="p-4 border-t border-gray-700">
                <button className="text-white text-sm cursor-pointer hover:text-gray-400" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </div>
    )
}