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
import RoomInfoDropdown from "@/app/components/RoomInfoDropdown";

const formatName = (name: string | undefined, maxLen: number) => {
    if (!name) return ""
    const len = name.length
    return len > maxLen ? name.slice(0, maxLen - 3) + "..." : name
}
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
            <header className="flex justify-between items-start p-4 border-b border-gray-700">
                <div className="flex flex-col items-center gap-2 md:min-w-[40vw] md:items-start">
                    <div className="flex justify-between items-center gap-x-2 w-full justify-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-sm lg:text-xl font-bold text-white tracking-wide max-w-[20vh] md:min-w-[30vw]">
                            {formatName(room?.name, 30) || 'Loading...'}
                        </p>
                        {room && <RoomInfoDropdown room={room} />}
                    </div>
                    <div className="flex justify-start w-full">
                        <h2 className="text-sm text-gray-400">{messages?.length} messages</h2>
                    </div>
                </div>
                {/* hamburger menu button */}
                <button 
                    className="text-white text-sm cursor-pointer hover:text-gray-400 lg:hidden"
                    onClick={() => setIsMenuOpen(true)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>
            </header>

            <main className="min-h-0 overflow-hidden">
                <MessageArea
                    messages={messages}
                    currentUsername={JSON.parse(user ?? "{}").username}
                />
            </main>

            <footer>
                <MessageInput />
            </footer>
            
            {/* Hamburger Menu */}
            <HamburgerMenu 
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
            />
        </div>
    )
}