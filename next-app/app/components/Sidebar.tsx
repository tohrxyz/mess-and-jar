"use client";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { clearStorage } from "../lib/localStorage";
import { useRouter } from "next/navigation";

export default function Sidebar() {
    const router = useRouter();
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

    return (
        <div className="w-full max-w-xs h-full bg-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <h1 className="text-xl font-semibold text-white">Rooms</h1>
                <button className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                    Create New
                </button>
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