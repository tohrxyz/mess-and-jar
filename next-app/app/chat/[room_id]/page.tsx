"use client";

import { useParams, useRouter } from "next/navigation";
import { useRoomContext } from "./RoomContext";
import { LOCAL_STORAGE_KEYS } from "@/app/constants/localStorageKeys";
import { getFromStorage } from "@/app/lib/localStorage";
import { useEffect } from "react";
import { Room } from "@/app/types";
import MessageArea from "@/app/components/MessageArea";
import MessageInput from "@/app/components/MessageInput";
import { useMessages } from "@/app/queries/messages";
import { decryptStringClient } from "@/app/lib/crypto-client";
import ChatHeader from "@/app/components/ChatHeader";

export default function RoomPage() {
    const router = useRouter();
    const { room_id } = useParams();
    const { 
        user, 
        inputMessage, 
        messages,
        room, 

        previousRoomIdRef, 
        lastTimestampRef,

        setUser, 
        setInputMessage, 
        setMessages, 
        setRoom, 
    } = useRoomContext();

    const { data: queriedMessages, isLoading, failureCount } = useMessages(room_id as string, lastTimestampRef.current);

    
    useEffect(() => {
        const userData = getFromStorage(LOCAL_STORAGE_KEYS.USER);
        if (!userData) {
            router.push("/auth");
        } else {
            setUser(userData);
        }
    }, [router]);
    
    useEffect(() => {
        if (room_id) {
            const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS);
            if (rooms) {
                const parsedRooms = JSON.parse(rooms);
                const room = parsedRooms.find((room: Room) => room.id === room_id);
                setRoom(room);
            }
            
            if (!previousRoomIdRef.current) {
                previousRoomIdRef.current = room_id as string;
            } else {
                if (previousRoomIdRef.current !== room_id as string) {
                    setMessages([]);
                    lastTimestampRef.current = 0;
                    previousRoomIdRef.current = room_id as string;
                }
            }
        }
    }, [room_id]);
    
    useEffect(() => {
        if (room_id) {
            if (queriedMessages && queriedMessages.length > 0) {
                setMessages(prev => [...prev, ...queriedMessages]);
                lastTimestampRef.current = Number(queriedMessages?.at(queriedMessages.length - 1)?.date);
            }
        }
    }, [queriedMessages, room_id])
    
    return (
        <div className="h-full grid grid-rows-[auto_1fr_auto] bg-gray-900">
            <ChatHeader room={room} messageCount={messages.length} failureCount={failureCount} />

            <main className="min-h-0 overflow-hidden">
                <MessageArea
                    messages={messages}
                    currentUsername={JSON.parse(user ?? "{}").username}
                />
            </main>

            <footer>
                <MessageInput />
            </footer>
        </div>
    )
}