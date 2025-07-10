"use client";
import { getFromStorage } from "../lib/localStorage";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mutateSendMessage } from "../mutations/message";
import { decryptStringClient, encryptStringClient } from "../lib/crypto-client";
import { Message, Room } from "../types";
import { getMessages } from "../queries/messages";
import EmptyState from "../components/EmptyState";
import MessageInput from "../components/MessageInput";
import MessageArea from "../components/MessageArea";

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

    const previousRoomIdRef = useRef<string | null>(null);

    useEffect(() => {
        const roomId = searchParams.get("room_id");
        if (roomId) {
            const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS);
            if (rooms) {
                const parsedRooms = JSON.parse(rooms);
                const room = parsedRooms.find((room: Room) => room.id === roomId);
                setRoom(room);
            }

            if (!previousRoomIdRef.current) {
                previousRoomIdRef.current = roomId;
            } else {
                if (previousRoomIdRef.current !== roomId) {
                    setMessages([]);
                    lastTimestampRef.current = 0;
                    previousRoomIdRef.current = roomId;
                }
            }
        }
    }, [searchParams]);
    
    const lastTimestampRef = useRef<number>(0);
    useEffect(() => {
        const fetchMessages = async () => {
            if (room) {
                const timestamp = lastTimestampRef.current;
                const newMessages = await getMessages(room.id, Number(timestamp));
                if (newMessages.length > 0) {
                    const decryptedMessages = newMessages.map(message => ({
                        ...message,
                        msg: decryptStringClient(message.msg, room?.password ?? "") ?? ""
                    }));
                    setMessages(prev => [...prev, ...decryptedMessages]);
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

    const handleSendMessage = async (msg: string): Promise<null | Error> => {
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
            return null;
        } else {
            return new Error("Failed to send message");
        }
    }

    if (!roomId) {
        return <EmptyState />;
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
            <MessageArea 
                messages={messages}
                currentUsername={JSON.parse(user).username}
            />

            {/* Bottom bar */}
            <MessageInput 
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSendMessage}
            />
        </div>
    )
}