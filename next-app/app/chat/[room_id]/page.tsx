"use client";

import { useParams, useRouter } from "next/navigation";
import { useRoomContext } from "./RoomContext";
import { LOCAL_STORAGE_KEYS } from "@/app/constants/localStorageKeys";
import { getFromStorage } from "@/app/lib/localStorage";
import { useEffect, useState } from "react";
import { Room } from "@/app/types";
import MessageArea from "@/app/components/MessageArea";
import MessageInput from "@/app/components/MessageInput";
import { useMessages } from "@/app/queries/messages";
import { decryptStringClient } from "@/app/lib/crypto-client";
import HamburgerMenu from "@/app/components/HamburgerMenu";

export default function RoomPage() {
    const router = useRouter();
    const { room_id } = useParams();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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

    const { data: queriedMessages, isLoading } = useMessages(room_id as string, lastTimestampRef.current);

    useEffect(() => {
        if (room_id) {
            if (queriedMessages && queriedMessages.length > 0) {
                const decryptedMessages = queriedMessages.map(message => ({
                    ...message,
                    msg: decryptStringClient(message.msg, room?.password ?? "") ?? ""
                }));
                setMessages(prev => [...prev, ...decryptedMessages]);
                lastTimestampRef.current = Number(queriedMessages?.at(queriedMessages.length - 1)?.date);
            }
        }
    }, [queriedMessages, room_id, room])

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

    return (
        <main className="flex flex-col h-full">
            {/* topbar */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                <h1 className="text-lg font-semibold text-white">Room {room_id?.slice(0, 4) + "..." + room_id?.slice(-4)}</h1>
                <h2 className="text-sm text-gray-400">{messages?.length} messages</h2>
                {/* hamburger menu button */}
                <button 
                    className="text-white text-sm cursor-pointer hover:text-gray-400 lg:hidden"
                    onClick={() => setIsMenuOpen(true)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>
            </div>
            {/* messages */}
            <div className="flex-1 min-h-0 max-h-[calc(100vh-7.5rem)] overflow-y-hidden">
                <MessageArea
                    messages={messages}
                    currentUsername={JSON.parse(user ?? "{}").username}
                />
            </div>
            {/* message input */}
            <div className="flex-shrink-0">
                <MessageInput />
            </div>
            
            {/* Hamburger Menu */}
            <HamburgerMenu 
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
            />
        </main>
    )
}