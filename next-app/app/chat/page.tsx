"use client";
import { getFromStorage } from "../lib/localStorage";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mutateSendMessage } from "../mutations/message";
import { decryptStringClient, encryptStringClient } from "../lib/crypto-client";
import { Message, Room } from "../types";
import { getMessages } from "../queries/messages";

export default function Chat() {
    const router = useRouter();
    const [user, setUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<string>("");
    const [room, setRoom] = useState<Room | null>(null);
    const searchParams = useSearchParams();
    const roomId = searchParams.get("room_id");
    const [messages, setMessages] = useState<Message[]>([]);


    useEffect(() => {
        const userData = getFromStorage(LOCAL_STORAGE_KEYS.USER);
        if (!userData) {
            router.push("/auth");
        } else {
            setUser(userData);
        }
        setIsLoading(false);
    }, [router]);

    useEffect(() => {
        const roomId = searchParams.get("room_id");
        if (roomId) {
            const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS);
            if (rooms) {
                const parsedRooms = JSON.parse(rooms);
                const room = parsedRooms.find((room: Room) => room.id === roomId);
                setRoom(room);
            }
        }
    }, [searchParams]);

    const lastTimestampRef = useRef<number>(0);

    useEffect(() => {
        const fetchMessages = async () => {
            if (room) {
                const timestamp = lastTimestampRef.current;
                const newMessages = await getMessages(room.id, Number(timestamp));
                const decryptedMessages = newMessages.map(message => ({
                    ...message,
                    msg: decryptStringClient(message.msg, room?.password ?? "")
                }));
                setMessages(prev => [...prev, ...decryptedMessages]);
                if (newMessages.length > 0) {
                    lastTimestampRef.current = Number(newMessages?.at(newMessages.length - 1)?.date);
                }
            }
        }
        
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [room]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return null
    }

    const handleSendMessage = async (msg: string) => {
        const date = Date.now().toString();
        const encryptedMessage = encryptStringClient(msg, room?.password ?? "");
        const response = await mutateSendMessage(roomId ?? "general", JSON.parse(user).username, encryptedMessage, date);
        if (response.success) {
            setMessage("");
            setMessages(prev => [...prev, {
                date,
                room: roomId ?? "general",
                username: JSON.parse(user).username,
                msg: msg,
            }]);
            lastTimestampRef.current = Number(date);
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
                    {room?.name}
                </h2>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {messages.map((message, index) => {
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