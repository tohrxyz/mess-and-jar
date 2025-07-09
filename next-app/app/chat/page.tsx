"use client";
import { getFromStorage } from "../lib/localStorage";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mutateSendMessage } from "../mutations/message";
import { encryptStringClient } from "../lib/crypto-client";

export default function Chat() {
    const router = useRouter();
    const [user, setUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<string>("");

    useEffect(() => {
        const userData = getFromStorage(LOCAL_STORAGE_KEYS.USER);
        if (!userData) {
            router.push("/auth");
        } else {
            setUser(userData);
        }
        setIsLoading(false);
    }, [router]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return null
    }

    // Mock messages - replace with actual messages state
    const mockMessages = [
        { date: Date.now() - 3600000, room: "general", username: "Alice", msg: "Hey there!" },
        { date: Date.now() - 3580000, room: "general", username: JSON.parse(user).username, msg: "Hello! How are you?" },
        { date: Date.now() - 3560000, room: "general", username: "Alice", msg: "I'm doing great, thanks for asking!" },
        { date: Date.now() - 3540000, room: "general", username: JSON.parse(user).username, msg: "That's awesome to hear! What have you been up to lately?" },
        { date: Date.now() - 3520000, room: "general", username: "Alice", msg: "Just working on some new projects. How about you?" },
        { date: Date.now() - 3500000, room: "general", username: JSON.parse(user).username, msg: "Same here! Been learning some new technologies." },
        { date: Date.now() - 3480000, room: "general", username: "Alice", msg: "Oh that's cool! What kind of technologies?" },
        { date: Date.now() - 3460000, room: "general", username: JSON.parse(user).username, msg: "Mostly React and Next.js for frontend development." },
        { date: Date.now() - 3440000, room: "general", username: "Alice", msg: "Nice! I love React. The component-based architecture is so clean." },
        { date: Date.now() - 3420000, room: "general", username: JSON.parse(user).username, msg: "Exactly! It makes building UIs so much more organized." },
        { date: Date.now() - 3400000, room: "general", username: "Alice", msg: "Have you tried any state management libraries like Redux or Zustand?" },
        { date: Date.now() - 3380000, room: "general", username: JSON.parse(user).username, msg: "I've used Redux before, but I'm really interested in trying Zustand." },
        { date: Date.now() - 3360000, room: "general", username: "Alice", msg: "Zustand is great! Much simpler than Redux for most use cases." },
        { date: Date.now() - 3340000, room: "general", username: JSON.parse(user).username, msg: "That's what I've heard. The boilerplate in Redux can be overwhelming." },
        { date: Date.now() - 3320000, room: "general", username: "Alice", msg: "Definitely! Zustand has a much cleaner API." },
        { date: Date.now() - 3300000, room: "general", username: JSON.parse(user).username, msg: "I'll have to give it a try on my next project." },
        { date: Date.now() - 3280000, room: "general", username: "Alice", msg: "You should! Let me know how it goes." },
        { date: Date.now() - 3260000, room: "general", username: JSON.parse(user).username, msg: "Will do! Thanks for the recommendation." },
        { date: Date.now() - 3240000, room: "general", username: "Alice", msg: "Anytime! Always happy to chat about tech stuff." },
        { date: Date.now() - 3220000, room: "general", username: JSON.parse(user).username, msg: "Same here! It's great to have these conversations." },
    ];

    const handleSendMessage = async (msg: string) => {
        const encryptedMessage = encryptStringClient(msg, JSON.parse(user).password);
        const response = await mutateSendMessage("general", JSON.parse(user).username, encryptedMessage);
        if (response.success) {
            setMessage("");
            console.log("Message sent successfully");
        } else {
            console.error("Failed to send message");
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900">
            {/* Top bar */}
            <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex-shrink-0">
                <h2 className="text-xl font-semibold text-white">
                    Chatting with Alice
                </h2>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {mockMessages.map((message, index) => {
                    const isCurrentUser = message.username === JSON.parse(user).username;
                    return (
                        <div
                            key={index}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    isCurrentUser
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-100'
                                }`}
                            >
                                {!isCurrentUser && (
                                    <div className="text-xs font-medium mb-1 opacity-75">
                                        {message.username}
                                    </div>
                                )}
                                <div>{message.msg}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom bar */}
            <div className="bg-gray-800 border-t border-gray-700 px-6 py-2 flex-shrink-0">
                <div className="flex space-x-4">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <button 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200" 
                        onClick={() => handleSendMessage(message)}
                        disabled={message.length === 0}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}