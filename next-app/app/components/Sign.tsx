"use client";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { saveToStorage } from "../lib/localStorage";
import { User } from "../types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutateAuth } from "../mutations/auth";
import { getHashClient } from "../lib/crypto-client";

export default function Sign() {
    const router = useRouter();
    const [user, setUser] = useState<User>({
        username: "",
        password: "",
    });
    const [error, setError] = useState<string | null>(null);

    const handleAuthenticate = async () => {
        if (user.username === "" || user.password === "") {
            setError("Username and password are required");
            return;
        }
        
        const hashedPassword = getHashClient(user.password);
        const response = await mutateAuth(user.username, hashedPassword);
        
        if (response.success) {
            const jsonToSave = JSON.stringify({
                username: user.username,
                password: user.password,
            });
            saveToStorage(LOCAL_STORAGE_KEYS.USER, jsonToSave);
            router.push("/chat");
        } else {
            setError(response.message);
        }
    }

    const handleOnKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && (user.password.trim().length > 0 && user.username.trim().length > 0)) {
            await handleAuthenticate()
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-900">
            <div className="w-full max-w-md min-w-sm">
                <div className="rounded-2xl shadow-xl bg-gray-800 p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">Mess-and-jar</h1>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                                Username
                            </label>
                            <input 
                                id="username"
                                type="text" 
                                placeholder="Enter your username" 
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                                value={user.username}
                                onKeyDown={handleOnKeyDown}
                                onChange={(e) => setUser({ ...user, username: e.target.value })}
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="phrase" className="block text-sm font-medium text-gray-300 mb-2">
                                Your password
                            </label>
                            <input 
                                id="phrase"
                                type="password" 
                                placeholder="Enter your password" 
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                                value={user.password}
                                onKeyDown={handleOnKeyDown}
                                onChange={(e) => setUser({ ...user, password: e.target.value })}
                            />
                        </div>
                        
                        <div>
                            <button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleAuthenticate}
                                disabled={user.username === "" || user.password === ""}
                            >
                                Authenticate
                            </button>
                            {error && <p className="text-xs text-red-500 text-right mt-2">{error}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}